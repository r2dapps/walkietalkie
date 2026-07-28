/**
 * App - Main Orchestrator for AetherTalk Tactical Walkie Talkie PWA.
 */
class App {
  constructor() {
    this.currentRoom = 'alpha-1';
    this.myCallsign = 'Operator-1';
    this.localStream = null;
    this.isJoined = false;
  }

  async init() {
    console.log('Initializing AetherTalk PWA...');

    // 1. Init UI & Storage
    window.uiController.init();
    window.pwaManager.init();

    // 2. Load stored parameters or parse URL Hash
    const savedCallsign = window.storageManager.getCallsign();
    const savedChannel = window.storageManager.getLastChannel();
    const hashParams = window.shareManager.parseUrlHash();

    this.currentRoom = hashParams?.room || savedChannel || 'alpha-1';
    this.myCallsign = hashParams?.callsign || savedCallsign || 'Operator-1';

    if (window.uiController.elements.roomInput) {
      window.uiController.elements.roomInput.value = this.currentRoom;
    }
    if (window.uiController.elements.callsignInput) {
      window.uiController.elements.callsignInput.value = this.myCallsign;
    }

    // Init canvas visualizer
    const canvas = document.getElementById('audioCanvas');
    if (canvas) window.visualizer.init(canvas);

    // Setup Peer Manager Callbacks
    window.peerManager.callbacks.onPeerListUpdate = (peersMap) => {
      window.uiController.updatePeerListUI(peersMap);
    };

    window.peerManager.callbacks.onRadioStateChange = (state, speakerName) => {
      window.uiController.setRadioState(state, speakerName);
    };

    window.peerManager.callbacks.onChatMessage = (sender, text, timestamp) => {
      window.uiController.appendChatMessage(sender, text, timestamp, false);
    };

    window.peerManager.callbacks.onChannelBusy = (speakerName) => {
      alert(`Channel frequency occupied by ${speakerName || 'another operator'}. Standby!`);
    };

    // Auto-join if hash room was specified in URL
    if (hashParams?.room) {
      this.joinFrequency();
    }
  }

  // Join Radio Frequency Channel
  async joinFrequency() {
    const roomVal = window.uiController.elements.roomInput.value.trim();
    const callsignVal = window.uiController.elements.callsignInput.value.trim();

    if (!roomVal) {
      alert('Please enter a valid channel frequency.');
      return;
    }

    this.currentRoom = roomVal.toLowerCase();
    this.myCallsign = callsignVal || 'Operator-1';

    // Persist
    window.storageManager.setLastChannel(this.currentRoom);
    window.storageManager.setCallsign(this.myCallsign);

    const joinBtn = window.uiController.elements.joinBtn;
    if (joinBtn) {
      joinBtn.disabled = true;
      joinBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Initializing Radio...`;
    }

    try {
      // 1. Get Microphone stream
      this.localStream = await window.audioEngine.getMicrophoneStream();

      // 2. Connect WebRTC PeerJS
      await window.peerManager.initPeer(this.currentRoom, this.myCallsign, this.localStream);

      // 3. Update UI Views
      window.uiController.elements.setupView.classList.add('hidden');
      window.uiController.elements.radioView.classList.remove('hidden');

      if (window.uiController.elements.activeChannelDisplay) {
        window.uiController.elements.activeChannelDisplay.innerText = `#${this.currentRoom}`;
      }
      if (window.uiController.elements.channelFreqDisplay) {
        window.uiController.elements.channelFreqDisplay.innerText = `FREQ: 146.520 (${this.currentRoom.toUpperCase()})`;
      }

      if (window.uiController.elements.connectionBadge) {
        window.uiController.elements.connectionBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Connected
        `;
        window.uiController.elements.connectionBadge.className = 'text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5';
      }

      this.isJoined = true;
      console.log('Joined frequency successfully:', this.currentRoom);

    } catch (err) {
      console.error('Failed to join channel:', err);
      alert('Could not establish radio connection. Check microphone permissions.');
      this.resetUI();
    }
  }

  // PTT Trigger
  startPTT() {
    if (!this.isJoined || !this.localStream) return;
    window.peerManager.startTransmission(this.localStream);
  }

  stopPTT() {
    if (!this.isJoined) return;
    window.peerManager.stopTransmission();
  }

  // Call Specific Peer Directly
  callPeerDirectly(peerId) {
    if (!this.localStream) return;
    window.peerManager.callPeer(peerId, this.localStream);
    window.uiController.closeModal('peersModal');
  }

  // Switch channel directly
  switchChannel(newChannel) {
    if (this.currentRoom === newChannel && this.isJoined) return;
    this.leaveFrequency();
    if (window.uiController.elements.roomInput) {
      window.uiController.elements.roomInput.value = newChannel;
    }
    this.joinFrequency();
  }

  // Leave / Disconnect Frequency
  leaveFrequency() {
    window.peerManager.disconnect();
    this.isJoined = false;
    this.resetUI();
  }

  resetUI() {
    const joinBtn = window.uiController.elements.joinBtn;
    if (joinBtn) {
      joinBtn.disabled = false;
      joinBtn.innerHTML = `<i class="fa-solid fa-tower-broadcast"></i> Establish Frequency`;
    }
    if (window.uiController.elements.setupView) {
      window.uiController.elements.setupView.classList.remove('hidden');
    }
    if (window.uiController.elements.radioView) {
      window.uiController.elements.radioView.classList.add('hidden');
    }
    if (window.uiController.elements.connectionBadge) {
      window.uiController.elements.connectionBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-400"></span> Offline
      `;
      window.uiController.elements.connectionBadge.className = 'text-[11px] text-amber-400 font-medium flex items-center gap-1.5';
    }
  }

  // Send Tactical Text Chat
  sendChat() {
    const input = window.uiController.elements.chatInput;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const payload = window.peerManager.sendChatMessage(text);
    window.uiController.appendChatMessage(this.myCallsign, text, payload.timestamp, true);
    input.value = '';
  }

  // Open Share QR Modal
  openShareModal() {
    const qrContainer = window.uiController.elements.qrContainer;
    const shareUrlInput = window.uiController.elements.shareUrlInput;
    const url = window.shareManager.getShareableUrl(this.currentRoom);

    if (qrContainer) {
      qrContainer.innerHTML = window.shareManager.generateQrSvg(url);
    }
    if (shareUrlInput) {
      shareUrlInput.value = url;
    }
    window.uiController.openModal('shareModal');
  }

  // Copy Share Link helper
  async copyShareLink() {
    const success = await window.shareManager.copyInviteLink(this.currentRoom);
    if (success) alert('Invite link copied to clipboard!');
  }

  // Native Mobile Share helper
  async shareNative() {
    await window.shareManager.shareNative(this.currentRoom);
  }

  // Add Current Channel to Favorites
  addCurrentToFavorites() {
    window.storageManager.addFavorite(this.currentRoom);
    window.uiController.loadFavoritesUI();
    alert(`Channel #${this.currentRoom} added to favorites!`);
  }
}

// Instantiate Global App
window.app = new App();

// Document Ready Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
