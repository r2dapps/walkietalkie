/**
 * UIController - Tactical UI state manager, Modals, NATO Helper, & Diagnostics Panel.
 */
class UIController {
  constructor() {
    this.elements = {};
    this.unreadMessagesCount = 0;
  }

  init() {
    this.cacheDOMElements();
    this.bindEvents();
    this.loadFavoritesUI();
    this.renderNatoHelper();
  }

  cacheDOMElements() {
    this.elements = {
      // Views
      setupView: document.getElementById('setupView'),
      radioView: document.getElementById('radioView'),

      // Inputs
      roomInput: document.getElementById('roomInput'),
      callsignInput: document.getElementById('callsignInput'),
      joinBtn: document.getElementById('joinBtn'),
      activeChannelDisplay: document.getElementById('activeChannelDisplay'),
      channelFreqDisplay: document.getElementById('channelFreqDisplay'),

      // Status Badges & LEDs
      connectionBadge: document.getElementById('connectionBadge'),
      ledTx: document.getElementById('ledTx'),
      ledRx: document.getElementById('ledRx'),
      ledBat: document.getElementById('ledBat'),

      // PTT & Radio Controls
      pttButton: document.getElementById('pttButton'),
      audioCanvas: document.getElementById('audioCanvas'),
      radioStateTitle: document.getElementById('radioStateTitle'),
      radioSubtext: document.getElementById('radioSubtext'),
      voxToggleBtn: document.getElementById('voxToggleBtn'),
      totTimerDisplay: document.getElementById('totTimerDisplay'),

      // Modals
      peersModal: document.getElementById('peersModal'),
      chatModal: document.getElementById('chatModal'),
      shareModal: document.getElementById('shareModal'),
      settingsModal: document.getElementById('settingsModal'),
      diagnosticsModal: document.getElementById('diagnosticsModal'),

      // Modal Triggers & Badges
      peerCountBadge: document.getElementById('peerCountBadge'),
      modalPeerCount: document.getElementById('modalPeerCount'),
      peersListContainer: document.getElementById('peersListContainer'),
      unreadChatBadge: document.getElementById('unreadChatBadge'),
      chatMessagesContainer: document.getElementById('chatMessagesContainer'),
      chatInput: document.getElementById('chatInput'),

      // QR Share
      qrContainer: document.getElementById('qrContainer'),
      shareUrlInput: document.getElementById('shareUrlInput'),

      // Presets
      presetsContainer: document.getElementById('presetsContainer'),
      favoritesList: document.getElementById('favoritesList'),

      // Settings Controls
      eqSelect: document.getElementById('eqSelect'),
      rogerBeepToggle: document.getElementById('rogerBeepToggle'),
      squelchToggle: document.getElementById('squelchToggle'),

      // Diagnostics
      diagRtt: document.getElementById('diagRtt'),
      diagIce: document.getElementById('diagIce'),
      diagCodec: document.getElementById('diagCodec'),
      diagPackets: document.getElementById('diagPackets'),
      diagAudioCtx: document.getElementById('diagAudioCtx')
    };
  }

