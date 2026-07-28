/**
 * PeerManager - Robust P2P WebRTC Mesh Engine.
 *
 * Key design points:
 * - Peer ID format: wt-{room}-{callsign}-{random5}
 *   This lets us recover the callsign from the peer ID as a fallback.
 * - Uses both a DataChannel (for text/signaling) and a MediaConnection (for audio).
 * - Presence is announced via BroadcastChannel (same browser) + localStorage (same origin).
 * - Includes free TURN servers for cross-NAT connectivity.
 * - Audio elements use playsInline + autoplay for iOS compatibility.
 */
class PeerManager {
  constructor() {
    this.peer = null;
    this.myPeerId = '';
    this.myCallsign = 'Operator-1';
    this.currentRoom = 'alpha1';

    this.activeCalls = {};      // peerId -> MediaConnection
    this.dataConns = {};        // peerId -> DataConnection
    this.connectedPeers = {};   // peerId -> { callsign, status, rtt, joinedAt, lastHeard, isTransmitting }
    this.dialingPeers = {};     // peerId -> boolean (prevents duplicate dial attempts)
    this.audioElements = {};    // peerId -> HTMLAudioElement

    this.isTransmitting = false;
    this.isChannelBusy = false;
    this.currentSpeaker = null;

    this.totTimer = null;
    this.totSecondsLeft = 60;
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
      onChannelBusy: null,
      onTotUpdate: null
    };
  }

  // Sanitize room name — alphanumeric only
  sanitizeRoom(room) {
    return (room || 'alpha1').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'alpha1';
  }

  // Sanitize callsign for embedding in peerId
  sanitizeCallsign(callsign) {
    return (callsign || 'op').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'op';
  }

  /**
   * Build ICE server list with STUN + free public TURN servers.
   * TURN is required when both peers are behind symmetric NAT (e.g., mobile data, corporate Wi-Fi).
   */
  getIceServers() {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Free TURN server from Open Relay Project
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ];
  }

  // Initialize PeerJS with unique ID that encodes room + callsign
  async initPeer(roomName, callsign, localStream, targetPeerId = null) {
    this.currentRoom = this.sanitizeRoom(roomName);
    this.myCallsign = callsign.trim() || 'Operator-1';

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const safeCallsign = this.sanitizeCallsign(this.myCallsign);
    // Format: wt-{room}-{callsign}-{rand}
    this.myPeerId = `wt-${this.currentRoom}-${safeCallsign}-${randomSuffix}`;

    console.log(`[PeerJS] Initializing. PeerID: ${this.myPeerId}`);
    console.log(`[PeerJS] LocalStream tracks:`, localStream ? localStream.getTracks().map(t => `${t.kind}:${t.enabled}`) : 'none');

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(this.myPeerId, {
          debug: 2,
          config: {
            iceServers: this.getIceServers(),
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          }
        });

        const openTimeout = setTimeout(() => {
          reject(new Error('PeerJS broker connection timed out after 15s'));
        }, 15000);

        this.peer.on('open', (id) => {
          clearTimeout(openTimeout);
          console.log('[PeerJS] Connected to broker. My ID:', id);
          this.diagnostics.iceState = 'broker-connected';
          this.setupPeerListeners(localStream);
          this.setupAutoDiscovery(localStream);

          // Real-time Firebase Room Discovery
          if (window.firebaseSignaling) {
            window.firebaseSignaling.joinRoom(this.currentRoom, id, this.myCallsign, (discoveredPeerId) => {
              if (discoveredPeerId && discoveredPeerId !== this.myPeerId) {
                this.dialPeer(discoveredPeerId, localStream);
              }
            });
          }

          // Direct target connection if provided (e.g. from QR link)
          if (targetPeerId && targetPeerId !== this.myPeerId) {
            setTimeout(() => {
              console.log('[Discovery] Dialing target from URL:', targetPeerId);
              this.dialPeer(targetPeerId, localStream);
            }, 800);
          }

          resolve(id);
        });

        this.peer.on('error', (err) => {
          console.warn('[PeerJS Error]:', err.type, err.message);
          this.diagnostics.iceState = 'error: ' + err.type;

          if (err.type === 'peer-unavailable') {
            // Target peer is offline — remove from dialing set, not a fatal error
            const target = err.message.replace('Could not connect to peer ', '').trim();
            delete this.dialingPeers[target];
            delete this.activeCalls[target];
            this.cleanupPeerAudio(target);
            return;
          }

          if (err.type === 'network' || err.type === 'disconnected') {
            // Non-fatal — attempt reconnect
            if (this.peer && !this.peer.destroyed) {
              setTimeout(() => {
                if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
                  this.peer.reconnect();
                }
              }, 3000);
            }
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
      const stream = localStream || (window.audioEngine ? window.audioEngine.processedStream : null);
      call.answer(stream);
      this.handleMediaConnection(call, false);
    });

    // Incoming DataChannel connection
    this.peer.on('connection', (conn) => {
      console.log('[PeerJS] Incoming DataChannel from:', conn.peer);
      this.setupDataConnection(conn);
    });

    this.peer.on('disconnected', () => {
      console.warn('[PeerJS] Disconnected from broker — attempting reconnect in 3s...');
      this.diagnostics.iceState = 'disconnected';
      setTimeout(() => {
        if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      }, 3000);
    });

    this.peer.on('close', () => {
      console.warn('[PeerJS] Peer destroyed.');
      this.diagnostics.iceState = 'closed';
    });
  }

  /**
   * Handle a MediaConnection (both inbound answers and outbound calls share this).
   * @param {MediaConnection} call
   * @param {boolean} isOutbound - true if we initiated this call
   */
  handleMediaConnection(call, isOutbound = false) {
    const remoteId = call.peer;
    this.activeCalls[remoteId] = call;

    call.on('stream', (remoteStream) => {
      console.log('[Audio] Remote stream received from:', remoteId, 'tracks:', remoteStream.getTracks().length);
      this.attachRemoteAudio(remoteId, remoteStream);

      const callsign = this.extractCallsignFromPeerId(remoteId);

      if (!this.connectedPeers[remoteId]) {
        this.connectedPeers[remoteId] = {
          callsign: callsign,
          status: 'Connected',
          rtt: 0,
          joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastHeard: 'Just now',
          isTransmitting: false
        };
        if (window.audioEngine) window.audioEngine.playPeerJoinChime();
      } else {
        this.connectedPeers[remoteId].status = 'Connected';
      }

      delete this.dialingPeers[remoteId];
      this.diagnostics.iceState = 'connected';
      this.notifyPeerListUpdate();
    });

    call.on('close', () => {
      console.log('[Audio] Call closed from:', remoteId);
      this.cleanupPeer(remoteId);
    });

    call.on('error', (e) => {
      console.warn('[Audio] Call error from:', remoteId, e);
      this.cleanupPeer(remoteId);
    });

    // Monitor ICE connection state for diagnostics
    if (call.peerConnection) {
      call.peerConnection.addEventListener('iceconnectionstatechange', () => {
        const state = call.peerConnection.iceConnectionState;
        this.diagnostics.iceState = state;
        console.log('[ICE] State change:', state, 'for peer:', remoteId);

        if (state === 'failed') {
          console.warn('[ICE] Failed — attempting ICE restart');
          try { call.peerConnection.restartIce(); } catch (e) {}
        }

        if (state === 'disconnected') {
          // Give it 5s to recover before cleaning up
          setTimeout(() => {
            if (this.activeCalls[remoteId] && call.peerConnection.iceConnectionState === 'disconnected') {
              this.cleanupPeer(remoteId);
            }
          }, 5000);
        }
      });
    }
  }

  /**
   * Attach a remote stream to an audio element.
   * Uses playsInline for iOS Safari compatibility.
   */
  attachRemoteAudio(peerId, remoteStream) {
    let audio = this.audioElements[peerId];
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'audio-' + peerId;
      audio.setAttribute('playsinline', '');
      audio.setAttribute('autoplay', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.audioElements[peerId] = audio;
    }

    // Mute immediately if peer is blocked
    if (window.profileManager && window.profileManager.isPeerBlocked(peerId)) {
      audio.muted = true;
    }

    // Avoid reassigning same stream (avoids Safari restart glitch)
    if (audio.srcObject !== remoteStream) {
      audio.srcObject = remoteStream;
      // Force play (required on some mobile browsers after user gesture)
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[Audio] Autoplay blocked — retrying on next user gesture:', err);
          document.addEventListener('click', () => { audio.play().catch(() => {}); }, { once: true });
          document.addEventListener('touchstart', () => { audio.play().catch(() => {}); }, { once: true });
        });
      }
    }
  }

  /**
   * Dial out to a peer: create both MediaConnection and DataConnection.
   */
  dialPeer(targetPeerId, localStream) {
    if (!this.peer || this.peer.disconnected || this.peer.destroyed) return;
    if (!targetPeerId || targetPeerId === this.myPeerId) return;
    if (this.activeCalls[targetPeerId] || this.dialingPeers[targetPeerId]) return;

    const stream = localStream || (window.audioEngine ? window.audioEngine.processedStream : null);
    if (!stream) {
      console.warn('[Dial] No local stream available to dial');
      return;
    }

    console.log('[PeerJS] Dialing peer:', targetPeerId);
    this.dialingPeers[targetPeerId] = true;

    try {
      // Audio call
      const call = this.peer.call(targetPeerId, stream, {
        sdpTransform: (sdp) => this.optimizeSdp(sdp)
      });
      if (call) {
        this.handleMediaConnection(call, true);
      } else {
        delete this.dialingPeers[targetPeerId];
      }

      // Data channel
      if (!this.dataConns[targetPeerId]) {
        const conn = this.peer.connect(targetPeerId, {
          reliable: true,
          serialization: 'json'
        });
        if (conn) this.setupDataConnection(conn);
      }

    } catch (err) {
      console.warn('[Dial Error]:', err);
      delete this.dialingPeers[targetPeerId];
    }
  }

  /**
   * Optimize SDP for voice: prefer Opus, set bitrate constraints.
   */
  optimizeSdp(sdp) {
    // Set Opus bitrate to 24kbps for bandwidth efficiency
    return sdp
      .replace(/a=fmtp:111 /g, 'a=fmtp:111 maxaveragebitrate=24000;stereo=0;sprop-stereo=0;useinbandfec=1;')
      .replace(/a=maxptime:\d+/g, 'a=maxptime:60');
  }

  // Setup DataChannel connection (handles both inbound and outbound data connections)
  setupDataConnection(conn) {
    if (this.dataConns[conn.peer]) return; // already connected
    this.dataConns[conn.peer] = conn;

    conn.on('open', () => {
      console.log('[DataChannel] Opened with:', conn.peer);
      delete this.dialingPeers[conn.peer];

      const callsign = this.extractCallsignFromPeerId(conn.peer);
      if (!this.connectedPeers[conn.peer]) {
        this.connectedPeers[conn.peer] = {
          callsign: callsign,
          status: 'Connected',
          rtt: 0,
          joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastHeard: 'Just now',
          isTransmitting: false
        };
        this.notifyPeerListUpdate();
      }

      // Share known peer mesh with the new node so it can connect to others
      setTimeout(() => this.broadcastMeshPeers(), 500);

      // Announce our presence with callsign
      try {
        conn.send({
          type: 'hello',
          callsign: this.myCallsign,
          room: this.currentRoom
        });
      } catch (e) {}
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;
      this.handleDataMessage(conn.peer, data);
    });

    conn.on('close', () => {
      console.log('[DataChannel] Closed with:', conn.peer);
      delete this.dataConns[conn.peer];
      this.cleanupPeer(conn.peer);
    });

    conn.on('error', (err) => {
      console.warn('[DataChannel] Error with:', conn.peer, err);
      delete this.dataConns[conn.peer];
    });
  }

  handleDataMessage(fromPeerId, data) {
    // Ignore all messages from blocked peers
    if (window.profileManager && window.profileManager.isPeerBlocked(fromPeerId)) {
      console.log('[DataChannel] Suppressing message from blocked peer:', fromPeerId);
      return;
    }

    switch (data.type) {
      case 'hello':
        // Update callsign from actual hello message (more reliable than peerId parsing)
        if (this.connectedPeers[fromPeerId] && data.callsign) {
          this.connectedPeers[fromPeerId].callsign = data.callsign;
          this.notifyPeerListUpdate();
        }
        break;

      case 'chat':
        if (this.callbacks.onChatMessage) {
          this.callbacks.onChatMessage(data.sender, data.text, data.timestamp);
        }
        break;

      case 'tx_start':
        if (this.connectedPeers[fromPeerId]) {
          this.connectedPeers[fromPeerId].isTransmitting = true;
          this.connectedPeers[fromPeerId].lastHeard = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        this.isChannelBusy = true;
        this.currentSpeaker = data.sender || this.extractCallsignFromPeerId(fromPeerId);
        if (this.callbacks.onRadioStateChange) {
          this.callbacks.onRadioStateChange('receiving', this.currentSpeaker);
        }
        this.notifyPeerListUpdate();
        break;

      case 'tx_stop':
        if (this.connectedPeers[fromPeerId]) {
          this.connectedPeers[fromPeerId].isTransmitting = false;
        }
        this.isChannelBusy = false;
        this.currentSpeaker = null;
        if (this.callbacks.onRadioStateChange) {
          this.callbacks.onRadioStateChange('standby', null);
        }
        this.notifyPeerListUpdate();
        break;

      case 'peer_mesh_sync':
        // Connect to any peers we don't know about yet
        if (Array.isArray(data.peers)) {
          data.peers.forEach(peerId => {
            if (peerId !== this.myPeerId && !this.activeCalls[peerId] && !this.dialingPeers[peerId]) {
              console.log('[MeshSync] Discovered new peer:', peerId);
              this.dialPeer(peerId, window.audioEngine ? window.audioEngine.processedStream : null);
            }
          });
        }
        break;

      case 'ping':
        // Respond with pong for RTT measurement
        try {
          if (this.dataConns[fromPeerId] && this.dataConns[fromPeerId].open) {
            this.dataConns[fromPeerId].send({ type: 'pong', ts: data.ts });
          }
        } catch (e) {}
        break;

      case 'pong':
        // Calculate RTT
        if (data.ts && this.connectedPeers[fromPeerId]) {
          this.connectedPeers[fromPeerId].rtt = Date.now() - data.ts;
          this.diagnostics.rttMs = this.connectedPeers[fromPeerId].rtt;
        }
        break;
    }
  }

  // Presence Auto-Discovery (BroadcastChannel + localStorage)
  setupAutoDiscovery(localStream) {
    // BroadcastChannel: discovers peers in other tabs of the SAME browser (same origin)
    if ('BroadcastChannel' in window) {
      try {
        if (this.broadcastChannel) this.broadcastChannel.close();
        this.broadcastChannel = new BroadcastChannel(`aethertalk_mesh_${this.currentRoom}`);
        this.broadcastChannel.onmessage = (e) => {
          const data = e.data;
          if (data && data.peerId && data.peerId !== this.myPeerId) {
            if (!this.activeCalls[data.peerId] && !this.dialingPeers[data.peerId]) {
              console.log('[AutoDiscovery] BroadcastChannel peer:', data.peerId);
              this.dialPeer(data.peerId, localStream);
            }
          }
        };
      } catch (e) { console.warn('BroadcastChannel error:', e); }
    }

    // localStorage bus: discovers peers in other windows/tabs of the SAME BROWSER on SAME ORIGIN
    window.addEventListener('storage', (e) => {
      if (e.key === `aethertalk_presence_${this.currentRoom}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data && data.peerId && data.peerId !== this.myPeerId) {
            if (!this.activeCalls[data.peerId] && !this.dialingPeers[data.peerId]) {
              console.log('[AutoDiscovery] StorageBus peer:', data.peerId);
              this.dialPeer(data.peerId, localStream);
            }
          }
        } catch (err) {}
      }
    });

    // Periodic presence announcement + mesh sync every 2.5s
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    this.presenceInterval = setInterval(() => {
      this.announcePresence();
      this.broadcastMeshPeers();
      this.pingAllPeers();
    }, 2500);

    // Initial announcement
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

  pingAllPeers() {
    for (const peerId in this.dataConns) {
      try {
        if (this.dataConns[peerId] && this.dataConns[peerId].open) {
          this.dataConns[peerId].send({ type: 'ping', ts: Date.now() });
        }
      } catch (e) {}
    }
  }

  // Start Transmission (PTT Pressed)
  startTransmission() {
    if (this.isChannelBusy && !this.isTransmitting) {
      if (this.callbacks.onChannelBusy) {
        this.callbacks.onChannelBusy(this.currentSpeaker);
      }
      return false;
    }

    this.isTransmitting = true;
    this.diagnostics.packetsSent++;

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

  // Time-Out-Timer (auto-release after 60s)
  startTotTimer() {
    this.stopTotTimer();
    this.totSecondsLeft = 60;

    this.totTimer = setInterval(() => {
      this.totSecondsLeft--;
      if (this.callbacks.onTotUpdate) this.callbacks.onTotUpdate(this.totSecondsLeft);

      if (this.totSecondsLeft <= 0) {
        console.warn('[TOT] 60s limit reached — auto-releasing transmission');
        this.stopTransmission();
      }
    }, 1000);
  }

  stopTotTimer() {
    if (this.totTimer) {
      clearInterval(this.totTimer);
      this.totTimer = null;
    }
    if (this.callbacks.onTotUpdate) this.callbacks.onTotUpdate(null);
  }

  // Send DataChannel chat message
  sendChatMessage(text) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payload = { type: 'chat', sender: this.myCallsign, text, timestamp };
    this.broadcastData(payload);
    return payload;
  }

  broadcastData(data) {
    let sent = 0;
    for (const peerId in this.dataConns) {
      try {
        if (this.dataConns[peerId] && this.dataConns[peerId].open) {
          this.dataConns[peerId].send(data);
          sent++;
        }
      } catch (e) {
        console.warn('[DataBroadcast] Error sending to', peerId, e);
      }
    }
    return sent;
  }

  /**
   * Extract human-readable callsign from peer ID.
   * Format: wt-{room}-{callsign}-{rand5}
   *   e.g.  wt-alpha1-operator1-ab3cd
   */
  extractCallsignFromPeerId(peerId) {
    if (!peerId) return 'Operator';
    const parts = peerId.split('-');
    // parts[0] = 'wt', parts[1] = room, parts[2] = callsign (maybe), parts[3] = rand
    if (parts.length >= 4) {
      // callsign is parts[2], capitalize first letter
      const cs = parts[2];
      return cs.charAt(0).toUpperCase() + cs.slice(1);
    }
    if (parts.length === 3) return parts[2]; // legacy format
    return 'Operator';
  }

  cleanupPeerAudio(peerId) {
    const audio = this.audioElements[peerId];
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      delete this.audioElements[peerId];
    }
  }

  cleanupPeer(peerId) {
    delete this.activeCalls[peerId];
    delete this.dataConns[peerId];
    delete this.dialingPeers[peerId];

    const wasConnected = !!this.connectedPeers[peerId];
    if (wasConnected) {
      delete this.connectedPeers[peerId];
      if (window.audioEngine) window.audioEngine.playPeerLeaveChime();
    }

    this.cleanupPeerAudio(peerId);

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
    if (window.firebaseSignaling) {
      window.firebaseSignaling.leaveRoom();
    }
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    if (this.broadcastChannel) { try { this.broadcastChannel.close(); } catch (e) {} }

    // Clean up all audio elements
    for (const peerId in this.audioElements) this.cleanupPeerAudio(peerId);

    this.stopTotTimer();
    this.isTransmitting = false;
    this.isChannelBusy = false;

    if (this.peer && !this.peer.destroyed) {
      try { this.peer.destroy(); } catch (e) {}
    }

    this.activeCalls = {};
    this.dataConns = {};
    this.connectedPeers = {};
    this.dialingPeers = {};
  }
}

window.peerManager = new PeerManager();
