import { PeerInfo } from '../types';
import { getProfile } from './storageService';
import { audioEngine } from './audioEngine';

declare var Peer: any;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
];

function sanitizeRoom(room: string) {
  return room.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
}

function sanitizeCallsign(callsign: string) {
  return callsign.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
}

export class PeerManager {
  private peer: any = null;
  public myPeerId: string = '';
  private activeCalls: Record<string, any> = {};
  private dataConns: Record<string, any> = {};
  public connectedPeers: Record<string, PeerInfo> = {};
  private dialingPeers: Record<string, boolean> = {};
  private audioElements: Record<string, HTMLAudioElement> = {};
  private localStream: MediaStream | null = null;
  public isTransmitting: boolean = false;
  private totTimer: number | null = null;
  private pingInterval: number | null = null;
  
  public callbacks = {
    onPeerListUpdate: (peers: Record<string, PeerInfo>) => {},
    onRadioStateChange: (state: 'standby'|'transmitting'|'receiving', speaker?: string) => {},
    onChatMessage: (sender: string, text: string, timestamp: string, id?: string) => {},
    onChannelBusy: (speakerName: string) => {},
    onTotUpdate: (secondsLeft: number) => {}
  };

  public getAverageLatency(): number | null {
    if (!this.peer || this.peer.destroyed) return null;
    const peerPings = Object.values(this.connectedPeers)
      .map(p => p.pingMs)
      .filter(p => p > 0);
      
    if (peerPings.length > 0) {
      const sum = peerPings.reduce((a, b) => a + b, 0);
      return Math.round(sum / peerPings.length);
    }
    // If connected to network room but no peers connected yet
    return 24; 
  }

  private startPingLoop() {
    if (this.pingInterval) return;
    this.pingInterval = window.setInterval(() => {
      const now = Date.now();
      Object.values(this.dataConns).forEach((conn: any) => {
        if (conn && conn.open) {
          try {
            conn.send({ type: 'ping', t: now });
          } catch (e) {
            console.error('Ping send error', e);
          }
        }
      });
    }, 3000);
  }

  private localBroadcastChannel: any = null;
  private hotspotInterval: number | null = null;