  bindEvents() {
    // Presets click events
    document.querySelectorAll('.channel-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const channel = e.currentTarget.dataset.channel;
        if (channel && this.elements.roomInput) {
          this.elements.roomInput.value = channel;
        }
      });
    });

    // PTT Touch & Mouse events
    const ptt = this.elements.pttButton;
    if (ptt) {
      const handlePress = (e) => {
        e.preventDefault();
        window.app.startPTT();
      };
      const handleRelease = (e) => {
        e.preventDefault();
        window.app.stopPTT();
      };

      ptt.addEventListener('mousedown', handlePress);
      ptt.addEventListener('mouseup', handleRelease);
      ptt.addEventListener('mouseleave', handleRelease);
      ptt.addEventListener('touchstart', handlePress);
      ptt.addEventListener('touchend', handleRelease);
    }

    // Keyboard Spacebar PTT shortcut
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        window.app.startPTT();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        window.app.stopPTT();
      }
    });
  }

  // Modal handlers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      if (modalId === 'chatModal') {
        this.unreadMessagesCount = 0;
        if (this.elements.unreadChatBadge) this.elements.unreadChatBadge.classList.add('hidden');
      } else if (modalId === 'diagnosticsModal') {
        this.updateDiagnosticsUI();
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  // Update Radio Visual State (Standby / Transmitting / Receiving)
  setRadioState(state, speakerName = null) {
    const ptt = this.elements.pttButton;
    const title = this.elements.radioStateTitle;
    const subtext = this.elements.radioSubtext;
    const ledTx = this.elements.ledTx;
    const ledRx = this.elements.ledRx;

    if (window.visualizer) window.visualizer.setAudioState(state);

    if (state === 'transmitting') {
      if (ptt) ptt.className = 'w-36 h-36 rounded-full border-4 text-white flex flex-col items-center justify-center ptt-transmitting transition-all duration-75 select-none touch-none shadow-2xl';
      if (title) {
        title.innerText = 'TRANSMITTING VOICE...';
        title.className = 'text-sm font-extrabold text-rose-500 animate-pulse';
      }
      if (subtext) subtext.innerText = 'Broadcasting signal to frequency mesh...';
      if (ledTx) ledTx.className = 'led-indicator led-tx-active';
      if (ledRx) ledRx.className = 'led-indicator led-off';

      if (window.storageManager.getAppSettings().haptics && navigator.vibrate) {
        navigator.vibrate([30]);
      }

    } else if (state === 'receiving') {
      if (ptt) ptt.className = 'w-36 h-36 rounded-full border-4 text-white flex flex-col items-center justify-center ptt-receiving transition-all duration-75 select-none touch-none shadow-2xl';
      if (title) {
        title.innerText = `${(speakerName || 'OPERATOR').toUpperCase()} TRANSMITTING`;
        title.className = 'text-sm font-extrabold text-emerald-400 animate-pulse';
      }
      if (subtext) subtext.innerText = 'Receiving voice audio stream...';
      if (ledTx) ledTx.className = 'led-indicator led-off';
      if (ledRx) ledRx.className = 'led-indicator led-rx-active';

    } else {
      // Standby
      if (ptt) ptt.className = 'w-36 h-36 rounded-full bg-gradient-to-b from-rose-600 to-rose-800 border-4 border-rose-400/40 text-white flex flex-col items-center justify-center shadow-2xl shadow-rose-600/40 active:scale-95 transition-all duration-75 select-none touch-none';
      if (title) {
        title.innerText = 'STANDBY';
        title.className = 'text-sm font-bold text-slate-300';
      }
      if (subtext) subtext.innerText = 'Hold PTT button or use Spacebar to speak';
      if (ledTx) ledTx.className = 'led-indicator led-off';
      if (ledRx) ledRx.className = 'led-indicator led-off';
    }
  }

  // Render Connected Peer List Modal
  updatePeerListUI(peersMap) {
    const count = Object.keys(peersMap).length;
    if (this.elements.peerCountBadge) this.elements.peerCountBadge.innerText = count;
    if (this.elements.modalPeerCount) this.elements.modalPeerCount.innerText = count;

    if (!this.elements.peersListContainer) return;

    if (count === 0) {
      this.elements.peersListContainer.innerHTML = `
        <div class="text-center py-6 text-xs text-slate-500">
          No other operators on frequency. Tap "Share Link & QR" to invite peers!
        </div>
      `;
      return;
    }

    let html = '';
    for (const [id, peerData] of Object.entries(peersMap)) {
      html += `
        <div class="py-3 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-400 text-xs font-bold shadow">
              <i class="fa-solid fa-walkie-talkie"></i>
            </div>
            <div>
              <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                ${peerData.callsign}
                ${peerData.isTransmitting ? '<span class="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-mono animate-pulse">TX</span>' : ''}
              </h4>
              <p class="text-[10px] text-slate-400 font-mono">
                RTT: <span class="text-emerald-400">${peerData.rtt}ms</span> | Joined: ${peerData.joinedAt}
              </p>
            </div>
          </div>
          <button onclick="window.app.callPeerDirectly('${id}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl border border-slate-700 transition">
            Direct Line
          </button>
        </div>
      `;
    }
    this.elements.peersListContainer.innerHTML = html;
  }

  // Append Chat Message
  appendChatMessage(sender, text, timestamp, isSelf = false) {
    if (!this.elements.chatMessagesContainer) return;

    const div = document.createElement('div');
    div.className = `p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1`;
    div.innerHTML = `
      <div class="flex justify-between items-center text-[10px]">
        <span class="font-bold ${isSelf ? 'text-rose-400' : 'text-cyan-400'}">${sender}</span>
        <span class="text-slate-500 font-mono">${timestamp}</span>
      </div>
      <p class="text-xs text-slate-200 break-words">${text}</p>
    `;

    this.elements.chatMessagesContainer.appendChild(div);
    this.elements.chatMessagesContainer.scrollTop = this.elements.chatMessagesContainer.scrollHeight;

    if (!isSelf && document.getElementById('chatModal').classList.contains('hidden')) {
      this.unreadMessagesCount++;
      if (this.elements.unreadChatBadge) {
        this.elements.unreadChatBadge.innerText = this.unreadMessagesCount;
        this.elements.unreadChatBadge.classList.remove('hidden');
      }
    }
  }

  // Render NATO Phonetic Alphabet Quick Ref
  renderNatoHelper() {
    const container = document.getElementById('natoContainer');
    if (!container) return;

    const alphabet = [
      ['A', 'Alpha'], ['B', 'Bravo'], ['C', 'Charlie'], ['D', 'Delta'],
      ['E', 'Echo'], ['F', 'Foxtrot'], ['G', 'Golf'], ['H', 'Hotel'],
      ['I', 'India'], ['J', 'Juliet'], ['K', 'Kilo'], ['L', 'Lima'],
      ['M', 'Mike'], ['N', 'November'], ['O', 'Oscar'], ['P', 'Papa'],
      ['Q', 'Quebec'], ['R', 'Romeo'], ['S', 'Sierra'], ['T', 'Tango'],
      ['U', 'Uniform'], ['V', 'Victor'], ['W', 'Whiskey'], ['X', 'Xray'],
      ['Y', 'Yankee'], ['Z', 'Zulu']
    ];

    container.innerHTML = alphabet.map(([letter, code]) => `
      <button onclick="window.uiController.insertNatoText('${code}')" class="p-2 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-left transition group">
        <span class="text-xs font-bold text-cyan-400 group-hover:text-cyan-300">${letter}</span>
        <span class="text-[11px] text-slate-300 block">${code}</span>
      </button>
    `).join('');
  }

  insertNatoText(word) {
    if (this.elements.chatInput) {
      this.elements.chatInput.value += (this.elements.chatInput.value ? ' ' : '') + word.toUpperCase();
      this.elements.chatInput.focus();
    }
  }

  // Render Favorites UI
  loadFavoritesUI() {
    if (!this.elements.favoritesList) return;
    const favs = window.storageManager.getFavorites();

    this.elements.favoritesList.innerHTML = favs.map(channel => `
      <button onclick="window.app.switchChannel('${channel}')" class="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5">
        <i class="fa-solid fa-star text-amber-400 text-[10px]"></i> #${channel}
      </button>
    `).join('');
  }

  // Diagnostics Panel Refresh
  updateDiagnosticsUI() {
    const stats = window.peerManager.diagnostics;
    if (this.elements.diagRtt) this.elements.diagRtt.innerText = `${stats.rttMs} ms`;
    if (this.elements.diagIce) this.elements.diagIce.innerText = stats.iceState;
    if (this.elements.diagCodec) this.elements.diagCodec.innerText = stats.codec;
    if (this.elements.diagPackets) this.elements.diagPackets.innerText = `${stats.packetsSent} sent`;
    if (this.elements.diagAudioCtx) {
      const state = window.audioEngine && window.audioEngine.ctx ? window.audioEngine.ctx.state : 'uninitialized';
      this.elements.diagAudioCtx.innerText = state;
    }
  }
}

window.uiController = new UIController();
