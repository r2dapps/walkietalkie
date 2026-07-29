import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import LcdScreen from './LcdScreen';
import AudioVisualizer from './AudioVisualizer';
import PttButton from './PttButton';
import FrequencyScanner from './FrequencyScanner';
import SignalStrengthIcon from './SignalStrengthIcon';
import UserGuideModal from './modals/UserGuideModal';

export default function RadioView() {
  const { state, leaveFrequency, totSecondsLeft, pttLocked, setPttLocked } = useAppContext();
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const toggleFlashlight = async () => {
    if (flashlightOn) {
      if (videoTrackRef.current) {
        try {
          // @ts-ignore
          await videoTrackRef.current.applyConstraints({ advanced: [{ torch: false }] });
          videoTrackRef.current.stop();
        } catch (e) {
          console.log('Torch turn off error', e);
        }
        videoTrackRef.current = null;
      }
      setFlashlightOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        const track = stream.getVideoTracks()[0];
        if (track) {
          videoTrackRef.current = track;
          // @ts-ignore
          if ('torch' in track.getCapabilities()) {
            // @ts-ignore
            await track.applyConstraints({ advanced: [{ torch: true }] });
          }
        }
      } catch (e) {
        console.log('Camera torch hardware not available, falling back to screen beacon', e);
      }
      setFlashlightOn(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] relative overflow-hidden">
      
      {/* Screen Emergency Flashlight Overlay when active */}
      {flashlightOn && (
        <div 
          onClick={toggleFlashlight}
          className="fixed inset-0 z-50 bg-white shadow-[0_0_100px_rgba(255,255,255,1)] flex flex-col items-center justify-between p-6 text-black cursor-pointer animate-pulse"
        >
          <div className="text-xs font-bold uppercase tracking-widest bg-black/10 px-3 py-1 rounded-full">
            Emergency Flashlight / Strobe Active — Tap Anywhere To Extinguish
          </div>
          <div className="text-center space-y-2">
            <i className="fa-solid fa-lightbulb text-6xl text-amber-500 animate-bounce"></i>
            <h2 className="text-2xl font-black font-orbitron uppercase">FLASH BEACON ON</h2>
          </div>
          <button 
            onClick={toggleFlashlight}
            className="px-6 py-2 bg-black text-white rounded-full font-bold uppercase text-xs tracking-wider shadow-lg"
          >
            Turn Off Flashlight
          </button>
        </div>
      )}

      {/* Top Header & Tactical Toolbar */}
      <div className="h-16 flex items-center justify-between px-3 bg-[var(--panel)] border-b border-white/10 shrink-0 z-20">
        <div className="flex items-center space-x-2">
          <i className="fa-solid fa-satellite-dish text-[var(--accent)] text-lg"></i>
          <div>
            <span className="font-orbitron font-black tracking-wider text-sm uppercase block">AetherTalk</span>
            <span className="text-[9px] text-slate-400 font-mono tracking-widest -mt-1 block">TACTICAL RADIO</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-2">

          {/* PTT Lock Button */}
          <button
            onClick={() => setPttLocked(!pttLocked)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
              pttLocked
                ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_#f43f5e]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle PTT Lock (Pocket Mode)"
          >
            <i className={`fa-solid ${pttLocked ? 'fa-lock' : 'fa-lock-open'} text-xs`}></i>
          </button>

          {/* Flashlight Toggle Button */}
          <button
            onClick={toggleFlashlight}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
              flashlightOn
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_#f59e0b]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Tactical Flashlight"
          >
            <i className={`fa-solid fa-lightbulb text-xs ${flashlightOn ? 'animate-bounce' : ''}`}></i>
          </button>

          {/* User Guide & NATO Helper */}
          <button
            onClick={() => setGuideOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            title="Field Guide & NATO Phonetic"
          >
            <i className="fa-solid fa-book-bookmark text-xs"></i>
          </button>

          {/* Disconnect Button */}
          <button 
            onClick={leaveFrequency}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-all"
            title="Leave Channel"
          >
            <i className="fa-solid fa-power-off text-xs"></i>
          </button>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-3 pt-3 pb-2 overflow-y-auto space-y-2">
        
        {/* Unified LCD Display containing Telemetry, Connectivity, & Spectrum Scanner */}
        <div className="shrink-0 w-full max-w-sm mx-auto">
          <LcdScreen />
        </div>
        
        {/* PTT Button Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center min-h-[220px]">
          {/* PTT Button Foreground */}
          <div className="relative z-10 w-full flex justify-center">
            <PttButton />
          </div>
          
          {/* TOT Badge */}
          {state.radioState === 'transmitting' && totSecondsLeft <= 10 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-rose-600 border border-rose-300 text-white text-xs font-bold px-4 py-1 rounded-full animate-bounce shadow-lg font-mono z-20">
              TOT WARNING: {totSecondsLeft}s
            </div>
          )}
        </div>
        
      </div>

      {/* User Guide Modal */}
      <UserGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

    </div>
  );
}
