import React from 'react';
import { useAppContext } from '../context/AppContext';
import SignalStrengthIcon from './SignalStrengthIcon';
import FrequencyScanner from './FrequencyScanner';
import TuningKnob from './TuningKnob';
import { EqPreset } from '../types';

export default function LcdScreen() {
  const { state, storage, joinFrequency } = useAppContext();
  const { currentRoom, radioState, activeSpeaker, audioPrefs, peers, myCallsign, passcode } = state;
  
  const isTx = radioState === 'transmitting';
  const isRx = radioState === 'receiving';
  const activeCount = Object.keys(peers).length + 1;

  // Calculate realistic VHF/UHF radio frequency from channel name
  const freqNum = currentRoom.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mhzBase = 144 + (freqNum % 4);
  const khzPart = ((freqNum * 125) % 995).toString().padStart(3, '0');
  const freqDisplay = `${mhzBase}.${khzPart}`;

  // CTCSS Sub-audible tone calculation derived from channel
  const plTones = ['88.5 Hz', '100.0 Hz', '103.5 Hz', '110.9 Hz', '123.0 Hz', '141.3 Hz'];
  const plToneDisplay = plTones[freqNum % plTones.length];

  // EQ Cycle handler
  const eqPresets: { id: EqPreset; label: string }[] = [
    { id: 'military', label: 'MIL' },
    { id: 'analog_fm', label: 'FM' },
    { id: 'cb_radio', label: 'CB' },
    { id: 'vintage', label: 'TUBE' },
    { id: 'clean', label: 'CLN' }
  ];

  const currentEqObj = eqPresets.find(p => p.id === audioPrefs.eqPreset) || eqPresets[0];

  const cycleEqPreset = () => {
    const currentIndex = eqPresets.findIndex(p => p.id === audioPrefs.eqPreset);
    const nextIndex = (currentIndex + 1) % eqPresets.length;
    storage.updateAudioPrefs({ eqPreset: eqPresets[nextIndex].id });
  };

  // Quick Preset Tune Handler
  const channelPresets = [
    { label: 'α-1', room: 'alpha1' },
    { label: 'β-2', room: 'bravo2' },
    { label: 'TAC-9', room: 'tactical9' },
    { label: 'FAM-1', room: 'family1' }
  ];

  const handleQuickTune = (targetRoom: string) => {
    if (targetRoom !== currentRoom) {
      joinFrequency(targetRoom, myCallsign, passcode);
    }
  };

  return (
    <div className="relative bg-[#0d161a] border-4 border-[#1e2d36] rounded-xl p-3 font-share-tech shadow-[inset_0_0_25px_rgba(0,0,0,0.8),0_4px_15px_rgba(0,0,0,0.5)] overflow-hidden select-none">
      
      {/* Subtle Screen Scanline Backdrop Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0"></div>

      {/* Screen Gloss Highlight */}
      <div className="absolute -top-12 -left-12 w-48 h-24 bg-white/5 rotate-45 rounded-full blur-sm pointer-events-none z-10"></div>

      <div className="relative z-10">
        {/* Top Status LED Row & Signal Indicator */}
        <div className="flex justify-between items-center pb-2 border-b border-white/10 text-[11px] font-mono tracking-widest text-slate-400">
          
          {/* LED Indicators */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-2.5 h-2.5 rounded-full border border-black ${isTx ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse' : 'bg-rose-950/80'}`}></div>
              <span className={isTx ? 'text-rose-400 font-bold text-[10px]' : 'text-slate-600 text-[10px]'}>TX</span>
            </div>

            <div className="flex items-center space-x-1">
              <div className={`w-2.5 h-2.5 rounded-full border border-black ${isRx ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-emerald-950/80'}`}></div>
              <span className={isRx ? 'text-emerald-400 font-bold text-[10px]' : 'text-slate-600 text-[10px]'}>RX</span>
            </div>

            {audioPrefs.voxEnabled && (
              <span className="bg-amber-500/20 text-amber-400 px-1 rounded text-[8px] font-bold border border-amber-500/30">
                VOX
              </span>
            )}
          </div>

          {/* Integrated Signal Strength Icon (P2P Connectivity Telemetry) */}
          <div className="scale-90 origin-center">
            <SignalStrengthIcon />
          </div>

          {/* Radio Parameters & Interactive EQ Filter Button */}
          <div className="flex items-center space-x-1.5 text-[9px]">
            <span className="text-emerald-400/80 font-bold">VHF</span>
            <span className="text-slate-500">•</span>
            
            {/* Interactive EQ Cycle Button */}
            <button 
              onClick={cycleEqPreset}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/40 text-[8px] font-bold font-mono tracking-wider cursor-pointer transition-all active:scale-95"
              title="Click to cycle EQ Filter preset"
            >
              EQ: {currentEqObj.label}
            </button>

            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-bold"><i className="fa-solid fa-users text-[8px] mr-0.5"></i>{activeCount}</span>
          </div>

        </div>

        {/* Frequency & Channel Main Telemetry */}
        <div className="pt-2 pb-1 text-center flex flex-col items-center justify-center">
          
          <div className="flex items-center justify-between w-full text-xs text-[var(--accent)]/70 px-1 font-mono">
            <span>CH-01</span>
            <span className="tracking-widest font-bold text-[var(--accent)]">{freqDisplay} MHz</span>
            <span className="text-[9px] text-emerald-400/80 font-bold">PL: {plToneDisplay}</span>
          </div>

          {/* Main Digital Channel Title */}
          <div className="text-2xl sm:text-3xl font-black font-orbitron tracking-widest text-[var(--accent)] drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] uppercase my-0.5 truncate w-full px-2">
            #{currentRoom}
          </div>

          {/* Rotatable Physical Tuning Dial Knob */}
          <div className="w-full my-1">
            <TuningKnob />
          </div>

          {/* Active Transmitting Operator Banner */}
          <div className="h-5 flex items-center justify-center w-full my-0.5">
            {isRx && activeSpeaker ? (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider animate-pulse flex items-center space-x-1.5">
                <i className="fa-solid fa-volume-high text-[9px]"></i>
                <span>RX: {activeSpeaker}</span>
              </div>
            ) : isTx ? (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider animate-pulse flex items-center space-x-1.5">
                <i className="fa-solid fa-microphone text-[9px]"></i>
                <span>BROADCASTING LIVE</span>
              </div>
            ) : (
              <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-ping mr-1"></span>
                <span>STANDBY — FREQUENCY CLEAR</span>
              </div>
            )}
          </div>

        </div>

        {/* Embedded D3 Real-time Spectrum Scanner */}
        <FrequencyScanner embedded={true} />

        {/* Bottom S-Meter (Signal Strength Bar) */}
        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
          
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 text-[9px] font-bold mr-1">S-METER</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((bar) => {
              const isActive = (isTx || isRx) ? bar <= 8 : bar <= 3;
              const isHigh = bar >= 7;
              return (
                <div
                  key={bar}
                  className={`w-1.5 rounded-xs transition-all ${
                    isActive
                      ? isHigh
                        ? 'bg-rose-500 h-2.5 shadow-[0_0_5px_#f43f5e]'
                        : 'bg-emerald-400 h-2 shadow-[0_0_5px_#10b981]'
                      : 'bg-slate-800 h-1.5'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center space-x-2 text-slate-400 text-[9px]">
            <span>PWR: <strong className="text-emerald-400">5W</strong></span>
            <span>BAT: <strong className="text-emerald-400"><i className="fa-solid fa-battery-full text-[9px]"></i> 98%</strong></span>
          </div>

        </div>

      </div>

    </div>
  );
}
