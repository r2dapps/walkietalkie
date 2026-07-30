import React, { useEffect, useRef } from 'react';

interface FMEqualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
}

export default function FMEqualizer({ audioElement, isPlaying }: FMEqualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    if (!audioElement || !isPlaying) return;

    // Initialize Web Audio API
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128; // 64 frequency bins
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      try {
        // Prevent double connections
        if (!(audioElement as any)._hasSourceNode) {
          const source = ctx.createMediaElementSource(audioElement);
          source.connect(analyser);
          analyser.connect(ctx.destination);
          sourceRef.current = source;
          (audioElement as any)._hasSourceNode = true;
        }
      } catch (err) {
        console.warn('Audio node already connected', err);
      }
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Fallback for CORS restricted streams (getByteFrequencyData will return 0s)
        // If dataArray is all 0s but isPlaying is true, we simulate some telemetry
        let barHeight = dataArray[i];
        
        // CORS simulation fallback if stream blocks analyser
        if (barHeight === 0 && i < 30) {
           barHeight = (Math.random() * 0.8 + 0.2) * (height * 0.9) * Math.sin(Date.now() / 200 + i);
           barHeight = Math.abs(barHeight);
        }

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#fcd34d'); // Amber-300 base
        gradient.addColorStop(0.6, '#f59e0b'); // Amber-500 middle
        gradient.addColorStop(1, '#dc2626'); // Red-600 peak

        ctx.fillStyle = gradient;
        
        // Draw segmented bars for retro LED effect
        const segments = 8;
        const segmentHeight = barHeight / segments;
        const gap = 1;

        for (let s = 0; s < segments; s++) {
          const y = height - (s * segmentHeight);
          if (y > height - barHeight) {
            ctx.fillRect(x, y - segmentHeight + gap, barWidth - 1, segmentHeight - gap);
          }
        }
        
        x += barWidth + 2;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement, isPlaying]);

  return (
    <div className="w-full max-w-[250px] mx-auto h-16 bg-[#1a1311] border-2 border-[#3e2723] rounded p-1.5 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
      {/* Retro LCD/VFD background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.5) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.5) 2px)' }}></div>
      <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,1)] pointer-events-none"></div>

      <canvas 
        ref={canvasRef} 
        width={250} 
        height={60} 
        className="w-full h-full opacity-90 filter drop-shadow-[0_0_2px_rgba(245,158,11,0.6)]"
      />
    </div>
  );
}
