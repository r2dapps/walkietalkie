import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { showToast } from './ui/ToastManager';
import LcdScreen from './LcdScreen';
import AudioVisualizer from './AudioVisualizer';
import PttButton from './PttButton';
import FrequencyScanner from './FrequencyScanner';
import SignalStrengthIcon from './SignalStrengthIcon';
import UserGuideModal from './modals/UserGuideModal';
import ShareModal from './modals/ShareModal';

export default function RadioView() {
  const { state, leaveFrequency, totSecondsLeft, pttLocked, setPttLocked } = useAppContext();
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [torchSupported, setTorchSupported] = useState<boolean | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Clean up flashlight on component unmount
  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      videoTrackRef.current = null;
    };
  }, []);

  const toggleFlashlight = async () => {
    try {
      // If torch is already on, turn it off
      if (flashlightOn && videoTrackRef.current) {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: false }]
        });
        videoStreamRef.current?.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
        videoTrackRef.current = null;
        setFlashlightOn(false);
        setTorchSupported(null);
        showToast('Flashlight OFF', 'info');
        return;
      }

      // Request camera access to control torch
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
          showToast('Failed to access camera', 'error');
          return;
        }

        // Check if device supports torch
        const capabilities = videoTrack.getCapabilities?.() as any;
        const supportsTorch = capabilities?.torch === true;

        if (!supportsTorch) {
          showToast('Your device does not support flashlight control', 'warning');
          stream.getTracks().forEach(track => track.stop());
          setTorchSupported(false);
          return;
        }

        // Enable torch
        await videoTrack.applyConstraints({
          advanced: [{ torch: true }]
        });

        videoStreamRef.current = stream;
        videoTrackRef.current = videoTrack;
        setFlashlightOn(true);
        setTorchSupported(true);
        showToast('✨ Flashlight ON', 'success');
      } catch (permErr: any) {
        if (permErr.name === 'NotAllowedError') {
          showToast('Camera permission denied. Enable in settings to use flashlight.', 'warning');
        } else if (permErr.name === 'NotFoundError') {
          showToast('No camera found on this device', 'warning');
          setTorchSupported(false);
        } else {
          showToast('Failed to enable flashlight', 'error');
        }
      }
    } catch (err) {
      console.error('Flashlight toggle error:', err);
      showToast('Flashlight error', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] relative overflow-hidden">
      
      {/* Flashlight Status Indicator */}
      {flashlightOn && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 text-black px-4 py-2 rounded-full font-bold text-sm flex items-center space-x-2 shadow-lg border border-amber-300 backdrop-blur-sm">
          <i className="fa-solid fa-lightbulb animate-pulse text-lg"></i>
          <span>DEVICE FLASHLIGHT ACTIVE</span>
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

          {/* Share Button */}
          <button
            onClick={() => setShareOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:text-white hover:bg-cyan-500/30 transition-all"
            title="Share Frequency"
          >
            <i className="fa-solid fa-qrcode text-xs"></i>
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
            onClick={() => leaveFrequency(false)}
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

      {/* Share Modal */}
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />

    </div>
  );
}
