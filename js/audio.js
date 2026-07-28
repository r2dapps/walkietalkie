/**
 * AudioEngine - Web Audio API processing module for AetherTalk.
 * Handles Radio Bandpass EQ, Distortion Presets, Roger Beep, Squelch Static, & VOX engine.
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.micStream = null;
    this.micSource = null;
    this.processedStreamNode = null;
    this.analyserNode = null;

    // Filter nodes
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.distortionNode = null;
    this.compressorNode = null;
    this.masterGain = null;

    // Settings
    this.audioPrefs = window.storageManager.getAudioPrefs();
    this.isVoxActive = false;
    this.voxCallback = null;
    this.voxCheckTimer = null;
  }

  // Ensure AudioContext is running (call on user gesture)
  async initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  // Request microphone with tactical constraints (echo cancellation, noise suppression)
  async getMicrophoneStream() {
    await this.initContext();
    if (this.micStream) return this.micStream;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        },
        video: false
      });

      // Mute track initially until PTT is engaged
      this.micStream.getAudioTracks()[0].enabled = false;
      this.setupAudioProcessingChain();

      return this.micStream;
    } catch (err) {
      console.error('Microphone Access Error:', err);
      throw err;
    }
  }

  // Build Radio DSP Chain: Source -> HighPass(300Hz) -> LowPass(3200Hz) -> Distortion -> Compressor -> Analyser
  setupAudioProcessingChain() {
    if (!this.ctx || !this.micStream) return;

    this.micSource = this.ctx.createMediaStreamSource(this.micStream);

    // 1. High-Pass Filter (Cut below 300Hz)
    this.highpassFilter = this.ctx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 300;

    // 2. Low-Pass Filter (Cut above 3200Hz for bandwidth limitation)
    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 3200;

    // 3. Distortion / Waveshaper
    this.distortionNode = this.ctx.createWaveShaper();
    this.applyEqPreset(this.audioPrefs.eqPreset);

    // 4. Dynamics Compressor
    this.compressorNode = this.ctx.createDynamicsCompressor();
    this.compressorNode.threshold.setValueAtTime(-24, this.ctx.currentTime);
    this.compressorNode.knee.setValueAtTime(30, this.ctx.currentTime);
    this.compressorNode.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressorNode.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressorNode.release.setValueAtTime(0.25, this.ctx.currentTime);

    // 5. Analyser Node for visualizer & VOX
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 128;

    // Connect graph
    this.micSource.connect(this.highpassFilter);
    this.highpassFilter.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.distortionNode);
    this.distortionNode.connect(this.compressorNode);
    this.compressorNode.connect(this.analyserNode);

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.audioPrefs.volume || 1.0;
  }

  // Apply distortion curve presets
  applyEqPreset(preset) {
    if (!this.distortionNode) return;
    this.audioPrefs.eqPreset = preset;
    window.storageManager.saveAudioPrefs({ eqPreset: preset });

    if (preset === 'clean') {
      this.distortionNode.curve = null;
      if (this.highpassFilter) this.highpassFilter.frequency.value = 100;
      if (this.lowpassFilter) this.lowpassFilter.frequency.value = 8000;
      return;
    }

    if (this.highpassFilter) this.highpassFilter.frequency.value = 300;
    if (this.lowpassFilter) this.lowpassFilter.frequency.value = 3200;

    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    let amount = 0;

    switch (preset) {
      case 'analog_fm': amount = 8; break;
      case 'military': amount = 25; break;
      case 'cb_radio': amount = 35; break;
      case 'vintage': amount = 50; break;
      default: amount = 15;
    }

    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    this.distortionNode.curve = curve;
  }

  // Mute / Unmute local mic transmission
  setTransmissionActive(active) {
    if (!this.micStream) return;
    const track = this.micStream.getAudioTracks()[0];
    if (track) track.enabled = active;

    if (active) {
      this.playPttClickSound();
    } else {
      if (this.audioPrefs.rogerBeep) {
        this.playRogerBeep();
      } else if (this.audioPrefs.squelch) {
        this.playSquelchTail();
      }
    }
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
    osc2.frequency.setValueAtTime(1200, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.06);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.14);

    if (this.audioPrefs.squelch) {
      setTimeout(() => this.playSquelchTail(), 140);
    }
  }

  // Web Audio Synthesizer: Squelch Burst (White noise tail on mic release)
  playSquelchTail() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.08; // 80ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

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
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // Operator Join Alert Chime
  playPeerJoinChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Start VOX (Voice Activity Detection) loop
  startVoxMonitoring(onStateChange) {
    this.voxCallback = onStateChange;
    if (this.voxCheckTimer) clearInterval(this.voxCheckTimer);

    this.voxCheckTimer = setInterval(() => {
      if (!this.analyserNode || !this.audioPrefs.voxEnabled) return;

      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const average = sum / data.length;
      const isSpeaking = average > 25; // Threshold check

      if (isSpeaking !== this.isVoxActive) {
        this.isVoxActive = isSpeaking;
        if (this.voxCallback) this.voxCallback(isSpeaking);
      }
    }, 100);
  }

  stopVoxMonitoring() {
    if (this.voxCheckTimer) {
      clearInterval(this.voxCheckTimer);
      this.voxCheckTimer = null;
    }
    this.isVoxActive = false;
  }
}

window.audioEngine = new AudioEngine();
