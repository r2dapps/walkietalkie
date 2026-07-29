import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAudio } from '../hooks/useAudio';

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useAppContext();
  const audio = useAudio();
  const { radioState } = state;
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width;
    let h = canvas.height;
    
    // Auto resize
    const resize = () => {
      w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    };
    window.addEventListener('resize', resize);
    resize();

    const analyser = audio.getAnalyserNode();
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const render = () => {
      if (document.hidden) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      
      const cx = w / 2;
      const cy = h / 2;
      // Ensure the visualizer is larger than the PTT button housing (which is about 180px diameter)
      const baseRadius = Math.min(w, h) * 0.35 + 30;
      const maxExcursion = Math.min(w, h) * 0.15;
      
      let r = 100, g = 116, b = 139; // Standby slate
      let isIdle = true;
      if (radioState === 'transmitting') { r = 244; g = 63; b = 94; isIdle = false; } // rose
      else if (radioState === 'receiving') { r = 16; g = 185; b = 129; isIdle = false; } // emerald
      
      ctx.beginPath();
      
      // Time-based rotation for the organic blob effect
      const t = Date.now() * 0.002;
      
      if (analyser && dataArray && !isIdle) {
        analyser.getByteFrequencyData(dataArray);
        const points = 60; 
        
        for (let i = 0; i <= points; i++) {
          const binIndex = Math.floor((i % points) * (dataArray.length / 4 / points));
          const val = dataArray[binIndex] / 255.0; 
          
          const rads = (Math.PI * 2 * i) / points; 
          const ext = val * maxExcursion;
          const x = cx + Math.cos(rads) * (baseRadius + ext);
          const y = cy + Math.sin(rads) * (baseRadius + ext);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        // Subtle, clean circular ring in standby (no rotating triangles)
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      }
      
      ctx.closePath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
      ctx.lineWidth = isIdle ? 3 : 5;
      ctx.stroke();
      
      // Subtle fill
      const grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, baseRadius * 1.5);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [radioState, audio]);

  return (
    <div className="w-full h-48 flex items-center justify-center my-4">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
