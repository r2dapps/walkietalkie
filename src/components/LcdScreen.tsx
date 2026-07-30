import React from 'react';
import { useAppContext } from '../context/AppContext';
import SignalStrengthIcon from './SignalStrengthIcon';
import FrequencyScanner from './FrequencyScanner';
import { EqPreset, VisualizerMode } from '../types';
import { showToast } from './ui/ToastManager';

export default function LcdScreen() {
  const { state, storage, joinFrequency, firebase, pttLocked } = useAppContext();
  const { currentRoom, radioState, activeSpeaker, audioPrefs, peers, myCallsign, passcode } = state;
  
  const isTx = radioState === 'transmitting';
  const isRx = radioState === 'receiving';
  const activeCount = Object.keys(peers).length + 1;

  // Calculate realistic VHF/UHF radio frequency from channel name
  const freqNum = currentRoom.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mhzBase = 144 + (freqNum % 4);
  const khzPart = ((freqNum * 125) % 995).toString().padStart(3, '0');
  const freqDisplay = `${mhzBase}.${khzPart}`;
  
  // Extract Squad Code and NATO Channel
  const parts = currentRoom.split('-');
  const squadCode = parts.length > 1 ? parts.slice(0, -1).join('-') : currentRoom;
  const natoChannel = parts.length > 1 ? parts[parts.length - 1] : 'alpha';

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

  // Visualizer Mode Cycle handler
  const cycleVisMode = () => {
    const modes: VisualizerMode[] = ['waveform', 'spectrum', 'matrix'];
    const currentMode = audioPrefs.visualizerMode || 'waveform';
    const currentIndex = modes.indexOf(currentMode as VisualizerMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    storage.updateAudioPrefs({ visualizerMode: modes[nextIndex] });
  };


  const handleBroadcastInvite = () => {
    const friends = Object.values(storage.getFriends() as Record<string, any>);
    if (friends.length === 0) {
      showToast('No squad members to invite', 'warning');
      return;
    }
    friends.forEach(f => {
      firebase.sendInvitePing(f.callsign, state.currentRoom, state.myCallsign, state.passcode);
    });
    showToast(`Broadcasted invite to ${friends.length} squad members`, 'success');
  };

  return (
    <div 
      className="relative bg-[#a4c214] border-8 border-slate-900 rounded-xl p-2 font-vt323 overflow-hidden select-none text-[#2a3311]"
      style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4), inset 0 0 10px rgba(120, 150, 20, 0.8), 0 4px 15px rgba(0,0,0,0.5)' }}
    >
      
      {/* Subtle Screen Scanline Backdrop Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0"></div>
      
      {/* Vertical Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[length:24px_100%] pointer-events-none opacity-30 z-0"></div>

      {/* Screen Gloss Highlight */}
      <div className="absolute -top-12 -left-12 w-48 h-24 bg-white/5 rotate-45 rounded-full blur-sm pointer-events-none z-10"></div>

      <div className="relative z-10">
        {/* Top Status LED Row & Signal Indicator */}
        <div className="flex justify-between items-center pb-1 border-b border-white/10 text-[11px] font-mono tracking-widest text-slate-400">
          
          {/* LED Indicators */}
          <div className="flex items-center space-x-2">

            <div className="flex items-center space-x-1">
              <div className={`w-2.5 h-2.5 rounded-full border border-black ${isTx ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse' : 'bg-[#2a3311]/40'}`}></div>
              <span className={isTx ? 'text-rose-600 font-bold text-[12px]' : 'text-[#2a3311]/70 text-[12px]'}>TX</span>
            </div>

            <div className="flex items-center space-x-1">
              <div className={`w-2.5 h-2.5 rounded-full border border-black ${isRx ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-[#2a3311]/40'}`}></div>
              <span className={isRx ? 'text-emerald-700 font-bold text-[12px]' : 'text-[#2a3311]/70 text-[12px]'}>RX</span>
            </div>

            {audioPrefs.voxEnabled && (
              <span className="bg-[#2a3311]/10 text-[#2a3311] px-1 rounded text-[10px] font-bold border border-[#2a3311]/30">
                VOX
              </span>
            )}
          </div>

          {/* Integrated Signal Strength Icon (P2P Connectivity Telemetry) */}
          <div className="scale-90 origin-center opacity-80 text-[#2a3311]">
            <SignalStrengthIcon />
          </div>

          {/* Radio Parameters & Interactive EQ Filter Button */}
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#2a3311]">
            <span>VHF</span>
            <span className="opacity-50">•</span>
            
            {/* Broadcast Invite Button */}
            <button 
              onClick={handleBroadcastInvite}
              className="bg-[#2a3311]/10 hover:bg-[#2a3311]/20 text-[#2a3311] px-2 py-0.5 rounded border border-[#2a3311]/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
              title="Broadcast Invite to Squad"
            >
              <i className="fa-solid fa-share-nodes"></i>
            </button>
          </div>

        </div>

        {/* Frequency & Channel Main Telemetry */}
        <div className="pt-1 text-center flex flex-col items-center justify-center text-[#2a3311]">
          
          <div className="flex flex-col w-full px-1 font-mono">
            {/* Top Row: Channel Name | Frequency | PL Tone */}
            <div className="flex items-center justify-between w-full">
              <span className="uppercase font-bold text-sm tracking-widest">CH-{natoChannel.substring(0,3)}</span>
              <span className="tracking-widest font-black text-2xl drop-shadow-[0_0_2px_rgba(42,51,17,0.5)]">{freqDisplay} <span className="text-sm">MHz</span></span>
              <span className="text-[11px] font-bold">PL: {plToneDisplay}</span>
            </div>

            {/* Second Row: EQ | Channel Title | OPR */}
            <div className="flex items-center justify-between w-full mt-1.5">
              
              {/* Below CH-01: Radio Effects Toggle (EQ) */}
              <div className="flex flex-col items-start w-1/3">
                <button 
                  onClick={cycleEqPreset}
                  className="bg-[#2a3311]/10 hover:bg-[#2a3311]/20 text-[#2a3311] px-2 py-0.5 rounded border border-[#2a3311]/40 text-[10px] font-bold font-mono tracking-wider cursor-pointer transition-all active:scale-95 uppercase"
                  title="Cycle EQ Filter preset"
                >
                  EQ: {currentEqObj.label}
                </button>
              </div>

              {/* Center: Squad Code */}
              <div className="w-1/3 text-center">
                <div className="text-xl font-black font-vt323 tracking-widest text-[#2a3311] drop-shadow-[0_0_4px_rgba(42,51,17,0.3)] uppercase truncate px-1">
                  #{squadCode}
                </div>
              </div>

              {/* Below PL: OPR count */}
              <div className="flex flex-col items-end w-1/3">
                <span className="font-bold text-[11px] text-[#2a3311]">
                  <i className="fa-solid fa-users text-[10px] mr-0.5"></i>{activeCount} OPR
                </span>
              </div>
            </div>
          </div>



          {/* Active Transmitting Operator Banner & VIS Toggle */}
          <div className="h-5 flex items-center justify-between w-full my-0.5 px-1">
            
            {/* Banner Side */}
            <div className="flex-1 flex items-center justify-start overflow-hidden">
              {isRx && activeSpeaker ? (
                <div className="bg-[#2a3311] text-[#a4c214] px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider animate-pulse flex items-center space-x-1.5 truncate">
                  <i className="fa-solid fa-volume-high text-[10px]"></i>
                  <span className="truncate">RX: {activeSpeaker}</span>
                </div>
              ) : isTx ? (
                <div className="bg-[#2a3311] text-[#a4c214] px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider animate-pulse flex items-center space-x-1.5 truncate">
                  <i className="fa-solid fa-microphone text-[10px]"></i>
                  <span className="truncate">BROADCASTING</span>
                </div>
              ) : (
                <div className="text-[11px] text-[#2a3311]/70 font-mono tracking-widest uppercase flex items-center space-x-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#2a3311]/60 animate-ping mr-1 shrink-0"></span>
                  <span className="truncate">STANDBY — CLEAR</span>
                </div>
              )}
            </div>

            {/* VIS Toggle Side */}
            <button 
              onClick={cycleVisMode}
              className="bg-[#2a3311]/10 hover:bg-[#2a3311]/20 text-[#2a3311] px-2 py-0.5 rounded border border-[#2a3311]/40 text-[10px] font-bold font-mono tracking-wider cursor-pointer transition-all active:scale-95 uppercase shrink-0 ml-2"
              title="Cycle Visualizer Mode"
            >
              VIS: {audioPrefs.visualizerMode || 'WAVEFORM'}
            </button>
          </div>

        </div>

        {/* Embedded Canvas Real-time Spectrum Scanner */}
        <div className="opacity-80 mix-blend-color-burn">
          <FrequencyScanner embedded={true} />
        </div>

        {/* Bottom S-Meter (Signal Strength Bar) */}
        <div className="pt-1 mt-0.5 border-t border-[#2a3311]/20 flex items-center justify-between text-[11px] font-mono font-bold text-[#2a3311]">
          
          <div className="flex items-center space-x-1">
            <span className="text-[#2a3311]/70 mr-1">S-METER</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((bar) => {
              const isActive = (isTx || isRx) ? bar <= 8 : bar <= 3;
              const isHigh = bar >= 7;
              return (
                <div
                  key={bar}
                  className={`w-1.5 rounded-xs transition-all ${
                    isActive
                      ? isHigh
                        ? 'bg-[#2a3311] h-2.5'
                        : 'bg-[#2a3311] h-2'
                      : 'bg-[#2a3311]/20 h-1.5'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center space-x-2 text-[#2a3311]/80">
            <span>PWR: <strong className="text-[#2a3311]">5W</strong></span>
            <span>BAT: <strong className="text-[#2a3311]"><i className="fa-solid fa-battery-full text-[10px]"></i> 98%</strong></span>
          </div>

        </div>

      </div>

    </div>
  );
}
