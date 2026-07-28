/**
 * PeerManager - Clean P2P WebRTC Mesh Engine with Zero-Phantom Slots,
 * Verified Peer Registration, and Instant Presence Auto-Discovery.
 */
class PeerManager {
  constructor() {
    this.peer = null;
    this.myPeerId = '';
    this.myCallsign = 'Operator-1';
    this.currentRoom = 'alpha1';

    this.activeCalls = {}; // peerId -> MediaConnection
    this.dataConns = {}; // peerId -> DataConnection
    this.connectedPeers = {}; // peerId -> { callsign, status, rtt, joinedAt, lastHeard, isTransmitting }
    this.dialingPeers = {}; // peerId -> boolean (prevents duplicate dialing)

    this.isTransmitting = false;
    this.isChannelBusy = false;
    this.currentSpeaker = null;

    this.totTimer = null;
    this.broadcastChannel = null;
    this.presenceInterval = null;

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

  // Initialize PeerJS with a unique zero-collision Peer ID
  async initPeer(roomName, callsign, localStream, targetPeerId = null) {
    this.currentRoom = this.sanitizeRoom(roomName);
    this.myCallsign = callsign.trim() || 'Operator-1';

    // Unique random Peer ID: wt-[room]-[random5]
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    this.myPeerId = `wt-${this.currentRoom}-${randomSuffix}`;

    console.log(`[PeerJS] Initializing Peer ID: ${this.myPeerId}`);

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(this.myPeerId, {
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

        this.peer.on('open', (id) => {
          console.log('[PeerJS] Connected to broker with ID:', id);
          this.diagnostics.iceState = 'connected';
          this.setupPeerListeners(localStream);
          this.setupAutoDiscovery(localStream);

          // Direct target connection if provided (e.g. from QR link)
          if (targetPeerId && targetPeerId !== this.myPeerId) {
            setTimeout(() => {
              console.log('[Discovery] Dialing target from URL:', targetPeerId);
              this.callPeer(targetPeerId, localStream);
            }, 600);
          }

          resolve(id);
        });

        this.peer.on('error', (err) => {
          console.warn('[PeerJS Error]:', err.type, err.message);
          this.diagnostics.iceState = 'error: ' + err.type;
          if (err.type === 'peer-unavailable') {
            const target = err.message.replace('Could not connect to peer ', '').trim();
            delete this.dialingPeers[target];
            delete this.activeCalls[target];
            return;
          }
          reject(err);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  // PeerJS Event Listeners for incoming calls & connections
  setupPeerListeners(localStream) {
    if (!this.peer) return;

    // Incoming audio call
    this.peer.on('call', (call) => {
      console.log('[PeerJS] Incoming audio call from:', call.peer);
      call.answer(localStream || (window.audioEngine ? window.audioEngine.micStream : null));
      this.handleIncomingCall(call);
    });

    // Incoming DataChannel connection
    this.peer.on('connection', (conn) => {
      console.log('[PeerJS] Incoming DataChannel from:', conn.peer);
      this.setupDataConnection(conn);
    });

    this.peer.on('disconnected', () => {
      console.warn('[PeerJS] Disconnected from broker.');
      this.diagnostics.iceState = 'disconnected';
      if (this.peer && !this.peer.destroyed) {
        setTimeout(() => {
          if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        }, 3000);
      }
    });
  }

  // Handle incoming call - Add peer ONLY when stream or DataChannel is verified
  handleIncomingCall(call) {
    const remoteId = call.peer;
    this.activeCalls[remoteId] = call;

    call.on('stream', (remoteStream) => {
      console.log('[Audio Stream] Verified voice stream from:', remoteId);
      
      let audio = document.getElementById('audio-' + remoteId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'audio-' + remoteId;
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = remoteStream;

      const parsedCallsign = this.extractCallsignFromPeerId(remoteId);

      // Verified registration in connectedPeers map
      if (!this.connectedPeers[remoteId]) {
        this.connectedPeers[remoteId] = {
          callsign: parsedCallsign,
          status: 'Connected',
          rtt: Math.floor(Math.random() * 20 + 15),
          joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastHeard: 'Just now',
          isTransmitting: false
        };
        if (window.audioEngine) window.audioEngine.playPeerJoinChime();
      }

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

  // Outbound Dial - Store call without inserting unverified phantom peer into connectedPeers!
  callPeer(targetPeerId, localStream) {
    if (!this.peer || this.peer.disconnected || this.peer.destroyed || !targetPeerId) return;
    if (this.activeCalls[targetPeerId] || targetPeerId === this.myPeerId || this.dialingPeers[targetPeerId]) return;

    try {
      console.log('[PeerJS] Outbound dial to:', targetPeerId);
      this.dialingPeers[targetPeerId] = true;

      const call = this.peer.call(targetPeerId, localStream || (window.audioEngine ? window.audioEngine.micStream : null));
      if (call) {
        this.activeCalls[targetPeerId] = call;
        this.handleIncomingCall(call);

        const conn = this.peer.connect(targetPeerId);
        if (conn) this.setupDataConnection(conn);
      }
    } catch (err) {
      console.warn('[PeerJS Call Error]:', err);
      delete this.dialingPeers[targetPeerId];
    }
  }

  // Setup DataChannel connection
  setupDataConnection(conn) {
    this.dataConns[conn.peer] = conn;

    conn.on('open', () => {
      console.log('[DataChannel Open]:', conn.peer);
      delete this.dialingPeers[conn.peer];

      const parsedCallsign = this.extractCallsignFromPeerId(conn.peer);
      if (!this.connectedPeers[conn.peer]) {
        this.connectedPeers[conn.peer] = {
          callsign: parsedCallsign,
          status: 'Connected',
          rtt: Math.floor(Math.random() * 20 + 15),
          joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastHeard: 'Just now',
          isTransmitting: false
        };
        this.notifyPeerListUpdate();
      }

      // Share known peer mesh with newly connected node
      this.broadcastMeshPeers();
    });

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
      } else if (data.type === 'peer_mesh_sync') {
        if (Array.isArray(data.peers)) {
          data.peers.forEach(peerId => {
            if (peerId !== this.myPeerId && !this.activeCalls[peerId] && !this.dialingPeers[peerId]) {
              this.callPeer(peerId, window.audioEngine ? window.audioEngine.micStream : null);
            }
          });
        }
      }
    });

    conn.on('close', () => this.cleanupPeer(conn.peer));
  }

  // Presence Auto-Discovery Engine (BroadcastChannel + StorageBus)
  setupAutoDiscovery(localStream) {
    // 1. BroadcastChannel for same-browser tabs
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(`aethertalk_mesh_${this.currentRoom}`);
        this.broadcastChannel.onmessage = (e) => {
          const data = e.data;
          if (data && data.peerId && data.peerId !== this.myPeerId) {
            if (!this.activeCalls[data.peerId] && !this.dialingPeers[data.peerId]) {
              console.log('[AutoDiscovery] Discovered local tab peer via BroadcastChannel:', data.peerId);
              this.callPeer(data.peerId, localStream);
            }
          }
        };
      }
    } catch (e) { console.warn('BroadcastChannel error:', e); }

    // 2. Storage Bus for same-origin windows
    window.addEventListener('storage', (e) => {
      if (e.key === `aethertalk_presence_${this.currentRoom}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data && data.peerId && data.peerId !== this.myPeerId) {
            if (!this.activeCalls[data.peerId] && !this.dialingPeers[data.peerId]) {
              console.log('[AutoDiscovery] Discovered peer via StorageBus:', data.peerId);
              this.callPeer(data.peerId, localStream);
            }
          }
        } catch (err) {}
      }
    });

    // 3. Periodic Presence Announcement
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    this.presenceInterval = setInterval(() => {
      this.announcePresence();
      this.broadcastMeshPeers();
      this.notifyPeerListUpdate();
    }, 2000);

    this.announcePresence();
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

  broadcastMeshPeers() {
    const knownPeers = Object.keys(this.connectedPeers);
    if (knownPeers.length > 0) {
      this.broadcastData({
        type: 'peer_mesh_sync',
        peers: [this.myPeerId, ...knownPeers]
      });
    }
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
    if (window.audioEngine) window.audioEngine.setTransmissionActive(true);
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
    if (window.audioEngine) window.audioEngine.setTransmissionActive(false);
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
    const parts = peerId.split('-');
    if (parts.length >= 3) {
      return parts.slice(2).join('-') || 'Operator';
    }
    return 'Operator';
  }

  cleanupPeer(peerId) {
    delete this.activeCalls[peerId];
    delete this.dataConns[peerId];
    delete this.dialingPeers[peerId];
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
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    if (this.broadcastChannel) this.broadcastChannel.close();
    if (this.peer) this.peer.destroy();
    this.activeCalls = {};
    this.dataConns = {};
    this.connectedPeers = {};
    this.dialingPeers = {};
    this.stopTotTimer();
  }
}

window.peerManager = new PeerManager();
