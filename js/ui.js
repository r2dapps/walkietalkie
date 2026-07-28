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

    // Live Callsign Syncing across Setup view and Profile view
    const setupCallsign = this.elements.callsignInput;
    const profileCallsign = document.getElementById('profileCallsignInput');
    
    if (setupCallsign) {
      setupCallsign.addEventListener('input', (e) => {
        const val = e.target.value;
        if (profileCallsign && profileCallsign.value !== val) profileCallsign.value = val;
        if (window.profileManager) window.profileManager.saveProfile({ callsign: val });
      });
    }
    if (profileCallsign) {
      profileCallsign.addEventListener('input', (e) => {
        const val = e.target.value;
        if (setupCallsign && setupCallsign.value !== val) setupCallsign.value = val;
        if (window.profileManager) window.profileManager.saveProfile({ callsign: val });
      });
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
      const isBlocked = window.profileManager && window.profileManager.isPeerBlocked(id);
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
                ${isBlocked ? '<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">BLOCKED</span>' : ''}
              </h4>
              <p class="text-[10px] text-slate-400 font-mono">
                RTT: <span class="text-emerald-400">${peerData.rtt}ms</span> | Joined: ${peerData.joinedAt}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="window.uiController.copyToClipboard('${id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] font-bold rounded-xl border border-slate-700 transition flex items-center gap-1">
              <i class="fa-regular fa-copy"></i> Copy ID
            </button>
            ${isBlocked ? `
              <button onclick="window.profileManager.unblockPeer('${id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-bold rounded-xl border border-slate-700 transition">
                Unblock
              </button>
            ` : `
              <button onclick="window.profileManager.blockPeer('${id}', '${peerData.callsign}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-[10px] font-bold rounded-xl border border-slate-700 transition">
                Block
              </button>
            `}
          </div>
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

  // Render Custom Presets UI
  loadCustomPresetsUI() {
    const listContainer = document.getElementById('customPresetsList');
    if (!listContainer) return;

    const presets = window.storageManager.getCustomPresets();
    if (!presets || presets.length === 0) {
      listContainer.innerHTML = `<span class="text-slate-500 text-xs italic">No saved presets. Click "+ Add Preset" to create one!</span>`;
      return;
    }

    listContainer.innerHTML = presets.map(p => `
      <div class="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1.5 transition">
        <button type="button" onclick="window.uiController.connectToPreset('${p.id}')" class="text-xs font-bold text-slate-200 hover:text-amber-400 flex items-center gap-1.5">
          <i class="fa-solid fa-walkie-talkie text-amber-400 text-[11px]"></i>
          ${p.label}
          ${p.key ? '<i class="fa-solid fa-lock text-[9px] text-amber-400" title="Protected"></i>' : ''}
        </button>
        <button type="button" onclick="window.uiController.openPresetModal('${p.id}')" class="text-slate-500 hover:text-slate-300 text-[10px] pl-1 border-l border-slate-800" title="Edit Preset">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>
    `).join('');
  }

  // 1-Tap Connect to Custom Preset
  connectToPreset(presetId) {
    const presets = window.storageManager.getCustomPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    if (this.elements.roomInput) this.elements.roomInput.value = preset.room;
    const passInput = document.getElementById('channelPasscodeInput');
    if (passInput) passInput.value = preset.key || '';

    this.showToast(`Connecting to ${preset.label} (#${preset.room})...`, 'info', 2000);
    window.app.joinFrequency();
  }

  // Open Preset Modal for Create or Edit
  openPresetModal(presetId = null) {
    const modal = document.getElementById('presetModal');
    const title = document.getElementById('presetModalTitle');
    const idInput = document.getElementById('presetIdInput');
    const labelInput = document.getElementById('presetLabelInput');
    const roomInput = document.getElementById('presetRoomInput');
    const keyInput = document.getElementById('presetKeyInput');
    const deleteBtn = document.getElementById('deletePresetBtn');

    if (!modal) return;

    if (presetId) {
      const presets = window.storageManager.getCustomPresets();
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        if (title) title.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-400"></i> Edit Channel Preset`;
        if (idInput) idInput.value = preset.id;
        if (labelInput) labelInput.value = preset.label;
        if (roomInput) roomInput.value = preset.room;
        if (keyInput) keyInput.value = preset.key || '';
        if (deleteBtn) deleteBtn.classList.remove('hidden');
      }
    } else {
      if (title) title.innerHTML = `<i class="fa-solid fa-star text-amber-400"></i> Save New Channel Preset`;
      if (idInput) idInput.value = '';
      if (labelInput) labelInput.value = '';
      if (roomInput) roomInput.value = this.elements.roomInput ? this.elements.roomInput.value : '';
      const passInput = document.getElementById('channelPasscodeInput');
      if (keyInput) keyInput.value = passInput ? passInput.value : '';
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }

    this.openModal('presetModal');
  }

  // Handle Save Preset
  handleSavePreset() {
    const idInput = document.getElementById('presetIdInput');
    const labelInput = document.getElementById('presetLabelInput');
    const roomInput = document.getElementById('presetRoomInput');
    const keyInput = document.getElementById('presetKeyInput');

    const label = labelInput ? labelInput.value.trim() : '';
    const room = roomInput ? roomInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';

    if (!label || !room) {
      alert('Please enter a Preset Label Name and Channel Name.');
      return;
    }

    const preset = {
      id: idInput && idInput.value ? idInput.value : 'preset-' + Date.now(),
      label,
      room,
      key
    };

    window.storageManager.saveCustomPreset(preset);
    this.loadCustomPresetsUI();
    this.closeModal('presetModal');
    this.showToast(`Preset "${label}" saved!`, 'success');
  }

  // Handle Delete Preset
  handleDeletePreset() {
    const idInput = document.getElementById('presetIdInput');
    if (!idInput || !idInput.value) return;

    if (confirm('Delete this preset?')) {
      window.storageManager.deleteCustomPreset(idInput.value);
      this.loadCustomPresetsUI();
      this.closeModal('presetModal');
      this.showToast('Preset deleted', 'info');
    }
  }

  // Render Favorites UI
  loadFavoritesUI() {
    this.loadCustomPresetsUI();
  }

  // Toggle password input visibility (eye icon)
  togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash text-xs text-amber-400';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye text-xs text-slate-400';
    }
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

  /**
   * Show a temporary toast notification (non-blocking alternative to alert).
   * @param {string} message - Toast message text
   * @param {'info'|'warning'|'error'|'success'} type - Toast color variant
   * @param {number} durationMs - Auto-dismiss after this many ms (default 3000)
   */
  showToast(message, type = 'info', durationMs = 3000) {
    // Remove existing toast
    const existing = document.getElementById('aethertalk-toast');
    if (existing) existing.remove();

    const colors = {
      info:    'bg-slate-700 border-slate-600 text-slate-200',
      warning: 'bg-amber-900/80 border-amber-500/60 text-amber-200',
      error:   'bg-rose-900/80 border-rose-500/60 text-rose-200',
      success: 'bg-emerald-900/80 border-emerald-500/60 text-emerald-200'
    };
    const icons = {
      info: 'fa-circle-info',
      warning: 'fa-triangle-exclamation',
      error: 'fa-circle-xmark',
      success: 'fa-circle-check'
    };

    const toast = document.createElement('div');
    toast.id = 'aethertalk-toast';
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl text-xs font-semibold backdrop-blur-sm max-w-xs text-center transition-all duration-300 ${colors[type] || colors.info}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-8px)';
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Animate out & remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-8px)';
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  /**
   * Update TOT (Time-Out-Timer) display on PTT button.
   * @param {number|null} secondsLeft - null when TOT is inactive
   */
  updateTotDisplay(secondsLeft) {
    const ptt = this.elements.pttButton;
    if (!ptt) return;

    let totEl = document.getElementById('tot-display');

    if (secondsLeft === null || secondsLeft === undefined) {
      // TOT inactive — remove countdown
      if (totEl) totEl.remove();
      return;
    }

    if (!totEl) {
      totEl = document.createElement('span');
      totEl.id = 'tot-display';
      totEl.className = 'text-[9px] font-mono absolute bottom-3';
      ptt.style.position = 'relative';
      ptt.appendChild(totEl);
    }

    const color = secondsLeft <= 10 ? 'text-red-300 animate-pulse' : 'text-rose-200/70';
    totEl.className = `text-[9px] font-mono absolute bottom-3 ${color}`;
    totEl.textContent = `TOT ${secondsLeft}s`;
  }

  // Hamburger Side Drawer Toggle
  toggleSideDrawer(show) {
    const drawer = document.getElementById('sideDrawer');
    if (!drawer) return;
    if (show) drawer.classList.remove('hidden');
    else drawer.classList.add('hidden');
  }

  // Bottom Navigation Bar Tab Switcher ('radio' | 'squad' | 'chat' | 'channels' | 'profile')
  switchNavTab(tabName) {
    const tabs = ['radio', 'squad', 'chat', 'channels', 'profile'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.className = 'flex flex-col items-center gap-1 text-emerald-400 active-tab-glow transition';
        } else {
          btn.className = 'flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition';
        }
      }
    });

    const squadView = document.getElementById('squadView');
    const profileView = document.getElementById('profileView');

    if (tabName === 'radio') {
      if (window.app && window.app.isJoined) {
        this.elements.setupView.classList.add('hidden');
        this.elements.radioView.classList.remove('hidden');
      } else {
        this.elements.setupView.classList.remove('hidden');
        this.elements.radioView.classList.add('hidden');
      }
      if (squadView) squadView.classList.add('hidden');
      if (profileView) profileView.classList.add('hidden');
      this.closeModal('chatModal');

    } else if (tabName === 'squad') {
      this.elements.setupView.classList.add('hidden');
      this.elements.radioView.classList.add('hidden');
      if (profileView) profileView.classList.add('hidden');
      if (squadView) squadView.classList.remove('hidden');
      this.renderSquadTabRoster();

    } else if (tabName === 'chat') {
      this.openModal('chatModal');

    } else if (tabName === 'channels') {
      if (window.app && window.app.isJoined) {
        this.elements.setupView.classList.add('hidden');
      } else {
        this.elements.setupView.classList.remove('hidden');
      }
      if (squadView) squadView.classList.add('hidden');
      if (profileView) profileView.classList.add('hidden');
      this.openModal('peersModal');

    } else if (tabName === 'profile') {
      this.elements.setupView.classList.add('hidden');
      this.elements.radioView.classList.add('hidden');
      if (squadView) squadView.classList.add('hidden');
      if (profileView) profileView.classList.remove('hidden');

      // Populate current profile data into inputs
      if (window.profileManager) {
        const p = window.profileManager.profile;
        const callsignInput = document.getElementById('profileCallsignInput');
        if (callsignInput) callsignInput.value = p.callsign;
      }
      this.renderAvatarGrid();
      this.renderFriendsList();
      this.renderBlockedPeersList();
    }
  }

  // Render Tactical Squad / Friends Roster
  renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    if (!container || !window.profileManager) return;

    const friends = window.profileManager.loadFriends();
    const keys = Object.keys(friends);

    if (keys.length === 0) {
      container.innerHTML = `<div class="text-slate-500 text-[11px]">No friends added yet. Type a callsign above to add them!</div>`;
      return;
    }

    container.innerHTML = keys.map(callsign => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
            <i class="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <span class="font-bold text-slate-200">${callsign}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="window.uiController.sendPingToFriend('${callsign}')" class="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-lg transition flex items-center gap-1">
            <i class="fa-solid fa-bell"></i> Ping
          </button>
          <button onclick="window.profileManager.removeFriend('${callsign}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 font-bold text-[10px] rounded-lg border border-slate-700">
            Remove
          </button>
        </div>
      </div>
    `).join('');
  }

  handleAddFriend() {
    const input = document.getElementById('addFriendInput');
    if (!input || !input.value.trim() || !window.profileManager) return;

    window.profileManager.addFriend(input.value.trim());
    input.value = '';
  }

  handleAddFriendFromSquadView() {
    const input = document.getElementById('squadAddInput');
    if (!input || !input.value.trim() || !window.profileManager) return;

    window.profileManager.addFriend(input.value.trim());
    input.value = '';
    this.renderSquadTabRoster();
  }

  renderSquadTabRoster() {
    const container = document.getElementById('squadTabRosterContainer');
    if (!container || !window.profileManager) return;

    const friends = window.profileManager.loadFriends();
    const keys = Object.keys(friends);

    if (keys.length === 0) {
      container.innerHTML = `<div class="text-slate-500 text-xs py-6 text-center font-medium">No friends added yet. Type Dad, Mom, or a teammate callsign above to add them!</div>`;
      return;
    }

    container.innerHTML = keys.map(callsign => `
      <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80 shadow">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-cyan-500/20">
            <i class="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <h4 class="font-bold text-slate-100 text-xs">${callsign}</h4>
            <p class="text-[10px] text-slate-400">Tactical Squad Partner</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.uiController.sendPingToFriend('${callsign}')" class="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5">
            <i class="fa-solid fa-bell text-xs"></i> Ping & Call
          </button>
          <button onclick="window.profileManager.removeFriend('${callsign}'); window.uiController.renderSquadTabRoster()" class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500 text-slate-400 hover:text-rose-400 flex items-center justify-center transition" title="Remove Friend">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  sendPingToFriend(targetCallsign) {
    const currentRoom = window.app ? window.app.currentRoom : 'alpha1';
    const myCallsign = window.app ? window.app.myCallsign : 'Operator';
    if (window.firebaseSignaling) {
      window.firebaseSignaling.sendInvitePing(targetCallsign, currentRoom, myCallsign);
    }
  }

  // Request Web Push Notification Permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      this.showToast('Push notifications not supported on this browser', 'warning');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.showToast('Web Push Notifications enabled! 🔔', 'success');
    } else {
      this.showToast('Notification permission denied', 'warning');
    }
  }

  // Render Blocked Operators Roster
  renderBlockedPeersList() {
    const container = document.getElementById('blockedPeersContainer');
    if (!container || !window.profileManager) return;

    const blocked = window.profileManager.blockedPeers;
    const keys = Object.keys(blocked);

    if (keys.length === 0) {
      container.innerHTML = `<div class="text-slate-500 text-[11px]">No blocked operators.</div>`;
      return;
    }

    container.innerHTML = keys.map(peerId => `
      <div class="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
        <div>
          <span class="font-bold text-slate-200">${blocked[peerId].callsign}</span>
          <span class="text-[10px] text-slate-500 block font-mono">${peerId}</span>
        </div>
        <button onclick="window.profileManager.unblockPeer('${peerId}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[10px] rounded-lg border border-slate-700">
          Unblock
        </button>
      </div>
    `).join('');
  }

  // Handle Security PIN Update
  handlePinChange() {
    const currentInput = document.getElementById('currentPinInput');
    const newInput = document.getElementById('newPinInput');
    if (!currentInput || !newInput || !window.appLock) return;

    const res = window.appLock.changePin(currentInput.value, newInput.value);
    this.showToast(res.message, res.success ? 'success' : 'error');

    if (res.success) {
      currentInput.value = '';
      newInput.value = '';
    }
  }

  selectAvatar(avatarId) {
    if (window.profileManager) {
      window.profileManager.saveProfile({ avatar: avatarId });
      this.renderAvatarGrid();
      this.showToast(`Tactical avatar set to ${avatarId}!`, 'success');
    }
  }

  renderAvatarGrid() {
    const grid = document.getElementById('avatarPresetGrid');
    if (!grid || !window.profileManager) return;

    const current = window.profileManager.profile.avatar || 'radio';
    const presets = window.profileManager.avatarPresets;

    grid.innerHTML = presets.map(p => {
      const isSelected = p.id === current;
      const borderClass = isSelected ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700';
      return `
        <button onclick="window.uiController.selectAvatar('${p.id}')" class="p-3.5 rounded-2xl flex flex-col items-center justify-center transition active:scale-95 ${borderClass}">
          <i class="fa-solid ${p.icon} text-base"></i>
        </button>
      `;
    }).join('');
  /**
   * Copy any text to device clipboard with toast feedback
   */
  copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('📋 Copied ID to clipboard!', 'success');
      }).catch(() => {
        this.fallbackCopyText(text);
      });
    } else {
      this.fallbackCopyText(text);
    }
  }

  fallbackCopyText(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.showToast('📋 Copied ID to clipboard!', 'success');
  }

  /**
   * Set UI color theme (tactical-dark, cyber-neon, desert-camo, stealth-black)
   */
  setTheme(themeName) {
    if (!themeName) return;
    document.body.setAttribute('data-theme', themeName);
    if (window.storageManager) {
      window.storageManager.saveAppSettings({ theme: themeName });
    }
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = themeName;
    console.log('[UI] Applied color theme:', themeName);
  }
}

window.uiController = new UIController();


