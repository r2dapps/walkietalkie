/**
 * AudioEngine - Web Audio API processing module for AetherTalk.
 * Handles Radio Bandpass EQ, Distortion Presets, Roger Beep, Squelch Static, & VOX engine.
 *
 * AUDIO CHAIN (for transmitted voice):
 *   MicSource -> HighPass -> LowPass -> Distortion -> Compressor -> txGain -> MediaStreamDestination
 *                                                                         \-> Analyser (for VU/visualizer)
 *
 * The processed MediaStream from MediaStreamDestination is what gets sent to peers via PeerJS.
 * txGain is set to 0 when PTT is off, 1 when PTT is on — cleaner than track.enabled toggling.
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.micStream = null;           // raw mic MediaStream
    this.processedStream = null;     // DSP-processed MediaStream (sent to WebRTC)
    this.micSource = null;
    this.analyserNode = null;

    // Filter nodes
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.distortionNode = null;
    this.compressorNode = null;
    this.txGain = null;              // 0 = muted (PTT off), 1 = live (PTT on)
    this.masterGain = null;          // output volume for local monitoring

    // Settings
    this.audioPrefs = window.storageManager ? window.storageManager.getAudioPrefs() : {};
    this.isVoxActive = false;
    this.voxCallback = null;
    this.voxCheckTimer = null;
    this.selectedMicId = null;
    this.selectedSpeakerId = null;

    this.setupDeviceChangeListener();
  }

  // Listen for Bluetooth / Audio device connections & disconnections
  setupDeviceChangeListener() {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        console.log('[AudioEngine] Audio hardware device change detected (Bluetooth/Headset plug-in/out).');
        await this.populateAudioDeviceSelectors();
      });
    }
  }

  /**
   * Enumerate available microphones and speakers (Bluetooth, Headset, Speakers)
   */
  async enumerateAudioDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return { inputs: [], outputs: [] };
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      return { inputs, outputs };
    } catch (err) {
      console.warn('[AudioEngine] Failed to enumerate audio devices:', err);
      return { inputs: [], outputs: [] };
    }
  }

  /**
   * Populate UI dropdowns for audio inputs & outputs
   */
  async populateAudioDeviceSelectors() {
    const { inputs, outputs } = await this.enumerateAudioDevices();
    const micSelect = document.getElementById('audioInputSelect');
    const speakerSelect = document.getElementById('audioOutputSelect');

    if (micSelect) {
      micSelect.innerHTML = inputs.map((d, i) => 
        `<option value="${d.deviceId}" ${this.selectedMicId === d.deviceId ? 'selected' : ''}>${d.label || 'Microphone ' + (i + 1)}</option>`
      ).join('');
    }

    if (speakerSelect) {
      if ('setSinkId' in HTMLAudioElement.prototype) {
        speakerSelect.innerHTML = outputs.map((d, i) => 
          `<option value="${d.deviceId}" ${this.selectedSpeakerId === d.deviceId ? 'selected' : ''}>${d.label || 'Speaker/Headset ' + (i + 1)}</option>`
        ).join('');
      } else {
        speakerSelect.innerHTML = `<option value="">Default Speaker (browser setSinkId un-supported)</option>`;
        speakerSelect.disabled = true;
      }
    }
  }

  /**
   * Switch active microphone input device (e.g., to Bluetooth headset)
   */
  async selectAudioInputDevice(deviceId) {
    if (!deviceId) return;
    this.selectedMicId = deviceId;
    console.log('[AudioEngine] Switching microphone input to:', deviceId);

    try {
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
      }
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      if (this.ctx && this.processedStream) {
        this.setupAudioProcessingChain();
      }
      if (window.uiController && window.uiController.showToast) {
        window.uiController.showToast('🎧 Switched microphone input to selected device', 'info');
      }
    } catch (err) {
      console.warn('[AudioEngine] Failed to switch microphone:', err);
    }
  }

  /**
   * Switch audio output device for all incoming peer streams (e.g., to Bluetooth headphones)
   */
  async selectAudioOutputDevice(deviceId) {
    this.selectedSpeakerId = deviceId;
    console.log('[AudioEngine] Switching audio output to:', deviceId);

    if ('setSinkId' in HTMLAudioElement.prototype && window.peerManager) {
      Object.keys(window.peerManager.audioElements).forEach(async (peerId) => {
        const audio = window.peerManager.audioElements[peerId];
        if (audio && audio.setSinkId) {
          try {
            await audio.setSinkId(deviceId);
          } catch (err) {
            console.warn('[AudioEngine] Failed to setSinkId for peer:', peerId, err);
          }
        }
      });
      if (window.uiController && window.uiController.showToast) {
        window.uiController.showToast('🔊 Switched audio output to selected headset/speaker', 'info');
      }
    }
  }

  // Ensure AudioContext is running (call on user gesture)
  async initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 48000 });
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Request microphone and build the full DSP chain.
   * Returns the processed MediaStream (for WebRTC).
   */
  async getMicrophoneStream() {
    await this.initContext();

    // Return cached processed stream if already initialized
    if (this.processedStream) return this.processedStream;

    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      };
      if (this.selectedMicId) {
        audioConstraints.deviceId = { exact: this.selectedMicId };
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });

      this.setupAudioProcessingChain();
      this.populateAudioDeviceSelectors();
      return this.processedStream;

    } catch (err) {
      console.warn('[AudioEngine] Microphone Access Denied/Error:', err.message, '— generating silent fallback stream.');
      // Create a silent audio track using Web Audio API so P2P mesh connection still works
      const osc = this.ctx.createOscillator();
      const silentGain = this.ctx.createGain();
      silentGain.gain.value = 0;
      const dest = this.ctx.createMediaStreamDestination();
      osc.connect(silentGain);
      silentGain.connect(dest);
      osc.start();

      this.micStream = dest.stream;
      // Disable microphone hardware track by default (enabled ONLY during active PTT)
      this.micStream.getAudioTracks().forEach(t => {
        t.enabled = false;
      });
      this.setupAudioProcessingChain();
      return this.processedStream;
    }
  }

  /**
   * Build Radio DSP Chain:
   *   MicSource -> HPF(300Hz) -> LPF(3200Hz) -> Distortion -> Compressor -> txGain -> StreamDest
   *                                                                                 -> Analyser
   *                                                                                 -> masterGain -> speakers
   */
  setupAudioProcessingChain() {
    if (!this.ctx || !this.micStream) return;

    this.micSource = this.ctx.createMediaStreamSource(this.micStream);

    // 1. High-Pass Filter (cut below 300 Hz — removes rumble/breath)
    this.highpassFilter = this.ctx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 300;
    this.highpassFilter.Q.value = 0.7;

    // 2. Low-Pass Filter (cut above 3200 Hz — narrows to telephony band)
    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 3200;
    this.lowpassFilter.Q.value = 0.7;

    // 3. Distortion / WaveShaper for radio coloring
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.oversample = '4x';
    this.applyEqPreset(this.audioPrefs.eqPreset || 'military');

    // 4. Dynamics Compressor (limiter-style)
    this.compressorNode = this.ctx.createDynamicsCompressor();
    this.compressorNode.threshold.setValueAtTime(-18, this.ctx.currentTime);
    this.compressorNode.knee.setValueAtTime(6, this.ctx.currentTime);
    this.compressorNode.ratio.setValueAtTime(8, this.ctx.currentTime);
    this.compressorNode.attack.setValueAtTime(0.002, this.ctx.currentTime);
    this.compressorNode.release.setValueAtTime(0.15, this.ctx.currentTime);

    // 5. TX Gain — mute/unmute transmission (PTT gate)
    this.txGain = this.ctx.createGain();
    this.txGain.gain.value = 0; // start muted

    // 6. Analyser (for VU meter / visualizer & VOX)
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.6;

    // 7. MediaStreamDestination — capture processed audio as a WebRTC-compatible stream
    this.streamDestination = this.ctx.createMediaStreamDestination();
    this.processedStream = this.streamDestination.stream;

    // 8. Master Gain — for local speaker playback (monitoring, disabled by default to avoid echo)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // No local monitoring (would cause echo)

    // Wire up the chain
    this.micSource.connect(this.highpassFilter);
    this.highpassFilter.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.distortionNode);
    this.distortionNode.connect(this.compressorNode);
    this.compressorNode.connect(this.txGain);
    this.compressorNode.connect(this.analyserNode); // analyser gets pre-gate signal for VOX/VU

    // txGain -> stream destination (WebRTC path)
    this.txGain.connect(this.streamDestination);
    // txGain -> masterGain -> speakers (local monitor, currently off)
    this.txGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    console.log('[AudioEngine] DSP chain built. Processed stream tracks:', this.processedStream.getTracks().length);
  }

  // Apply distortion curve presets
  applyEqPreset(preset) {
    if (!this.distortionNode) return;
    if (window.storageManager) {
      this.audioPrefs.eqPreset = preset;
      window.storageManager.saveAudioPrefs({ eqPreset: preset });
    }

    if (preset === 'clean') {
      this.distortionNode.curve = null;
      if (this.highpassFilter) this.highpassFilter.frequency.value = 80;
      if (this.lowpassFilter) this.lowpassFilter.frequency.value = 8000;
      return;
    }

    if (this.highpassFilter) this.highpassFilter.frequency.value = 300;
    if (this.lowpassFilter) this.lowpassFilter.frequency.value = 3200;

    const n_samples = 256;
    const curve = new Float32Array(n_samples);
    let amount = 0;

    switch (preset) {
      case 'analog_fm':  amount = 5;  break;
      case 'military':   amount = 15; break;
      case 'cb_radio':   amount = 30; break;
      case 'vintage':    amount = 50; break;
      default:           amount = 15;
    }

    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    this.distortionNode.curve = curve;
  }

  /**
   * Gate the TX Gain node to mute/unmute transmission.
   * This is far more reliable than toggling track.enabled.
   */
  setTransmissionActive(active) {
    if (!this.txGain || !this.ctx) return;

    // Toggle raw microphone hardware track enabled state (keep enabled if VOX is active)
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach(t => {
        t.enabled = active || !!(this.audioPrefs && this.audioPrefs.voxEnabled);
      });
    }

    const now = this.ctx.currentTime;
    if (active) {
      this.txGain.gain.cancelScheduledValues(now);
      this.txGain.gain.setValueAtTime(0, now);
      this.txGain.gain.linearRampToValueAtTime(1.0, now + 0.015); // 15ms fade-in (avoids click)
      this.playPttClickSound();
      this.muteAllRemoteAudio();
    } else {
      this.txGain.gain.cancelScheduledValues(now);
      this.txGain.gain.setValueAtTime(1.0, now);
      this.txGain.gain.linearRampToValueAtTime(0, now + 0.015); // 15ms fade-out
      this.unmuteAllRemoteAudio();
      setTimeout(() => {
        if (this.audioPrefs.rogerBeep !== false) {
          this.playRogerBeep();
        } else if (this.audioPrefs.squelch !== false) {
          this.playSquelchTail();
        }
      }, 20);
    }
  }

  // Mute all remote audio element playback while local PTT is active (prevents feedback)
  muteAllRemoteAudio() {
    const audioElements = document.querySelectorAll('audio[id^="audio-"]');
    audioElements.forEach(el => {
      el.muted = true;
    });
  }

  // Unmute remote audio elements when PTT is released
  unmuteAllRemoteAudio() {
    const audioElements = document.querySelectorAll('audio[id^="audio-"]');
    audioElements.forEach(el => {
      el.muted = false;
    });
  }

  // Web Audio Synthesizer: Roger Beep (1000 Hz + 1200 Hz tone sequence)
  playRogerBeep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1000, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.065);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
    gain.gain.setValueAtTime(0.25, now + 0.06);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.065);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.065);
    osc2.start(now + 0.065);
    osc2.stop(now + 0.16);

    if (this.audioPrefs.squelch !== false) {
      setTimeout(() => this.playSquelchTail(), 170);
    }
  }

  // Web Audio Synthesizer: Squelch Burst (White noise tail on mic release)
  playSquelchTail() {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.09); // 90ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  // PTT Press Click sound
  playPttClickSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.025);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.025);
  }

  // Operator Join Alert Chime
  playPeerJoinChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 660, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  // Peer leave chime (descending)
  playPeerLeaveChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [880, 660, 440].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  // Start VOX (Voice Activity Detection) loop
  startVoxMonitoring(onStateChange) {
    this.voxCallback = onStateChange;
    if (this.voxCheckTimer) clearInterval(this.voxCheckTimer);

    let silenceFrames = 0;
    const VOX_SILENCE_FRAMES = 8; // ~800ms of silence before deactivating

    this.voxCheckTimer = setInterval(() => {
      if (!this.analyserNode || !this.audioPrefs.voxEnabled) return;

      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const average = sum / data.length;
      const isSpeaking = average > 20;

      if (isSpeaking) {
        silenceFrames = 0;
        if (!this.isVoxActive) {
          this.isVoxActive = true;
          if (this.voxCallback) this.voxCallback(true);
        }
      } else {
        silenceFrames++;
        if (silenceFrames >= VOX_SILENCE_FRAMES && this.isVoxActive) {
          this.isVoxActive = false;
          if (this.voxCallback) this.voxCallback(false);
        }
      }
    }, 100);
  }

  // Setup HTML5 MediaSession & WakeLock for mobile screen-lock background audio persistence
  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'TechTalkie Active Frequency',
        artist: 'Tactical Voice Channel',
        album: 'AetherTalk Walkie-Talkie PWA',
        artwork: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      });
    }

    if ('wakeLock' in navigator) {
      try {
        navigator.wakeLock.request('screen').then(lock => {
          this.wakeLock = lock;
          console.log('[AudioEngine] Screen WakeLock acquired.');
        }).catch(() => {});
      } catch (e) {}
    }
  }

  stopVoxMonitoring() {
    if (this.voxCheckTimer) {
      clearInterval(this.voxCheckTimer);
      this.voxCheckTimer = null;
    }
    this.isVoxActive = false;
  }

  // Get analyser node for visualizer
  getAnalyserNode() {
    return this.analyserNode;
  }
}

window.audioEngine = new AudioEngine();
