import { getAudioPrefs } from './storageService';
import { EqPreset } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private txGain: GainNode | null = null;
  private hpf: BiquadFilterNode | null = null;
  private lpf: BiquadFilterNode | null = null;
  private waveShaper: WaveShaperNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private processedStreamDest: MediaStreamAudioDestinationNode | null = null;
  private micStream: MediaStream | null = null;
  private voxInterval: number | null = null;

  async getMicrophoneStream(): Promise<MediaStream> {
    if (this.micStream) return this.processedStreamDest!.stream;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
    
    try {
      const prefs = getAudioPrefs();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: prefs.inputDeviceId ? { exact: prefs.inputDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
    } catch (e) {
      console.error('Mic access denied', e);
      throw e;
    }

    const source = this.ctx.createMediaStreamSource(this.micStream);
    
    this.hpf = this.ctx.createBiquadFilter();
    this.hpf.type = 'highpass';
    
    this.lpf = this.ctx.createBiquadFilter();
    this.lpf.type = 'lowpass';
    
    this.waveShaper = this.ctx.createWaveShaper();
    
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -30;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    this.txGain = this.ctx.createGain();
    this.txGain.gain.value = 0;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = getAudioPrefs().volume;

    this.processedStreamDest = this.ctx.createMediaStreamDestination();

    // Source -> Filters -> Waveshaper -> Compressor -> txGain -> MediaStreamDest
    // txGain also -> Analyser
    // txGain also -> masterGain -> ctx.destination (for local monitor if needed, but usually muted to prevent feedback)
    
    source.connect(this.hpf);
    this.hpf.connect(this.lpf);
    this.lpf.connect(this.waveShaper);
    this.waveShaper.connect(compressor);
    compressor.connect(this.txGain);
    
    this.txGain.connect(this.processedStreamDest);
    this.txGain.connect(this.analyser);
    // this.txGain.connect(this.masterGain);
    // this.masterGain.connect(this.ctx.destination);

    this.applyEqPreset(getAudioPrefs().eqPreset);
    
    return this.processedStreamDest.stream;
  }

  private makeDistortionCurve(amount: number) {
    if (amount === 0) return null;
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  applyEqPreset(preset: EqPreset): void {
    if (!this.hpf || !this.lpf || !this.waveShaper) return;
    
    let amount = 0;
    let hpFreq = 300;
    let lpFreq = 3200;

    switch (preset) {
      case 'clean':
        hpFreq = 80;
        lpFreq = 8000;
        amount = 0;
        break;
      case 'analog_fm':
        amount = 5;
        break;
      case 'military':
        amount = 15;
        break;
      case 'cb_radio':
        amount = 30;
        break;
      case 'vintage':
        amount = 50;
        break;
    }

    this.hpf.frequency.value = hpFreq;
    this.lpf.frequency.value = lpFreq;
    this.waveShaper.curve = this.makeDistortionCurve(amount);
  }

  setTransmissionActive(active: boolean): void {
    if (!this.ctx || !this.txGain || !this.micStream) return;

    // CRITICAL: keep mic track enabled if VOX is on to allow continuous detection
    const prefs = getAudioPrefs();
    this.micStream.getAudioTracks().forEach(t => {
      t.enabled = active || prefs.voxEnabled;
    });

    this.ctx.resume(); // Ensure context is running

    if (active) {
      this.playPttClickSound();
      this.muteAllRemoteAudio();
      this.txGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.015);
    } else {
      this.txGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
      this.unmuteAllRemoteAudio();
      if (prefs.rogerBeep) {
        this.playRogerBeep();
      } else if (prefs.squelch) {
        this.playSquelchTail();
      }
    }
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  playRogerBeep(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.setValueAtTime(1200, now + 0.065);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.setValueAtTime(0.1, now + 0.065);
    gain.gain.setValueAtTime(0.1, now + 0.16);
    gain.gain.linearRampToValueAtTime(0, now + 0.18);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playSquelchTail(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.09; // 90ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1200;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);
    
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
  }

  playPttClickSound(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.025);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.005);
    gain.gain.linearRampToValueAtTime(0, now + 0.025);
    
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playPeerJoinChime(): void {
    if (!this.ctx) return;
    this.playChimes([440, 660, 880]);
  }

  playPeerLeaveChime(): void {
    if (!this.ctx) return;
    this.playChimes([880, 660, 440]);
  }

  private playChimes(freqs: number[]) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      const startTime = now + (i * 0.08);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  startVoxMonitoring(onTrigger: (active: boolean) => void): void {
    if (!this.analyser) return;
    this.stopVoxMonitoring();
    
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let isActive = false;
    
    this.voxInterval = window.setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      const threshold = getAudioPrefs().voxThreshold;
      
      if (avg > threshold && !isActive) {
        isActive = true;
        onTrigger(true);
      } else if (avg <= threshold && isActive) {
        isActive = false;
        onTrigger(false);
      }
    }, 100);
  }

  stopVoxMonitoring(): void {
    if (this.voxInterval) {
      window.clearInterval(this.voxInterval);
      this.voxInterval = null;
    }
  }

  muteAllRemoteAudio(): void {
    document.querySelectorAll<HTMLAudioElement>('audio[id^="audio-"]').forEach(a => {
      a.muted = true;
    });
  }

  unmuteAllRemoteAudio(): void {
    document.querySelectorAll<HTMLAudioElement>('audio[id^="audio-"]').forEach(a => {
      a.muted = false;
    });
  }

  async enumerateAudioDevices(): Promise<{ inputs: MediaDeviceInfo[], outputs: MediaDeviceInfo[] }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { inputs: [], outputs: [] };
    }
    // Request permission first if not granted to get labels
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {}

    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: devices.filter(d => d.kind === 'audioinput'),
      outputs: devices.filter(d => d.kind === 'audiooutput')
    };
  }

  applyOutputDevice(deviceId: string): void {
    document.querySelectorAll<HTMLAudioElement>('audio[id^="audio-"], audio[id="roger-beep"]').forEach((a: any) => {
      if (typeof a.setSinkId === 'function') {
        a.setSinkId(deviceId).catch(console.error);
      }
    });
  }
}

export const audioEngine = new AudioEngine();
