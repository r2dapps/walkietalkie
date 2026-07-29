/// <reference types="vite/client" />
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getDatabase, Database, ref, onValue, set, remove, push, 
  serverTimestamp, onDisconnect, off, runTransaction, get, update, onChildAdded
} from 'firebase/database';
import { PeerInfo, ChatMessage } from '../types';
import { getProfile, getDeviceUuid } from './storageService';

function sanitizeKey(key: string): string {
  return key.trim().replace(/[.#$\[\]]/g, '_');
}

function sanitizeRoom(room: string): string {
  return room.toLowerCase().replace(/[^a-z0-9]/g, '');
}

class FirebaseSignaling {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private currentRoomRef: any = null;
  private myPresenceRef: any = null;
  private banUnsub: (() => void) | null = null;
  
  public init(): boolean {
    if (this.app) return true;
    try {
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };
      if (!config.apiKey) return false;
      
      this.app = initializeApp(config);
      this.db = getDatabase(this.app);
      return true;
    } catch (e) {
      console.error('Firebase init failed', e);
      return false;
    }
  }

  private getRoomKey(roomName: string, passcode?: string): string {
    const sRoom = sanitizeRoom(roomName);
    return passcode ? `${sRoom}_${sanitizeRoom(passcode)}` : sRoom;
  }

  public joinRoom(
    roomName: string, 
    myPeerId: string, 
    callsign: string, 
    onBan: () => void,
    passcode?: string
  ): void {
    if (!this.db) return;
    
    // 1. Live Ban Enforcement
    const safeCallsign = sanitizeKey(callsign);
    const banRef = ref(this.db, `banned_operators/${safeCallsign}`);
    
    if (this.banUnsub) this.banUnsub();
    
    this.banUnsub = onValue(banRef, (snap) => {
      if (snap.exists() && snap.val() === true) {
        onBan();
      }
    });

    const roomKey = this.getRoomKey(roomName, passcode);
    this.currentRoomRef = ref(this.db, `rooms/${roomKey}`);
    
    // Set presence
    const profile = getProfile();
    this.myPresenceRef = ref(this.db, `rooms/${roomKey}/peers/${myPeerId}`);
    
    const presenceData: any = {
      peerId: myPeerId,
      callsign: callsign,
      avatar: profile.avatar,
      device_uuid: getDeviceUuid(),
      joinedAt: serverTimestamp()
    };
    
    onDisconnect(this.myPresenceRef).remove().then(() => {
      if (this.myPresenceRef) set(this.myPresenceRef, presenceData);
    });

    // Handle IP ban logic via external API async
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        if (data.ip && this.db) {
          const safeIp = sanitizeKey(data.ip);
          const ipBanRef = ref(this.db, `banned_operators/${safeIp}`);
          onValue(ipBanRef, (snap) => {
            if (snap.exists() && snap.val() === true) onBan();
          });
          
          // Update presence record with IP address
          presenceData.ipAddress = data.ip;
          if (this.myPresenceRef) {
             set(this.myPresenceRef, presenceData);
          }
        }
      })
      .catch(() => {});
  }

  public leaveRoom(): void {
    if (this.myPresenceRef) {
      remove(this.myPresenceRef);
      onDisconnect(this.myPresenceRef).cancel();
      this.myPresenceRef = null;
    }
    if (this.banUnsub) {
      this.banUnsub();
      this.banUnsub = null;
    }
    this.currentRoomRef = null;
  }

  public sendRoomChat(roomName: string, passcode: string | undefined, sender: string, text: string): void {
    if (!this.db) return;
    const roomKey = this.getRoomKey(roomName, passcode);
    const chatsRef = ref(this.db, `rooms/${roomKey}/chats`);
    push(chatsRef, {
      sender,
      text,
      timestamp: new Date().toISOString(),
      created: serverTimestamp()
    });
  }

  public listenForRoomChat(
    roomName: string, 
    passcode: string | undefined, 
    onMessage: (msg: ChatMessage) => void
  ): () => void {
    if (!this.db) return () => {};
    const roomKey = this.getRoomKey(roomName, passcode);
    const chatsRef = ref(this.db, `rooms/${roomKey}/chats`);
    
    // We only want new messages. Simple approach: query by time or just listen and filter locally
    let initialLoad = true;
    
    const unsub = onValue(chatsRef, (snap) => {
      if (initialLoad) {
        initialLoad = false;
        return; // skip existing
      }
      const data = snap.val();
      if (!data) return;
      // Get the newest one
      const keys = Object.keys(data);
      const lastKey = keys[keys.length - 1];
      const msg = data[lastKey];
      if (msg) {
        onMessage({
          id: lastKey,
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp,
          isMine: false
        });
      }
    });
    
    return () => off(chatsRef, 'value', unsub);
  }

  public async requestPttLock(roomName: string, passcode: string | undefined, callsign: string): Promise<boolean> {
    if (!this.db) return true;
    const roomKey = this.getRoomKey(roomName, passcode);
    const lockRef = ref(this.db, `rooms/${roomKey}/ptt_lock`);
    
    let success = false;
    await runTransaction(lockRef, (currentData) => {
      const now = Date.now();
      if (currentData === null || (now - currentData.timestamp > 65000)) {
        success = true;
        return { callsign, timestamp: now };
      }
      if (currentData.callsign === callsign) {
        success = true;
        return { callsign, timestamp: now };
      }
      return; // abort transaction
    });
    
    return success;
  }

  public releasePttLock(roomName: string, passcode: string | undefined, callsign: string): void {
    if (!this.db) return;
    const roomKey = this.getRoomKey(roomName, passcode);
    const lockRef = ref(this.db, `rooms/${roomKey}/ptt_lock`);
    
    get(lockRef).then((snap) => {
      const data = snap.val();
      if (data && data.callsign === callsign) {
        remove(lockRef);
      }
    });
  }

  public listenForPttLock(
    roomName: string, 
    passcode: string | undefined, 
    onLockChanged: (callsign: string | null) => void
  ): () => void {
    if (!this.db) return () => {};
    const roomKey = this.getRoomKey(roomName, passcode);
    const lockRef = ref(this.db, `rooms/${roomKey}/ptt_lock`);
    
    const unsub = onValue(lockRef, (snap) => {
      const data = snap.val();
      if (data && data.callsign) {
        // Only valid if less than 65s old
        if (Date.now() - data.timestamp < 65000) {
          onLockChanged(data.callsign);
        } else {
          onLockChanged(null);
        }
      } else {
        onLockChanged(null);
      }
    });
    return () => off(lockRef, 'value', unsub);
  }

  public sendInvitePing(targetCallsign: string, roomName: string, senderCallsign: string, passcode?: string): void {
    if (!this.db) return;
    const safeTarget = sanitizeKey(targetCallsign);
    const invitesRef = ref(this.db, `invites/${safeTarget}`);
    push(invitesRef, {
      fromCallsign: senderCallsign,
      room: roomName,
      key: passcode || '',
      timestamp: serverTimestamp()
    });
  }

  public listenForInvitePings(myCallsign: string, onPing: (ping: any) => void): () => void {
    if (!this.db) return () => {};
    const safeCallsign = sanitizeKey(myCallsign);
    const invitesRef = ref(this.db, `invites/${safeCallsign}`);
    
    // Use onChildAdded to process new pings correctly
    const unsub = onChildAdded(invitesRef, (snap) => {
      const ping = snap.val();
      if (ping) onPing(ping);
      
      // Cleanup ping immediately after receiving
      remove(snap.ref);
    });
    
    return () => off(invitesRef, 'child_added', unsub);
  }

  public listenForPeers(roomName: string, passcode: string | undefined, onPeersUpdate: (peers: any) => void): () => void {
    if (!this.db) return () => {};
    const roomKey = this.getRoomKey(roomName, passcode);
    const peersRef = ref(this.db, `rooms/${roomKey}/peers`);
    
    const unsub = onValue(peersRef, (snap) => {
      onPeersUpdate(snap.val() || {});
    });
    
    return () => off(peersRef, 'value', unsub);
  }

  // Admin Methods
  public listenForBannedOperators(onUpdate: (banned: Record<string, boolean>) => void): () => void {
    if (!this.db) return () => {};
    const banRef = ref(this.db, 'banned_operators');
    const unsub = onValue(banRef, (snap) => {
      onUpdate(snap.val() || {});
    });
    return () => off(banRef, 'value', unsub);
  }

  public unbanOperator(key: string): void {
    if (!this.db) return;
    remove(ref(this.db, `banned_operators/${key}`));
  }

  public async kickAll(): Promise<void> {
    if (!this.db) return;
    try {
      const roomsRef = ref(this.db, 'rooms');
      const snap = await get(roomsRef);
      const rooms = snap.val();
      if (!rooms) return;

      const updates: any = {};
      Object.keys(rooms).forEach(roomKey => {
        const peers = rooms[roomKey].peers || {};
        Object.keys(peers).forEach(peerId => {
          updates[`rooms/${roomKey}/peers/${peerId}/banned`] = true; // Use banned flag to force disconnect since client already listens to it
        });
      });
      await update(ref(this.db), updates);
    } catch (e) {
      console.error('Kick All Failed', e);
    }
  }
}

export const firebaseSignaling = new FirebaseSignaling();
