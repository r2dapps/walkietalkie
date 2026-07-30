import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { useAppContext } from '../context/AppContext';

interface FrequencyScannerProps {
  embedded?: boolean;
}

export default function FrequencyScanner({ embedded = false }: FrequencyScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useAppContext();
  const { radioState, currentRoom = 'alpha1', audioPrefs } = state;
  const visMode = audioPrefs?.visualizerMode || 'waveform';
  
  const [peakDb, setPeakDb] = useState<number>(-48);

  const hashStr = (str: string) => {
    let hash = 0;
    const lowerStr = str.toLowerCase();
    for (let i = 0; i < lowerStr.length; i++) {
      hash = ((hash << 5) - hash) + lowerStr.charCodeAt(i);
      hash |= 0; 
    }
    return Math.abs(hash);
  };
  
  const freqNum = hashStr(currentRoom);
  const mhzBase = 144 + (freqNum % 4);
  const khzPartStr = ((freqNum * 125) % 995).toString().padStart(3, '0');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = containerRef.current.clientWidth || 320;
    let height = 54;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      if (containerRef.current) {
        width = containerRef.current.clientWidth || 320;
        canvas.width = width;
      }
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      // Clear canvas with subtle trail
      ctx.fillStyle = 'rgba(164, 194, 20, 0.3)'; // Match yellow-green background
      ctx.fillRect(0, 0, width, height);

      // Draw faint grid lines
      ctx.strokeStyle = 'rgba(42, 51, 17, 0.15)'; // Dark green grid
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Horizontal grid line
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Vertical grid lines
      const gridSpacing = width / 8;
      for (let x = gridSpacing; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const analyser = audioEngine.getAnalyserNode();
      const isActive = radioState === 'transmitting' || radioState === 'receiving';
      const spectrum = analyser ? new Uint8Array(analyser.frequencyBinCount) : new Uint8Array(0);
      
      let maxVal = 0;
      if (isActive && analyser) {
        analyser.getByteFrequencyData(spectrum);
        for (let i = 0; i < spectrum.length; i++) {
          if (spectrum[i] > maxVal) maxVal = spectrum[i];
        }
        setPeakDb(Math.round(-60 + (maxVal / 255) * 50));
      } else {
        setPeakDb(-52);
      }

      const glowColor = radioState === 'transmitting' ? '#2a3311' : radioState === 'receiving' ? '#1d230b' : '#3d4a19';
      const lineColor = radioState === 'transmitting' ? '#1d230b' : radioState === 'receiving' ? '#1d230b' : '#2a3311';

      if (visMode === 'spectrum') {
        // Equalizer spectrum bars
        const barCount = 32;
        const barWidth = width / barCount - 2;

        for (let i = 0; i < barCount; i++) {
          let val = 0;
          if (isActive && spectrum.length > 0) {
            const index = Math.floor((i / barCount) * (spectrum.length / 2));
            val = spectrum[index] / 255;
          } else {
            val = Math.random() * 0.08;
          }

          const barHeight = Math.max(2, val * height * 0.9);
          const x = i * (barWidth + 2) + 1;
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, glowColor);
          grad.addColorStop(1, lineColor);

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else if (visMode === 'matrix') {
        // Radial / Matrix scatter dots
        ctx.fillStyle = glowColor;
        ctx.shadowBlur = isActive ? 8 : 2;
        ctx.shadowColor = glowColor;

        const totalPoints = 64;
        const sliceWidth = width / totalPoints;
        
        for (let i = 0; i < totalPoints; i++) {
          let amplitude = 0;
          if (isActive && spectrum.length > 0) {
            const index = Math.floor((i / totalPoints) * spectrum.length);
            amplitude = (spectrum[index] / 255);
          } else {
            amplitude = Math.random() * 0.1;
          }

          const px = i * sliceWidth + (sliceWidth / 2);
          const py = height / 2 + (Math.random() > 0.5 ? 1 : -1) * (amplitude * height / 2);
          const size = Math.max(1, amplitude * 4);

          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else {
        // Oscilloscope Waveform (default)
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = lineColor;
        ctx.shadowBlur = isActive ? 8 : 0;
        ctx.shadowColor = glowColor;

        const sliceWidth = width / 64;
        let x = 0;
        const t = Date.now() * 0.005;

        for (let i = 0; i < 64; i++) {
          let v = 0;
          if (isActive && spectrum.length > 0) {
            const index = Math.floor((i / 64) * spectrum.length);
            // using frequency data to emulate wave (since we don't have raw time domain bytes exposed currently)
            v = ((spectrum[index] - 128) / 128) * 0.8;
          } else {
            // Idle radio static baseline
            const noise = (Math.sin(i * 0.3 + t * 2) * 0.05) + (Math.cos(i * 0.8 - t) * 0.03);
            const carrierPeak = Math.exp(-Math.pow(i - 32, 2) / 20) * 0.15;
            v = noise + carrierPeak;
          }

          const y = (v * height / 2) + height / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, [radioState, currentRoom, freqNum, visMode]);

  return (
    <div 
      ref={containerRef} 
      className="w-full select-none relative overflow-hidden my-1"
    >
      <div className="relative flex justify-center">
        <canvas ref={canvasRef} className="w-full h-[54px] block" />
      </div>

      <div className="flex justify-between items-center text-[8px] font-mono text-[#2a3311]/70 px-4 mt-0.5">
        <span>{mhzBase - 1}.5M</span>
        <span>{mhzBase}.0M</span>
        <span className="text-[#2a3311] font-bold">{mhzBase}.{khzPartStr} MHz</span>
        <span>{mhzBase + 1}.0M</span>
        <span className="text-[#2a3311] font-bold">{peakDb} dBm</span>
      </div>
    </div>
  );
}
