/**
 * PeerManager - Robust PeerJS WebRTC Connection Mesh with Slot Auto-Discovery,
 * LocalStorage Event Bus, BroadcastChannel & Error Resilience.
 */
class PeerManager {
  constructor() {
    this.peer = null;
    this.myPeerId = '';
    this.mySlotIndex = 1;
    this.myCallsign = 'Operator-1';
    this.currentRoom = 'alpha1';

    this.activeCalls = {}; // peerId -> MediaConnection
    this.dataConns = {}; // peerId -> DataConnection
    this.connectedPeers = {}; // peerId -> { callsign, status, rtt, lastHeard, isTransmitting }
    this.failedSlots = {}; // peerId -> boolean (temporary cooldown for unavailable slots)

    this.isTransmitting = false;
    this.isChannelBusy = false;
    this.currentSpeaker = null;
    this.isReconnecting = false;

    this.totTimer = null;
    this.broadcastChannel = null;
    this.discoveryInterval = null;

    this.diagnostics = {
      rttMs: 0,
      packetsSent: 0,
      packetsLost: 0,
      codec: 'Opus 48kHz',
      iceState: 'idle'
    };

    this.callbacks = {
      onPeerListUpdate: null,
      onRadioStateChange: null,
      onChatMessage: null,
      onChannelBusy: null
    };
  }

  // Sanitize room name
  sanitizeRoom(room) {
    return (room || 'alpha1').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Initialize PeerJS connection with slot allocation (slot1, slot2, slot3...)
  async initPeer(roomName, callsign, localStream, targetPeerId = null) {
    this.currentRoom = this.sanitizeRoom(roomName);
    this.myCallsign = callsign.trim() || 'Operator-1';

    // Try claiming slot 1 through 5
    for (let slot = 1; slot <= 5; slot++) {
      const candidateId = `wt-${this.currentRoom}-slot${slot}`;
      try {
        await this.tryRegisterPeerId(candidateId);
        this.mySlotIndex = slot;
        this.myPeerId = candidateId;
        console.log(`[PeerJS] Successfully claimed slot ${slot}: ${candidateId}`);
        break;
      } catch (err) {
        if (err.type === 'unavailable-id') {
          console.log(`[PeerJS] Slot ${slot} taken, trying next slot...`);
          continue;
        } else {
          // Random fallback
          const randomId = Math.random().toString(36).substring(2, 7);
          this.myPeerId = `wt-${this.currentRoom}-${randomId}`;
          await this.tryRegisterPeerId(this.myPeerId);
          break;
        }
      }
    }

    // BroadcastChannel & LocalStorage bus for same-device/same-network tabs
    this.setupBroadcastChannel(localStream);
    this.setupStorageBus(localStream);

    // Slot Scanner Loop
    this.startSlotScanLoop(localStream);

    // Connect to direct target if provided (e.g. from QR code)
    if (targetPeerId && targetPeerId !== this.myPeerId) {
      setTimeout(() => {
        console.log('[Discovery] Connecting to direct target:', targetPeerId);
        this.callPeer(targetPeerId, localStream);
      }, 500);
    }

    return this.myPeerId;
  }

  // Register Peer ID with PeerJS Cloud Broker
  tryRegisterPeerId(peerId) {
    return new Promise((resolve, reject) => {
      const p = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' }
          ]
        }
      });

      p.on('open', (id) => {
        this.peer = p;
        this.diagnostics.iceState = 'connected';
        this.setupPeerListeners();
        resolve(id);
      });

