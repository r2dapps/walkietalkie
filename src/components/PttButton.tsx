import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function PttButton() {
  const { state, startPTT, stopPTT, pttLocked } = useAppContext();
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
    if (pttLocked) {
      triggerHaptic('press'); // Just a tiny bump
      return;
    }
    
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

      {/* Heavy Tactile Outer Housing Ring */}
      <div className="p-3 bg-gradient-to-b from-[#2a343d] via-[#1a2228] to-[#0f1418] rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.15)] border border-white/10 relative">
        
        {/* Ridged Bevel Grip Ring */}
        <div className="p-2.5 rounded-full bg-radial from-[#151d24] to-[#090d10] border border-black/80 shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)]">
          
          <div 
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl z-10 select-none touch-none ${!isJoined ? 'bg-slate-800 border-4 border-slate-700 cursor-not-allowed opacity-50' : pttLocked ? 'bg-slate-800 border-4 border-slate-700 cursor-not-allowed' : isTransmitting ? 'bg-rose-600 border-4 border-rose-400 scale-[0.98] shadow-[0_0_50px_rgba(225,29,72,0.8)] cursor-pointer' : isReceiving ? 'bg-emerald-600 border-4 border-emerald-400 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'bg-slate-800 border-4 border-slate-600 hover:border-slate-500 cursor-pointer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
            onPointerDown={(isJoined && !pttLocked) ? handlePointerDown : undefined}
            onPointerUp={(isJoined && !pttLocked) ? handlePointerUp : undefined}
            onPointerCancel={(isJoined && !pttLocked) ? handlePointerCancel : undefined}
            onPointerLeave={(isJoined && !pttLocked) ? handlePointerLeave : undefined}
            style={{ touchAction: 'none' }}
          >
            {/* Tactile Rubber Grip Texture Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px] opacity-5 pointer-events-none rounded-full"></div>

            {/* Inner ring & icon */}
            <div className="absolute inset-2 rounded-full border border-white/10 flex flex-col items-center justify-center pointer-events-none">
              {pttLocked ? (
                <i className="fa-solid fa-lock text-5xl text-slate-500 mb-2 drop-shadow-md"></i>
              ) : isBusy ? (
                <i className="fa-solid fa-spinner fa-spin text-5xl text-white/50 mb-2"></i>
              ) : isTransmitting ? (
                <i className="fa-solid fa-microphone-lines text-5xl text-white mb-2 drop-shadow-md animate-pulse"></i>
              ) : (
                <i className={`fa-solid fa-microphone text-5xl mb-2 drop-shadow-md ${isReceiving ? 'text-white' : 'text-slate-400'}`}></i>
              )}
              <span className={`text-[10px] font-bold tracking-widest font-mono uppercase ${isTransmitting || isReceiving ? 'text-white' : 'text-slate-500'}`}>
                {pttLocked ? 'PTT LOCKED' : !isJoined ? 'OFFLINE' : isTransmitting ? 'TRANSMITTING' : isReceiving ? 'RECEIVING' : holdMode ? 'HOLD TO TALK' : 'TAP TO TOGGLE'}
              </span>
            </div>
          </div>

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
