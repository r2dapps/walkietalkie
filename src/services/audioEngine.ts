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
  private micSource: MediaStreamAudioSourceNode | null = null;
  private activeMicPromise: Promise<void> | null = null;
  private voxInterval: number | null = null;

  async getMicrophoneStream(): Promise<MediaStream> {
    if (this.processedStreamDest) {
      // If VOX is enabled, ensure mic is acquired
      if (getAudioPrefs().voxEnabled) {
        await this.acquireMicrophone();
      }
      return this.processedStreamDest.stream;
    }

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
    
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
    
    // txGain also -> masterGain -> ctx.destination (for local monitor if needed, but usually muted to prevent feedback)
    
    this.hpf.connect(this.lpf);
    this.lpf.connect(this.waveShaper);
    this.waveShaper.connect(compressor);
    compressor.connect(this.txGain);
    
    this.txGain.connect(this.processedStreamDest);
    this.txGain.connect(this.analyser);
    // this.txGain.connect(this.masterGain);
    // this.masterGain.connect(this.ctx.destination);

    this.applyEqPreset(getAudioPrefs().eqPreset);
    
    if (getAudioPrefs().voxEnabled) {
      await this.acquireMicrophone();
    }
    
    return this.processedStreamDest.stream;
  }

  async acquireMicrophone(): Promise<void> {
    if (this.micStream && this.micStream.getAudioTracks()[0].readyState === 'live') return;
    if (this.activeMicPromise) return this.activeMicPromise;

    this.activeMicPromise = (async () => {
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
        if (this.ctx && this.hpf) {
          // Explicitly resume context upon mic acquisition
          if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
          }
          this.micSource = this.ctx.createMediaStreamSource(this.micStream);
          this.micSource.connect(this.hpf);
        }
      } catch (e) {
        console.error('Mic access denied', e);
        throw e;
      } finally {
        this.activeMicPromise = null;
      }
    })();

    return this.activeMicPromise;
  }

  releaseMicrophone(): void {
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
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

  async setTransmissionActive(active: boolean): Promise<void> {
    if (!this.ctx || !this.txGain) return;

    const prefs = getAudioPrefs();
    this.ctx.resume(); // Ensure context is running

    if (active) {
      if (!prefs.voxEnabled) {
        await this.acquireMicrophone();
      }
      this.playPttClickSound();
      this.muteAllRemoteAudio();
      
      this.txGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.txGain.gain.setValueAtTime(this.txGain.gain.value, this.ctx.currentTime);
      this.txGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.05);
    } else {
      this.txGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.txGain.gain.setValueAtTime(this.txGain.gain.value, this.ctx.currentTime);
      this.txGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
      
      this.unmuteAllRemoteAudio();
      
      let delayMs = 0;
      if (prefs.rogerBeep) {
        this.playRogerBeep();
        delayMs = 200;
      } else if (prefs.squelch) {
        this.playSquelchTail();
        delayMs = 150;
      }

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      if (!prefs.voxEnabled) {
        this.releaseMicrophone();
      }
    }
  }

  getProcessedTrack(): MediaStreamTrack | null {
    if (this.processedStreamDest) {
      const tracks = this.processedStreamDest.stream.getAudioTracks();
      if (tracks.length > 0) return tracks[0];
    }
    return null;
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

  playTuningStatic(): void {
    if (!this.ctx) return;
    // Generate brief white noise for channel tuning
    const duration = 0.5; // 500ms blend
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Bandpass to sound like radio static
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    // Smooth fade in
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.1);
    // Smooth fade out
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration - 0.05);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(now);
    noise.stop(now + duration);
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

  playPingSiren(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    const now = this.ctx.currentTime;
    
    // Siren effect: rapid high-low modulation
    for (let i = 0; i < 4; i++) {
      osc.frequency.setValueAtTime(800, now + i * 0.2);
      osc.frequency.setValueAtTime(1200, now + i * 0.2 + 0.1);
    }
    
    // Low volume
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.01);
    gain.gain.setValueAtTime(0.03, now + 0.75);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.8);
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

  async startVoxMonitoring(onTrigger: (active: boolean) => void): Promise<void> {
    if (!this.analyser) return;
    this.stopVoxMonitoring();
    await this.acquireMicrophone();
    
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let isActive = false;
    let hangTimer: number | null = null;
    
    this.voxInterval = window.setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      const threshold = getAudioPrefs().voxThreshold;
      
      if (avg > threshold) {
        if (hangTimer) {
          window.clearTimeout(hangTimer);
          hangTimer = null;
        }
        if (!isActive) {
          isActive = true;
          onTrigger(true);
        }
      } else if (avg <= threshold && isActive && !hangTimer) {
        hangTimer = window.setTimeout(() => {
          isActive = false;
          hangTimer = null;
          onTrigger(false);
        }, 1000); // 1 second hang time for VOX
      }
    }, 100);
  }

  stopVoxMonitoring(): void {
    if (this.voxInterval) {
      window.clearInterval(this.voxInterval);
      this.voxInterval = null;
    }
    // Only release if we are not transmitting right now
    // The calling code handles releasing if appropriate
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
