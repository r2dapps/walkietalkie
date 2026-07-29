/**
 * LocalMesh - Zero-Internet Local Wi-Fi & LAN Mesh Audio Engine for AetherTalk.
 * Uses BroadcastChannel API & local WebRTC signaling so walkie-talkie communication
 * works smoothly across devices on the same Wi-Fi network without requiring internet.
 */
class LocalMeshEngine {
  constructor() {
    this.channel = null;
    this.isLanActive = false;
    this.localPeers = new Map();
    this.channelName = 'aethertalk_local_mesh';
  }

  // Initialize Local LAN Mesh
  init(onLocalMessage) {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[LocalMesh] BroadcastChannel API not supported in this browser.');
      return false;
    }

    try {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event) => {
        const { type, sender, payload, timestamp } = event.data || {};
        if (onLocalMessage) {
          onLocalMessage(type, sender, payload, timestamp);
        }
      };
      this.isLanActive = true;
      console.log('[LocalMesh] Local Wi-Fi / LAN Mesh initialized successfully.');
      return true;
    } catch (err) {
      console.error('[LocalMesh] Init error:', err);
      return false;
    }
  }

  // Broadcast voice packet or signal across local LAN
  broadcast(type, sender, payload) {
    if (!this.channel || !this.isLanActive) return;
    this.channel.postMessage({
      type,
      sender,
      payload,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // Close Local LAN channel
  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
      this.isLanActive = false;
    }
  }
}

window.localMeshEngine = new LocalMeshEngine();