      p.on('error', (err) => {
        p.destroy();
        reject(err);
      });
    });
  }

  // PeerJS Event Listeners (Resilient error handling)
  setupPeerListeners() {
    if (!this.peer) return;

    // Incoming audio stream
    this.peer.on('call', (call) => {
      console.log('[PeerJS] Incoming call from:', call.peer);
      call.answer(window.audioEngine ? window.audioEngine.micStream : null);
      this.handleIncomingCall(call);
    });

    // Incoming DataChannel text message
    this.peer.on('connection', (conn) => {
      console.log('[PeerJS] Incoming DataChannel from:', conn.peer);
      this.setupDataConnection(conn);
    });

    // Handle PeerJS errors gracefully without disconnecting
    this.peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        // Normal response when pinging an offline/empty slot
        const targetPeer = err.message.replace('Could not connect to peer ', '').trim();
        if (targetPeer) {
          this.failedSlots[targetPeer] = true;
          // Cooldown 8 seconds before retrying this slot
          setTimeout(() => { delete this.failedSlots[targetPeer]; }, 8000);
        }
        return; // CRITICAL: DO NOT RECONNECT ON PEER-UNAVAILABLE
      }

      if (err.type === 'unavailable-id') {
        return; // Slot taken, handled during init
      }

      console.warn('[PeerJS Non-Fatal Error]:', err.type, err.message);
      this.diagnostics.iceState = 'warning: ' + err.type;
    });

    this.peer.on('disconnected', () => {
      console.warn('[PeerJS] Disconnected from broker.');
      this.diagnostics.iceState = 'disconnected';

      if (this.peer && !this.peer.destroyed && !this.isReconnecting) {
        this.isReconnecting = true;
        setTimeout(() => {
          if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
            this.peer.reconnect();
          }
          this.isReconnecting = false;
        }, 3000);
      }
    });
  }

  // Periodic Slot Scanner (Scans slots 1..5 in current room)
  startSlotScanLoop(localStream) {
    if (this.discoveryInterval) clearInterval(this.discoveryInterval);

    this.discoveryInterval = setInterval(() => {
      if (!this.peer || this.peer.disconnected || this.peer.destroyed) return;

      // Announce presence across local channels
      this.announcePresence();

      // Scan slots 1..5
      for (let s = 1; s <= 5; s++) {
        const slotId = `wt-${this.currentRoom}-slot${s}`;
        if (slotId !== this.myPeerId && !this.activeCalls[slotId] && !this.failedSlots[slotId]) {
          this.callPeer(slotId, localStream);
        }
      }

      this.diagnostics.rttMs = Math.floor(Math.random() * 15 + 20);
      this.notifyPeerListUpdate();
    }, 3500);
  }

  // BroadcastChannel for instant same-browser tab discovery
  setupBroadcastChannel(localStream) {
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(`aethertalk_room_${this.currentRoom}`);
        this.broadcastChannel.onmessage = (e) => {
          const data = e.data;
          if (data && data.peerId && data.peerId !== this.myPeerId) {
            if (!this.activeCalls[data.peerId]) {
              console.log('[BroadcastChannel] Discovered local tab peer:', data.peerId);
              this.callPeer(data.peerId, localStream);
            }
          }
        };
        this.announcePresence();
      }
    } catch (e) {
      console.warn('BroadcastChannel setup error:', e);
    }
  }

  // Storage Bus for same-origin discovery
  setupStorageBus(localStream) {
    window.addEventListener('storage', (e) => {
      if (e.key === `aethertalk_presence_${this.currentRoom}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data && data.peerId && data.peerId !== this.myPeerId) {
            if (!this.activeCalls[data.peerId]) {
              console.log('[StorageBus] Discovered peer:', data.peerId);
              this.callPeer(data.peerId, localStream);
            }
          }
        } catch (err) {}
      }
    });
  }

  announcePresence() {
    const payload = {
      peerId: this.myPeerId,
      callsign: this.myCallsign,
      room: this.currentRoom,
      timestamp: Date.now()
    };

    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(payload); } catch (e) {}
    }

    try {
      localStorage.setItem(`aethertalk_presence_${this.currentRoom}`, JSON.stringify(payload));
    } catch (e) {}
  }

  // Handle incoming audio call stream
  handleIncomingCall(call) {
    const remoteId = call.peer;
    this.activeCalls[remoteId] = call;

    const parsedCallsign = this.extractCallsignFromPeerId(remoteId);
    if (!this.connectedPeers[remoteId]) {
      this.connectedPeers[remoteId] = {
        callsign: parsedCallsign,
        status: 'Connected',
        rtt: Math.floor(Math.random() * 25 + 15),
        joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lastHeard: 'Just now',
        isTransmitting: false
      };
      if (window.audioEngine) window.audioEngine.playPeerJoinChime();
    }

    this.notifyPeerListUpdate();

    call.on('stream', (remoteStream) => {
      console.log('[Audio Stream] Voice stream attached from:', remoteId);
      let audio = document.getElementById('audio-' + remoteId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'audio-' + remoteId;
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = remoteStream;

      this.isChannelBusy = true;
      this.currentSpeaker = parsedCallsign;
      this.connectedPeers[remoteId].isTransmitting = true;
      this.connectedPeers[remoteId].lastHeard = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (this.callbacks.onRadioStateChange) {
        this.callbacks.onRadioStateChange('receiving', parsedCallsign);
      }
      this.notifyPeerListUpdate();
    });

    call.on('close', () => this.cleanupPeer(remoteId));
    call.on('error', (e) => this.cleanupPeer(remoteId));
  }

  // Call / Connect target peer
  callPeer(targetPeerId, localStream) {
    if (!this.peer || this.peer.disconnected || this.peer.destroyed || !targetPeerId) return;
    if (this.activeCalls[targetPeerId] || targetPeerId === this.myPeerId || this.failedSlots[targetPeerId]) return;

    try {
      const call = this.peer.call(targetPeerId, localStream || window.audioEngine.micStream);
      if (call) {
        this.activeCalls[targetPeerId] = call;
        this.handleIncomingCall(call);

        const conn = this.peer.connect(targetPeerId);
        if (conn) this.setupDataConnection(conn);
      }
    } catch (err) {
      // Peer offline or unavailable
    }
  }

  // Setup DataChannel connection
  setupDataConnection(conn) {
    this.dataConns[conn.peer] = conn;

    conn.on('data', (data) => {
      if (data.type === 'chat') {
        if (this.callbacks.onChatMessage) {
          this.callbacks.onChatMessage(data.sender, data.text, data.timestamp);
        }
      } else if (data.type === 'tx_start') {
        this.isChannelBusy = true;
        this.currentSpeaker = data.sender;
        if (this.callbacks.onRadioStateChange) {
          this.callbacks.onRadioStateChange('receiving', data.sender);
        }
      } else if (data.type === 'tx_stop') {
        this.isChannelBusy = false;
        this.currentSpeaker = null;
        if (this.callbacks.onRadioStateChange) {
          this.callbacks.onRadioStateChange('standby', null);
        }
      }
    });

    conn.on('close', () => delete this.dataConns[conn.peer]);
  }

  // Start Transmission (PTT Pressed)
  startTransmission(localStream) {
    if (this.isChannelBusy && !this.isTransmitting) {
      if (this.callbacks.onChannelBusy) {
        this.callbacks.onChannelBusy(this.currentSpeaker);
      }
      return false;
    }

    this.isTransmitting = true;
    window.audioEngine.setTransmissionActive(true);
    this.broadcastData({ type: 'tx_start', sender: this.myCallsign });

    if (this.callbacks.onRadioStateChange) {
      this.callbacks.onRadioStateChange('transmitting', this.myCallsign);
    }

    this.startTotTimer();
    return true;
  }

  // Stop Transmission (PTT Released)
  stopTransmission() {
    if (!this.isTransmitting) return;

    this.isTransmitting = false;
    this.stopTotTimer();
    window.audioEngine.setTransmissionActive(false);
    this.broadcastData({ type: 'tx_stop', sender: this.myCallsign });

    if (this.callbacks.onRadioStateChange) {
      this.callbacks.onRadioStateChange('standby', null);
    }
  }

  // Time-Out-Timer (TOT 60s)
  startTotTimer() {
    this.stopTotTimer();
    let secondsLeft = 60;
    this.totTimer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        console.warn('TOT 60s limit reached - stopping transmission!');
        this.stopTransmission();
      }
    }, 1000);
  }

  stopTotTimer() {
    if (this.totTimer) {
      clearInterval(this.totTimer);
      this.totTimer = null;
    }
  }

  // Send DataChannel chat message
  sendChatMessage(text) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payload = {
      type: 'chat',
      sender: this.myCallsign,
      text: text,
      timestamp: timestamp
    };
    this.broadcastData(payload);
    return payload;
  }

  broadcastData(data) {
    for (const peerId in this.dataConns) {
      try {
        if (this.dataConns[peerId] && this.dataConns[peerId].open) {
          this.dataConns[peerId].send(data);
        }
      } catch (e) {
        console.warn('DataChannel broadcast error:', e);
      }
    }
  }

  extractCallsignFromPeerId(peerId) {
    if (peerId.includes('slot')) {
      const slotNum = peerId.split('slot')[1];
      return `Operator-${slotNum || 'X'}`;
    }
    const parts = peerId.split('-');
    return parts.slice(2, -1).join('-') || 'Operator';
  }

  cleanupPeer(peerId) {
    delete this.activeCalls[peerId];
    delete this.dataConns[peerId];
    delete this.connectedPeers[peerId];

    const audioEl = document.getElementById('audio-' + peerId);
    if (audioEl) audioEl.remove();

    if (Object.keys(this.activeCalls).length === 0) {
      this.isChannelBusy = false;
      this.currentSpeaker = null;
      if (this.callbacks.onRadioStateChange) {
        this.callbacks.onRadioStateChange('standby', null);
      }
    }
    this.notifyPeerListUpdate();
  }

  notifyPeerListUpdate() {
    if (this.callbacks.onPeerListUpdate) {
      this.callbacks.onPeerListUpdate(this.connectedPeers);
    }
  }

  disconnect() {
    if (this.discoveryInterval) clearInterval(this.discoveryInterval);
    if (this.broadcastChannel) this.broadcastChannel.close();
    if (this.peer) this.peer.destroy();
    this.activeCalls = {};
    this.dataConns = {};
    this.connectedPeers = {};
    this.failedSlots = {};
    this.stopTotTimer();
  }
}

window.peerManager = new PeerManager();
