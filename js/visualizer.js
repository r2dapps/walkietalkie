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
    if (state === 'standby') {
      this.stop();
      this.clearCanvas();
    } else {
      this.start();
    }
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

    const analyser = window.audioEngine ? window.audioEngine.analyserNode : null;
    let dataArray = new Uint8Array(64);

    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
    } else {
      // Fallback synthetic wave animation if analyser is null
      for (let i = 0; i < 64; i++) {
        dataArray[i] = Math.sin(Date.now() * 0.01 + i) * 50 + 60;
      }
    }

    const bufferLength = dataArray.length;
    const radius = Math.min(w, h) * 0.38;

    this.ctx.save();
    this.ctx.beginPath();

    const isTx = this.audioState === 'transmitting';
    this.ctx.strokeStyle = isTx ? 'rgba(244, 63, 94, 0.85)' : 'rgba(16, 185, 129, 0.85)';
    this.ctx.lineWidth = 4 * (window.devicePixelRatio || 1);
    this.ctx.lineCap = 'round';

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255.0;
      const r = radius + value * (Math.min(w, h) * 0.12);
      const angle = (i * 2 * Math.PI) / bufferLength;

      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
  }
}

window.visualizer = new Visualizer();
