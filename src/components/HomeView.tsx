import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function HomeView() {
  const { setAppMode } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 items-center justify-center bg-[var(--bg)] relative">
      
      <div className="mb-12 flex flex-col items-center">
        <div className="w-32 h-32 bg-[var(--panel)] border-2 border-[var(--accent)] rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(6,182,212,0.3)] text-5xl text-[var(--accent)]">
          <i className="fa-solid fa-satellite-dish"></i>
        </div>
        <h1 className="text-4xl font-bold tracking-widest uppercase text-white mb-2 font-orbitron">AetherTalk</h1>
        <div className="text-[var(--accent)] text-sm tracking-widest font-mono uppercase">
          Tactical Comms & Radio
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <button 
          onClick={() => setAppMode('walkie')}
          className="w-full relative overflow-hidden group bg-[var(--panel)] border border-white/10 p-6 rounded-xl shadow-2xl hover:border-[var(--accent)] transition-all flex flex-col items-center text-center active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <i className="fa-solid fa-walkie-talkie text-4xl text-white mb-4 group-hover:text-[var(--accent)] transition-colors"></i>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase font-orbitron mb-2">Tactical Walkie-Talkie</h2>
          <p className="text-slate-400 text-xs font-mono">P2P Squad Comms • NATO Channels</p>
        </button>

        <button 
          onClick={() => setAppMode('fm')}
          className="w-full relative overflow-hidden group bg-[var(--panel)] border border-white/10 p-6 rounded-xl shadow-2xl hover:border-emerald-500 transition-all flex flex-col items-center text-center active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <i className="fa-solid fa-radio text-4xl text-white mb-4 group-hover:text-emerald-500 transition-colors"></i>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase font-orbitron mb-2">Live FM Radio</h2>
          <p className="text-slate-400 text-xs font-mono">Public Radio Streams • Music & News</p>
        </button>
      </div>
      
    </div>
  );
}