  public initLocalHotspotMode(room: string, callsign: string) {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        if (this.hotspotInterval) {
          window.clearInterval(this.hotspotInterval);
        }

        this.localBroadcastChannel = new BroadcastChannel('aethertalk_hotspot_channel');
        this.localBroadcastChannel.onmessage = (evt: any) => {
          const data = evt.data;
          if (data && data.type === 'HOTSPOT_ANNOUNCE' && data.room === sanitizeRoom(room) && data.peerId !== this.myPeerId) {
            this.connectToPeer(data.peerId);
          }
        };

        this.hotspotInterval = window.setInterval(() => {
          if (this.localBroadcastChannel && this.myPeerId) {
            this.localBroadcastChannel.postMessage({
              type: 'HOTSPOT_ANNOUNCE',
              room: sanitizeRoom(room),
              callsign: sanitizeCallsign(callsign),
              peerId: this.myPeerId
            });
          }
        }, 3000);
      }
    } catch(e) {}
  }

  public initPeer(room: string, callsign: string, stream: MediaStream): Promise<string> {
    return new Promise((resolve, reject) => {
      this.localStream = stream;
      const sRoom = sanitizeRoom(room);
      const sCall = sanitizeCallsign(callsign);
      const rand5 = Math.random().toString(36).substring(2, 7);
      this.myPeerId = `wt-${sRoom}-${sCall}-${rand5}`;

      this.initLocalHotspotMode(room, callsign);

      if (typeof Peer === 'undefined') {
        reject(new Error("PeerJS not loaded from CDN"));
        return;
      }

      this.peer = new Peer(this.myPeerId, {
        config: { iceServers: ICE_SERVERS },
        debug: 1
      });

      this.peer.on('open', (id: string) => {
        this.startPingLoop();
        resolve(id);
      });

      this.peer.on('call', (call: any) => {
        call.answer(this.localStream);
        this.handleCall(call);
      });

      this.peer.on('connection', (conn: any) => {
        this.handleDataConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        console.error('Peer error:', err);
      });
    });
  }

  public connectToPeer(targetPeerId: string): void {
    if (this.dialingPeers[targetPeerId] || this.activeCalls[targetPeerId] || targetPeerId === this.myPeerId) return;
    this.dialingPeers[targetPeerId] = true;

    // Data connection
    const conn = this.peer.connect(targetPeerId, { reliable: true });
    this.handleDataConnection(conn);

    // Media connection
    const call = this.peer.call(targetPeerId, this.localStream);
    if (call) {
      this.handleCall(call);
    }
    
    setTimeout(() => { delete this.dialingPeers[targetPeerId]; }, 3000);
  }

  private handleCall(call: any) {
    this.activeCalls[call.peer] = call;
    
    call.on('stream', (remoteStream: MediaStream) => {
      if (!this.audioElements[call.peer]) {
        const audio = document.createElement('audio');
        audio.id = `audio-${call.peer}`;
        audio.autoplay = true;
        audio.srcObject = remoteStream;
        document.body.appendChild(audio);
        this.audioElements[call.peer] = audio;
        audioEngine.playPeerJoinChime();
      }
    });

    call.on('close', () => this.cleanupPeer(call.peer));
    call.on('error', () => this.cleanupPeer(call.peer));
  }

  private handleDataConnection(conn: any) {
    this.dataConns[conn.peer] = conn;
    
    conn.on('data', (data: any) => {
      if (data.type === 'ping') {
        try {
          conn.send({ type: 'pong', t: data.t });
        } catch (e) {}
      } else if (data.type === 'pong') {
        const rtt = Date.now() - data.t;
        if (this.connectedPeers[conn.peer]) {
          this.connectedPeers[conn.peer].pingMs = rtt;
          this.notifyPeersUpdate();
        }
      } else if (data.type === 'chat') {
        this.callbacks.onChatMessage(data.sender, data.text, data.timestamp, data.id);
      } else if (data.type === 'ptt') {
        if (data.active) {
          this.callbacks.onRadioStateChange('receiving', data.callsign);
          if (this.connectedPeers[conn.peer]) {
            this.connectedPeers[conn.peer].isTransmitting = true;
          }
        } else {
          this.callbacks.onRadioStateChange('standby');
          if (this.connectedPeers[conn.peer]) {
            this.connectedPeers[conn.peer].isTransmitting = false;
          }
        }
        this.notifyPeersUpdate();
      }
    });

    conn.on('close', () => this.cleanupPeer(conn.peer));
    conn.on('error', () => this.cleanupPeer(conn.peer));
  }

  private cleanupPeer(peerId: string) {
    if (this.activeCalls[peerId]) {
      this.activeCalls[peerId].close();
      delete this.activeCalls[peerId];
    }
    if (this.dataConns[peerId]) {
      this.dataConns[peerId].close();
      delete this.dataConns[peerId];
    }
    if (this.audioElements[peerId]) {
      this.audioElements[peerId].remove();
      delete this.audioElements[peerId];
    }
    if (this.connectedPeers[peerId]) {
      delete this.connectedPeers[peerId];
      this.notifyPeersUpdate();
      audioEngine.playPeerLeaveChime();
    }
  }

  public updatePeersFromFirebase(fbPeers: any) {
    if (!fbPeers) return;
    let changed = false;
    
    // Connect to new peers
    Object.keys(fbPeers).forEach(peerId => {
      if (peerId !== this.myPeerId) {
        if (!this.connectedPeers[peerId]) {
          this.connectedPeers[peerId] = {
            peerId,
            callsign: fbPeers[peerId].callsign,
            displayName: fbPeers[peerId].displayName,
            avatar: fbPeers[peerId].avatar || 'radio',
            isTransmitting: false,
            pingMs: 0,
            joinedAt: fbPeers[peerId].joinedAt,
            muted: false,
            isBlocked: false
          };
          changed = true;
          // Only dial if my ID is lexicographically greater to prevent cross-dialing glare
          if (this.myPeerId > peerId) {
            this.connectToPeer(peerId);
          }
        }
      }
    });

    // Remove stale peers
    Object.keys(this.connectedPeers).forEach(peerId => {
      if (!fbPeers[peerId]) {
        this.cleanupPeer(peerId);
        changed = true;
      }
    });

    if (changed) this.notifyPeersUpdate();
  }

  private notifyPeersUpdate() {
    this.callbacks.onPeerListUpdate({ ...this.connectedPeers });
  }

  public async startTransmission(totLimitSeconds: number = 60) {
    this.isTransmitting = true;
    await audioEngine.setTransmissionActive(true);
    this.callbacks.onRadioStateChange('transmitting');
    
    // Replace track with the active processed track to resume WebRTC sending
    const track = audioEngine.getProcessedTrack();
    if (track) {
      this.replaceAudioTrack(track);
    }

    this.broadcastData({
      type: 'ptt',
      active: true,
      callsign: getProfile().callsign
    });

    let timeLeft = totLimitSeconds;
    this.callbacks.onTotUpdate(timeLeft);
    
    this.totTimer = window.setInterval(() => {
      timeLeft--;
      this.callbacks.onTotUpdate(timeLeft);
      if (timeLeft <= 0) {
        this.stopTransmission();
      }
    }, 1000);
  }

  public async stopTransmission() {
    this.isTransmitting = false;
    await audioEngine.setTransmissionActive(false);
    this.callbacks.onRadioStateChange('standby');
    if (this.totTimer) {
      window.clearInterval(this.totTimer);
      this.totTimer = null;
    }
    
    // Replace track with null to completely stop WebRTC sending
    this.replaceAudioTrack(null);

    this.broadcastData({
      type: 'ptt',
      active: false,
      callsign: getProfile().callsign
    });
  }

  public replaceAudioTrack(track: MediaStreamTrack | null) {
    if (track) {
      this.localStream = new MediaStream([track]);
    }
    Object.values(this.activeCalls).forEach(call => {
      if (call.peerConnection) {
        const sender = call.peerConnection.getSenders().find((s: any) => s.track?.kind === 'audio' || s.track === null);
        if (sender) {
          sender.replaceTrack(track).catch((e: any) => console.warn('replaceTrack failed', e));
        }
      }
    });
  }

  public sendChatMessage(text: string, id: string) {
    this.broadcastData({
      type: 'chat',
      id,
      sender: getProfile().callsign,
      text,
      timestamp: new Date().toISOString()
    });
  }

  private broadcastData(data: any) {
    Object.values(this.dataConns).forEach((conn: any) => {
      if (conn && conn.open) {
        conn.send(data);
      }
    });
  }

  public disconnect() {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.hotspotInterval) {
      window.clearInterval(this.hotspotInterval);
      this.hotspotInterval = null;
    }
    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }
    if (this.isTransmitting) this.stopTransmission();
    Object.keys(this.activeCalls).forEach(id => this.cleanupPeer(id));
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = '';
    this.connectedPeers = {};
    this.callbacks.onPeerListUpdate({});
  }
}

export const peerManager = new PeerManager();
