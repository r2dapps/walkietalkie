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

    // 2. Announce our presence to the room
    this.myPeerRef.set({
      callsign: callsign || 'Operator',
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      peerId: myPeerId
    });

    // 3. Listen for new or existing peers in this room
    this.roomRef.on('child_added', (snapshot) => {
      const peerData = snapshot.val();
      if (!peerData) return;

      const remotePeerId = snapshot.key;
      if (remotePeerId !== this.myPeerId) {
        console.log(`[FirebaseSignaling] Discovered peer in #${safeRoom}:`, remotePeerId, peerData);
        if (onPeerDiscovered) {
          onPeerDiscovered(remotePeerId, peerData.callsign);
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
  }

  /**
   * Send an instant invite ping to a friend by callsign via Firebase RTDB.
   */
  sendInvitePing(targetCallsign, roomName, senderCallsign) {
    if (!this.init()) return;
    const safeTarget = (targetCallsign || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!safeTarget) return;

    const inviteRef = this.db.ref(`invites/${safeTarget}`).push();
    inviteRef.set({
      fromCallsign: senderCallsign || 'AetherTalk Operator',
      room: roomName || 'alpha1',
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    console.log(`[FirebaseSignaling] Sent invite ping to ${targetCallsign} for room #${roomName}`);
    if (window.uiController && window.uiController.showToast) {
      window.uiController.showToast(`Pinged ${targetCallsign} to join #${roomName}!`, 'success');
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

      // Trigger Web Push Notification if granted and page is in background
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(`Radio Call from ${data.fromCallsign}`, {
              body: `Join channel #${data.room} now on AetherTalk`,
              icon: './assets/icon.svg',
              data: {
                url: `/#room=${data.room}`
              }
            });
          });
        }
      }

      // Clean up processed invite
      snapshot.ref.remove();
    });
  }

  /**
   * Remove local presence when disconnecting or switching channels.
   */
  leaveRoom() {
    if (this.roomRef) {
      this.roomRef.off();
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
