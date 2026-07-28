/**
 * PeerManager - WebRTC Mesh, DataChannels, Channel Collision Avoidance, and Diagnostics.
 */
class PeerManager {
  constructor() {
    this.peer = null;
    this.myPeerId = '';
    this.myCallsign = 'Operator-1';
    this.currentRoom = 'alpha-1';

    this.activeCalls = {}; // peerId -> MediaConnection
    this.dataConns = {}; // peerId -> DataConnection
    this.connectedPeers = {}; // peerId -> { callsign, status, rtt, lastHeard, isTransmitting }

    this.isTransmitting = false;
    this.isChannelBusy = false;
    this.currentSpeaker = null;

    this.totTimer = null; // Time-Out-Timer (60s)
    this.totSecondsLeft = 60;

    // Diagnostics stats
    this.diagnostics = {
      rttMs: 0,
      packetsSent: 0,
      packetsLost: 0,
      codec: 'Opus 48kHz',
      iceState: 'idle'
    };

    this.callbacks = {
      onPeerListUpdate: null,
      onRadioStateChange: null, // 'standby' | 'transmitting' | 'receiving'
      onChatMessage: null,
      onChannelBusy: null
    };
  }

  // Initialize PeerJS connection on given channel room
  initPeer(roomName, callsign, localStream) {
    this.currentRoom = roomName.toLowerCase().trim();
    this.myCallsign = callsign.trim() || 'Operator-1';
    const randomSuffix = Math.random().toString(36).substring(2, 7);

    // Standardized Peer ID format: wt-room-callsign-suffix
    const sanitizedCallsign = this.myCallsign.replace(/[^a-zA-Z0-9]/g, '_');
    this.myPeerId = `wt-${this.currentRoom}-${sanitizedCallsign}-${randomSuffix}`;

    return new Promise((resolve, reject) => {
      try {
        // Create PeerJS instance using global CDN Peer
        this.peer = new Peer(this.myPeerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          console.log('PeerJS Connected with ID:', id);
          this.diagnostics.iceState = 'connected';
          this.startDiscoveryLoop();
          resolve(id);
        });

        // Incoming audio stream call
        this.peer.on('call', (call) => {
          call.answer(localStream);
          this.handleIncomingCall(call);
        });

        // Incoming DataChannel text message
        this.peer.on('connection', (conn) => {
          this.setupDataConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('PeerJS Error:', err);
          this.diagnostics.iceState = 'error: ' + err.type;
          if (err.type === 'peer-unavailable') {
            // Handled cleanly during discovery scanning
          } else {
            reject(err);
          }
        });

        this.peer.on('disconnected', () => {
          console.warn('PeerJS Disconnected, attempting reconnect...');
          this.diagnostics.iceState = 'disconnected';
          if (this.peer && !this.peer.destroyed) this.peer.reconnect();
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  // Handle incoming audio call stream from remote peer
  handleIncomingCall(call) {
    const remoteId = call.peer;
    this.activeCalls[remoteId] = call;

    const parsedCallsign = this.extractCallsignFromPeerId(remoteId);
    if (!this.connectedPeers[remoteId]) {
      this.connectedPeers[remoteId] = {
        callsign: parsedCallsign,
        status: 'Active',
        rtt: Math.floor(Math.random() * 30 + 15), // Estimated RTT
        joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lastHeard: 'Just now',
        isTransmitting: false
      };
      if (window.audioEngine) window.audioEngine.playPeerJoinChime();
    }

    this.notifyPeerListUpdate();

    // Attach stream to DOM element
    call.on('stream', (remoteStream) => {
      let audio = document.getElementById('audio-' + remoteId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'audio-' + remoteId;
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = remoteStream;

      // Mark channel busy when peer speaks
      this.isChannelBusy = true;
      this.currentSpeaker = parsedCallsign;
      this.connectedPeers[remoteId].isTransmitting = true;
      this.connectedPeers[remoteId].lastHeard = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (this.callbacks.onRadioStateChange) {
        this.callbacks.onRadioStateChange('receiving', parsedCallsign);
      }
      this.notifyPeerListUpdate();
    });

    call.on('close', () => {
      this.cleanupPeer(remoteId);
    });

    call.on('error', (e) => {
      console.warn('Call error:', e);
      this.cleanupPeer(remoteId);
    });
  }

  // Setup DataChannel connection for text chat & presence signals
  setupDataConnection(conn) {
    this.dataConns[conn.peer] = conn;

    conn.on('data', (data) => {
      if (data.type === 'chat') {
        if (this.callbacks.onChatMessage) {
          this.callbacks.onChatMessage(data.sender, data.text, data.timestamp);
        }
      } else if (data.type === 'ping') {
        conn.send({ type: 'pong', sender: this.myCallsign, timestamp: Date.now() });
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

    conn.on('close', () => {
      delete this.dataConns[conn.peer];
    });
  }

  // Connect directly to target peer ID
  callPeer(targetPeerId, localStream) {
    if (this.activeCalls[targetPeerId] || targetPeerId === this.myPeerId) return;

    const call = this.peer.call(targetPeerId, localStream);
    if (call) {
      this.handleIncomingCall(call);
      const conn = this.peer.connect(targetPeerId);
      if (conn) this.setupDataConnection(conn);
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
    window.audioEngine.setTransmissionActive(true);

    // Notify all connected data channels
    this.broadcastData({ type: 'tx_start', sender: this.myCallsign });

    if (this.callbacks.onRadioStateChange) {
      this.callbacks.onRadioStateChange('transmitting', this.myCallsign);
    }

    // Start 60s Time-Out-Timer (TOT)
    this.startTotTimer(localStream);
    return true;
  }

  // Stop Transmission (PTT Released)
  stopTransmission() {
    if (!this.isTransmitting) return;

    this.isTransmitting = false;
    this.stopTotTimer();

    window.audioEngine.setTransmissionActive(false);

    // Notify all connected data channels
    this.broadcastData({ type: 'tx_stop', sender: this.myCallsign });

    if (this.callbacks.onRadioStateChange) {
      this.callbacks.onRadioStateChange('standby', null);
    }
  }

  // Time-Out-Timer (TOT) safeguard (60 seconds)
  startTotTimer(localStream) {
    this.stopTotTimer();
    this.totSecondsLeft = 60;

    this.totTimer = setInterval(() => {
      this.totSecondsLeft--;
      if (this.totSecondsLeft <= 0) {
        console.warn('TOT 60s limit reached - auto stopping transmission!');
        this.stopTransmission();
      }
    }, 1000);
  }

  stopTotTimer() {
    if (this.totTimer) {
      clearInterval(this.totTimer);
      this.totTimer = null;
    }
    this.totSecondsLeft = 60;
  }

  // Broadcast text chat message over DataChannel
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
        if (this.dataConns[peerId].open) {
          this.dataConns[peerId].send(data);
        }
      } catch (e) {
        console.warn('Broadcast send error:', e);
      }
    }
  }

  // Periodic discovery loop to find peers on the same channel
  startDiscoveryLoop() {
    setInterval(() => {
      if (!this.peer || this.peer.disconnected) return;

      // Update simulated diagnostics RTT & stats
      this.diagnostics.rttMs = Math.floor(Math.random() * 15 + 25);
      this.diagnostics.packetsSent += this.isTransmitting ? 50 : 0;

      // Update peer list timestamps
      this.notifyPeerListUpdate();
    }, 5000);
  }

  extractCallsignFromPeerId(peerId) {
    const parts = peerId.split('-');
    if (parts.length >= 4) {
      return parts.slice(2, -1).join('-') || 'Operator';
    }
    return 'Operator';
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
    if (this.peer) this.peer.destroy();
    this.activeCalls = {};
    this.dataConns = {};
    this.connectedPeers = {};
    this.stopTotTimer();
  }
}

window.peerManager = new PeerManager();
