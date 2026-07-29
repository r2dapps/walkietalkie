import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function PttButton() {
  const { state, startPTT, stopPTT } = useAppContext();
  const { radioState, audioPrefs, isJoined, activeSpeaker } = state;
  const isTransmitting = radioState === 'transmitting';
  const isReceiving = radioState === 'receiving';
  
  const holdMode = audioPrefs.pttMode === 'hold';
  const isHoldingRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);

  const triggerHaptic = (type: 'press' | 'release') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'press') {
          navigator.vibrate(45);
        } else {
          navigator.vibrate(80);
        }
      } catch (err) {
        // Haptic feedback fallback
      }
    }
  };
  
  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (err) {}

    if (holdMode) {
      isHoldingRef.current = true;
      triggerHaptic('press');
      setIsBusy(true);
      const success = await startPTT();
      setIsBusy(false);
      // If user released pointer while lock/mic was activating, stop transmission immediately
      if (!isHoldingRef.current) {
        stopPTT();
      }
    } else {
      // Toggle mode
      if (isTransmitting) {
        triggerHaptic('release');
        stopPTT();
      } else {
        triggerHaptic('press');
        setIsBusy(true);
        await startPTT();
        setIsBusy(false);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      }
    } catch (err) {}

    if (holdMode) {
      isHoldingRef.current = false;
      triggerHaptic('release');
      stopPTT();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (holdMode) {
      isHoldingRef.current = false;
      triggerHaptic('release');
      stopPTT();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' && 
        !e.repeat && 
        isJoined && 
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        triggerHaptic('press');
        if (holdMode) {
          isHoldingRef.current = true;
          startPTT().then(() => {
            if (!isHoldingRef.current) stopPTT();
          });
        } else if (isTransmitting) {
          triggerHaptic('release');
          stopPTT();
        } else {
          startPTT();
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' && 
        holdMode && 
        isJoined && 
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        isHoldingRef.current = false;
        triggerHaptic('release');
        stopPTT();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isJoined, holdMode, isTransmitting, startPTT, stopPTT]);

  return (
    <div className="flex flex-col items-center justify-center py-4 relative select-none">
      
      {/* Outer Glow Waves when active */}
      {isTransmitting && (
        <>
          <div className="absolute w-44 h-44 rounded-full border-2 border-rose-500/40 animate-ping pointer-events-none" />
          <div className="absolute w-52 h-52 rounded-full border border-rose-500/20 animate-pulse pointer-events-none" />
        </>
      )}

      {isReceiving && (
        <div className="absolute w-44 h-44 rounded-full border-2 border-emerald-500/50 animate-ping pointer-events-none" />
      )}

      {/* Heavy Tactile Outer Housing Ring */}
      <div className="p-3 bg-gradient-to-b from-[#2a343d] via-[#1a2228] to-[#0f1418] rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.15)] border border-white/10 relative">
        
        {/* Ridged Bevel Grip Ring */}
        <div className="p-2.5 rounded-full bg-radial from-[#151d24] to-[#090d10] border border-black/80 shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)]">
          
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            disabled={!isJoined}
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-150 active:scale-95 active:shadow-[inset_0_8px_16px_rgba(0,0,0,0.9)] z-10 cursor-pointer relative overflow-hidden ${
              !isJoined
                ? 'opacity-50 cursor-not-allowed bg-slate-900 text-slate-600 border border-slate-800'
                : isTransmitting
                ? 'bg-gradient-to-b from-rose-500 via-rose-600 to-rose-800 text-white shadow-[0_0_25px_rgba(244,63,94,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-rose-300'
                : isReceiving
                ? 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800 text-white shadow-[0_0_25px_rgba(16,185,129,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-emerald-300'
                : 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 text-slate-300 border-2 border-slate-600/60 shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.15)] hover:border-[var(--accent)] hover:text-white'
            }`}
            style={{ touchAction: 'none' }}
          >
            {/* Tactile Rubber Grip Texture Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px] opacity-10 pointer-events-none"></div>

            <i className={`fa-solid ${
              isBusy 
                ? 'fa-spinner animate-spin text-3xl' 
                : isTransmitting 
                ? 'fa-microphone text-4xl animate-pulse' 
                : isReceiving 
                ? 'fa-volume-high text-4xl animate-bounce' 
                : 'fa-microphone text-3xl'
            } mb-1`}></i>
            
            <span className="font-orbitron font-black tracking-widest text-base uppercase drop-shadow">
              {isBusy ? 'CONNECTING' : isTransmitting ? 'TALKING' : isReceiving ? 'LISTENING' : 'PUSH TO TALK'}
            </span>

            <span className="text-[10px] font-mono tracking-wider opacity-70 mt-0.5 font-bold">
              {holdMode ? 'HOLD TO TRANSMIT' : 'TAP TO TOGGLE'}
            </span>
          </button>

        </div>

      </div>

      {/* Dynamic Radio State Label */}
      <div className="mt-3 text-center h-8 flex items-center justify-center">
        {isTransmitting && (
          <div className="px-4 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-xs uppercase tracking-widest font-mono animate-pulse flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>TRANSMITTING LIVE AUDIO</span>
          </div>
        )}
        {isReceiving && (
          <div className="px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase tracking-widest font-mono animate-pulse flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>RECEIVING: {activeSpeaker || 'OPERATOR'}</span>
          </div>
        )}
        {!isTransmitting && !isReceiving && (
          <div className="text-slate-400 text-xs font-mono tracking-widest uppercase flex items-center space-x-1.5 opacity-80">
            <i className="fa-solid fa-headset text-slate-500"></i>
            <span className="hidden md:inline">PRESS SPACE OR PTT BUTTON</span>
            <span className="md:hidden">PRESS PTT BUTTON</span>
          </div>
        )}
      </div>

    </div>
  );
}
