import React from 'react';
import { useAppContext } from '../../context/AppContext';

export default function PresetsBar() {
  const { state, joinFrequency } = useAppContext();
  const { currentRoom, myCallsign, passcode } = state;

  const defaultPresets = [
    { label: 'α-1', room: 'alpha1' },
    { label: 'β-2', room: 'bravo2' },
    { label: 'TAC-9', room: 'tactical9' },
    { label: 'FAM-1', room: 'family1' }
  ];

  const handleTune = (room: string) => {
    if (room !== currentRoom) {
      joinFrequency(room, myCallsign, passcode);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-1.5 py-1 px-2 bg-slate-950/60 border-t border-b border-white/5 font-mono text-[10px]">
      <span className="text-slate-500 uppercase tracking-widest text-[9px] mr-1">PRESETS:</span>
      {defaultPresets.map(p => (
        <button
          key={p.room}
          onClick={() => handleTune(p.room)}
          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
            currentRoom === p.room
              ? 'bg-[var(--accent)] text-black font-extrabold shadow-[0_0_8px_var(--accent)] scale-105'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
