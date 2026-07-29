import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { showToast } from './ui/ToastManager';

export default function TuningKnob() {
  const { state, joinFrequency, pttLocked } = useAppContext();
  const { currentRoom, myCallsign, passcode } = state;

  const knobRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const isDragging = useRef(false);
  const startAngle = useRef(0);
  const currentAngleRef = useRef(0);

  const presets = [
    { label: 'α-1 (146.520)', room: 'alpha1', freq: '146.520' },
    { label: 'β-2 (147.120)', room: 'bravo2', freq: '147.120' },
    { label: 'CH-03 (147.450)', room: 'ch3', freq: '147.450' },
    { label: 'CH-04 (147.800)', room: 'ch4', freq: '147.800' },
    { label: 'TAC-9 (147.960)', room: 'tactical9', freq: '147.960' },
    { label: 'FAM-1 (148.125)', room: 'family1', freq: '148.125' },
  ];

  const currentIndex = Math.max(0, presets.findIndex(p => p.room === currentRoom));

  useEffect(() => {
    // Sync knob angle to current preset index
    const targetAngle = currentIndex * 45;
    setAngle(targetAngle);
    currentAngleRef.current = targetAngle;
  }, [currentIndex]);

  const triggerHapticNotch = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch (e) {}
    }
  };

  const tuneToIndex = (newIndex: number) => {
    if (pttLocked) {
      showToast('Radio is locked. Unlock to tune frequency.', 'warning');
      return;
    }
    const wrappedIdx = (newIndex + presets.length) % presets.length;
    const target = presets[wrappedIdx];
    if (target.room !== currentRoom) {
      triggerHapticNotch();
      joinFrequency(target.room, myCallsign, passcode);
    }
  };

  const handleStep = (direction: 'prev' | 'next') => {
    const nextIdx = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    tuneToIndex(nextIdx);
  };

  // Pointer drag to rotate knob
  const handlePointerDown = (e: React.PointerEvent) => {
    if (pttLocked) {
      showToast('Radio is locked. Unlock to tune frequency.', 'warning');
      return;
    }
    if (!knobRef.current) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    isDragging.current = true;
    
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const deg = rad * (180 / Math.PI);
    startAngle.current = deg - currentAngleRef.current;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !knobRef.current) return;

    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let deg = rad * (180 / Math.PI) - startAngle.current;

    setAngle(deg);

    // Calculate nearest preset index (45 deg per notch)
    const normalizedDeg = ((deg % 360) + 360) % 360;
    const nearestIndex = Math.round(normalizedDeg / 45) % presets.length;

    if (nearestIndex !== currentIndex) {
      tuneToIndex(nearestIndex);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
    isDragging.current = false;
  };

  return (
    <div className="flex items-center justify-between bg-[#080d12] border border-white/10 rounded-lg px-2.5 py-1.5 my-1.5 select-none shadow-inner">
      {/* Tune Down Button */}
      <button
        onClick={() => handleStep('prev')}
        className="w-7 h-7 flex items-center justify-center rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/15 active:scale-90 transition-all cursor-pointer"
        title="Previous Frequency Notch"
      >
        <i className="fa-solid fa-chevron-left text-xs"></i>
      </button>

      {/* Center Dial and Frequency Info */}
      <div className="flex items-center space-x-3">
        {/* Rotatable Physical Dial Knob */}
        <div 
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#3a4650] via-[#212a32] to-[#0f151a] border-2 border-slate-600 shadow-[0_3px_8px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.3)] relative cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
          title="Drag knob to rotate and tune frequency"
        >
          {/* Outer Ridge Grip Ticks */}
          <div className="absolute inset-0.5 rounded-full border border-dashed border-slate-500/40 pointer-events-none"></div>

          {/* Rotatable Indicator Notch */}
          <div 
            className="w-full h-full rounded-full relative transition-transform duration-75"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            {/* White Indicator Dot at Top */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]"></div>
          </div>
        </div>

        {/* Selected Preset Details */}
        <div className="flex flex-col">
          <span className="text-[9px] font-mono text-slate-400 tracking-wider">ROTARY TUNE</span>
          <span className="text-xs font-mono font-bold text-[var(--accent)] tracking-wider">
            {presets[currentIndex].label}
          </span>
        </div>
      </div>

      {/* Tune Up Button */}
      <button
        onClick={() => handleStep('next')}
        className="w-7 h-7 flex items-center justify-center rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/15 active:scale-90 transition-all cursor-pointer"
        title="Next Frequency Notch"
      >
        <i className="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>
  );
}
