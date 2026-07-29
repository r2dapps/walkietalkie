/**
 * FirebaseSignaling - Instant zero-latency P2P Room Discovery for AetherTalk.
 * Uses Firebase Realtime Database to announce presence and auto-connect WebRTC mesh.
 */
class FirebaseSignaling {
  constructor() {
    this.db = null;
    this.roomRef = null;
    this.myPeerRef = null;
    this.currentRoom = null;
    this.myPeerId = null;
    this.isInitialized = false;
  }

  // Initialize Firebase app & database
  init() {
    if (this.isInitialized) return true;

    if (typeof firebase === 'undefined') {
      console.warn('[FirebaseSignaling] Firebase SDK not loaded yet.');
      return false;
    }

    const config = window.AETHERTALK_CONFIG ? window.AETHERTALK_CONFIG.firebase : null;
    if (!config || !config.apiKey) {
      console.error('[FirebaseSignaling] Firebase configuration missing in js/config.js');
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      this.db = firebase.database();
      this.isInitialized = true;
      console.log('[FirebaseSignaling] Initialized successfully with project:', config.projectId);
      return true;
    } catch (err) {
      console.error('[FirebaseSignaling] Init error:', err);
      return false;
    }
  }

  /**
   * Join a room in Firebase Realtime DB.
   * Announces presence and listens for other operators.
   */
  joinRoom(roomName, myPeerId, callsign, onPeerDiscovered, passcode = '') {
    if (!this.init()) return;

    this.leaveRoom(); // Clean up any previous room listeners

    const safeRoom = (roomName || 'alpha1').toLowerCase().replace(/[^a-z0-9]/g, '');
    const passHash = passcode ? '_' + String(passcode).trim().replace(/[^a-z0-9]/gi, '') : '';
    const fullRoomKey = safeRoom + passHash;
    
    this.currentRoom = fullRoomKey;
    this.myPeerId = myPeerId;

    console.log(`[FirebaseSignaling] Joining room #${safeRoom} (Security Key: ${passcode ? 'PROTECTED' : 'PUBLIC'}) as ${myPeerId}`);

    // Reference to this room's peers roster
    this.roomRef = this.db.ref(`rooms/${fullRoomKey}/peers`);
    this.myPeerRef = this.roomRef.child(myPeerId);

    // 1. Set auto-removal on disconnect (tab close, network loss)
    this.myPeerRef.onDisconnect().remove();

    // 2. Announce our presence to the room with Device UUID
    const avatar = window.profileManager ? (window.profileManager.profile.avatar || 'radio') : 'radio';
    const deviceUuid = window.storageManager ? window.storageManager.getDeviceUuid() : 'dev-' + myPeerId;

    // Check if operator/device is banned
    if (this.db) {
      const banRef = this.db.ref(`banned_operators/${callsign}`);
      banRef.once('value', (snap) => {
        if (snap.exists() && snap.val() === true) {
          alert('ACCESS DENIED: Your Callsign or Device has been banned by Master Admin.');
          this.leaveRoom();
          return;
        }
      });
    }

    this.myPeerRef.set({
      callsign: callsign || 'Operator',
      avatar: avatar,
      device_uuid: deviceUuid,
      ip_address: 'Detecting...',
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      peerId: myPeerId
    });

    // Fetch public IP address asynchronously to populate SuperAdmin roster
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        if (data && data.ip && this.myPeerRef) {
          this.myPeerRef.update({ ip_address: data.ip });
          
          // Check if IP is banned
          if (this.db) {
            this.db.ref(`banned_operators/${data.ip}`).once('value', (snap) => {
              if (snap.exists() && snap.val() === true) {
                alert('ACCESS DENIED: Your IP Address has been banned by Master Admin.');
                this.leaveRoom();
              }
            });
          }
        }
      })
      .catch(() => {});

    // 3. Listen for new or existing peers in this room
    this.roomRef.on('child_added', (snapshot) => {
      const peerData = snapshot.val();
      if (!peerData) return;

      const remotePeerId = snapshot.key;
      if (remotePeerId !== this.myPeerId) {
        console.log(`[FirebaseSignaling] Discovered peer in #${safeRoom}:`, remotePeerId, peerData);
        if (onPeerDiscovered) {
          onPeerDiscovered(remotePeerId, peerData.callsign, peerData.avatar || 'radio');
        }
      }
    });

    // 4. Listen for peers leaving
    this.roomRef.on('child_removed', (snapshot) => {
      const remotePeerId = snapshot.key;
      console.log(`[FirebaseSignaling] Peer left #${safeRoom}:`, remotePeerId);
    });

    // 5. Start listening for incoming pings to our callsign
    this.listenForInvitePings(callsign);

    // 6. Start listening for room chat messages (Firebase fallback)
    this.listenForRoomChat();
  }

  /**
   * Send a chat message via Firebase RTDB (100% reliable delivery fallback)
   */
  sendRoomChat(senderCallsign, text, avatarId = 'radio') {
    if (!this.init() || !this.currentRoom) return;
    const chatRef = this.db.ref(`rooms/${this.currentRoom}/chats`).push();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentAvatar = window.profileManager ? (window.profileManager.profile.avatar || avatarId) : avatarId;

    chatRef.set({
      sender: senderCallsign,
      avatar: currentAvatar,
      text: text,
      timestamp: timestamp,
      created: firebase.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Listen for room chat messages in Firebase RTDB
   */
  listenForRoomChat() {
    if (!this.init() || !this.currentRoom) return;
    this.seenChatKeys = new Set();
    this.joinTime = Date.now() - 5000; // Allow 5s clock tolerance
    const chatsRef = this.db.ref(`rooms/${this.currentRoom}/chats`).limitToLast(15);
    this.chatsRef = chatsRef;

    chatsRef.on('child_added', (snapshot) => {
      const msgKey = snapshot.key;
      if (this.seenChatKeys.has(msgKey)) return;
      this.seenChatKeys.add(msgKey);

      const data = snapshot.val();
      if (data && data.sender && data.text) {
        // Only display messages created during this session
        if (data.created && data.created < this.joinTime) return;

        const myCall = window.app ? window.app.myCallsign : '';
        const isSelf = (data.sender === myCall);
        if (!isSelf && window.peerManager && window.peerManager.callbacks.onChatMessage) {
          window.peerManager.callbacks.onChatMessage(data.sender, data.text, data.timestamp, data.avatar || 'radio');
        }
      }
    });
  }

  /**
   * Send an instant invite ping to a friend by callsign via Firebase RTDB (Rate-limited: 5s cooldown).
   */
  sendInvitePing(targetCallsign, roomName, senderCallsign) {
    if (!this.init()) return;
    const now = Date.now();
    this.lastPingTime = this.lastPingTime || 0;
    if (now - this.lastPingTime < 5000) {
      const waitSec = Math.ceil((5000 - (now - this.lastPingTime)) / 1000);
      if (window.uiController && window.uiController.showToast) {
        window.uiController.showToast('COOLDOWN ACTIVE', `Wait ${waitSec}s before sending another ping`, 'error');
      }
      return;
    }
    this.lastPingTime = now;

    const safeTarget = (targetCallsign || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!safeTarget) return;

    const passcode = window.app ? window.app.currentPasscode : '';
    const inviteRef = this.db.ref(`invites/${safeTarget}`).push();
    inviteRef.set({
      fromCallsign: senderCallsign || 'AetherTalk Operator',
      room: roomName || 'alpha1',
      key: passcode || '',
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    console.log(`[FirebaseSignaling] Sent invite ping to ${targetCallsign} for room #${roomName}`);
    if (window.uiController && window.uiController.showToast) {
      window.uiController.showToast('CALL PING SENT', `Pinged ${targetCallsign} to join #${roomName}`, 'success');
    }
  }

  /**
   * Listen for incoming invite pings to our callsign in Firebase RTDB.
   */
  listenForInvitePings(myCallsign) {
    if (!this.init()) return;
    const safeCallsign = (myCallsign || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!safeCallsign) return;

    const myInvitesRef = this.db.ref(`invites/${safeCallsign}`);
    myInvitesRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      console.log('[FirebaseSignaling] Received invite ping:', data);

      // Play chime audio if available
      if (window.audioEngine) {
        window.audioEngine.playRogerBeep('quindar');
      }

      // Show Toast Notification
      if (window.uiController && window.uiController.showToast) {
        window.uiController.showToast(`📡 ${data.fromCallsign} invited you to #${data.room}!`, 'info', 6000);
      }

      // Trigger Native Phone Screen Notification Banner
      if ('Notification' in window) {
        const fireNativeNotification = () => {
          if (Notification.permission !== 'granted') return;

          const baseUrl = window.location.origin + window.location.pathname;
          const roomParam = `#room=${encodeURIComponent(data.room)}`;
          const keyParam = data.key ? `&key=${encodeURIComponent(data.key)}` : '';
          const targetUrl = `${baseUrl}${roomParam}${keyParam}`;

          const title = `📡 Radio Call from ${data.fromCallsign}`;
          const options = {
            body: `Tap to join channel #${data.room} now on AetherTalk`,
            icon: './assets/icon.svg',
            badge: './assets/icon.svg',
            vibrate: [200, 100, 200, 100, 200],
            tag: 'invite-' + data.room,
            renotify: true,
            data: { url: targetUrl }
          };

          // Try Service Worker first
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, options);
            }).catch(() => {
              try { new Notification(title, options); } catch (e) {}
            });
          } else {
            // Direct browser Notification fallback
            try { new Notification(title, options); } catch (e) {}
          }
        };

        if (Notification.permission === 'granted') {
          fireNativeNotification();
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') fireNativeNotification();
          });
        }
      }

      // Clean up processed invite
      snapshot.ref.remove();
    });
  }

  /**
   * Request PTT Lock (Atomic Firebase Transaction to prevent double-talk)
   */
  async requestPttLock(callsign) {
    if (!this.init() || !this.currentRoom) return true;
    const lockRef = this.db.ref(`rooms/${this.currentRoom}/ptt_lock`);
    
    try {
      const result = await lockRef.transaction((currentLock) => {
        // If channel is un-locked or locked by us, acquire lock
        if (currentLock === null || currentLock.callsign === callsign) {
          return { callsign: callsign, timestamp: firebase.database.ServerValue.TIMESTAMP };
        } else {
          // Locked by another operator! Abort transaction.
          return;
        }
      });
      return result.committed;
    } catch (err) {
      console.warn('[FirebaseSignaling] PTT Lock transaction error:', err);
      return true; // Fallback to local transmission if Firebase transaction fails
    }
  }

  /**
   * Release PTT Lock
   */
  releasePttLock(callsign) {
    if (!this.init() || !this.currentRoom) return;
    const lockRef = this.db.ref(`rooms/${this.currentRoom}/ptt_lock`);
    lockRef.transaction((currentLock) => {
      if (currentLock && currentLock.callsign === callsign) {
        return null; // Release channel lock
      }
      return currentLock;
    });
  }

  /**
   * Listen for PTT Channel Lock changes (updates UI lock badge)
   */
  listenForPttLock(onLockChanged) {
    if (!this.init() || !this.currentRoom) return;
    const lockRef = this.db.ref(`rooms/${this.currentRoom}/ptt_lock`);
    this.pttLockRef = lockRef;

    lockRef.on('value', (snapshot) => {
      const lockData = snapshot.val();
      if (onLockChanged) {
        onLockChanged(lockData);
      }
    });
  }

  /**
   * Remove local presence when disconnecting or switching channels.
   */
  leaveRoom() {
    if (this.roomRef) {
      this.roomRef.off();
    }
    if (this.chatsRef) {
      this.chatsRef.off();
    }
    if (this.pttLockRef) {
      this.pttLockRef.off();
    }
    if (this.myPeerRef) {
      this.myPeerRef.remove();
      this.myPeerRef = null;
    }
    this.currentRoom = null;
    this.myPeerId = null;
  }
}

window.firebaseSignaling = new FirebaseSignaling();
