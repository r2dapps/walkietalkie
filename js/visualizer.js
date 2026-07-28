/**
 * Visualizer - FPS-optimized, battery-friendly Canvas Audio Visualizer.
 * Automatically pauses animation loop when tab is hidden or audio is idle.
 */
class Visualizer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;
    this.isRunning = false;
    this.audioState = 'standby'; // 'standby' | 'transmitting' | 'receiving'
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else if (this.audioState !== 'standby') {
        this.start();
      }
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth * (window.devicePixelRatio || 1);
    this.canvas.height = this.canvas.offsetHeight * (window.devicePixelRatio || 1);
  }

  setAudioState(state) {
    this.audioState = state;
    // Keep running in standby for idle animation — just changes color/brightness
    if (!this.isRunning) this.start();
  }

  start() {
    if (this.isRunning || document.hidden) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  loop() {
    if (!this.isRunning) return;

    this.renderWaveform();
    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  renderWaveform() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.clearRect(0, 0, w, h);

    const analyser = window.audioEngine ? window.audioEngine.getAnalyserNode() : null;
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    let dataArray = new Uint8Array(bufferLength);

    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
    } else {
      // Gentle idle animation
      const t = Date.now() * 0.003;
      for (let i = 0; i < bufferLength; i++) {
        dataArray[i] = Math.sin(t + i * 0.4) * 20 + 25;
      }
    }

    const isTx = this.audioState === 'transmitting';
    const isRx = this.audioState === 'receiving';
    const baseColor = isTx ? [244, 63, 94] : isRx ? [16, 185, 129] : [100, 116, 139];
    const radius = Math.min(w, h) * 0.38;
    const maxExcursion = Math.min(w, h) * 0.13;

    // Glow effect
    this.ctx.save();
    this.ctx.shadowColor = `rgba(${baseColor.join(',')}, 0.6)`;
    this.ctx.shadowBlur = 12 * (window.devicePixelRatio || 1);

    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(${baseColor.join(',')}, 0.9)`;
    this.ctx.lineWidth = (isTx || isRx ? 3.5 : 2) * (window.devicePixelRatio || 1);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 0; i <= bufferLength; i++) {
      const idx = i % bufferLength;
      const value = dataArray[idx] / 255.0;
      const r = radius + value * maxExcursion;
      const angle = (i * 2 * Math.PI) / bufferLength - Math.PI / 2;

      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }

    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
  }
}

window.visualizer = new Visualizer();
