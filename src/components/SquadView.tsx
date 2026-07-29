import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function SquadView() {
  const { storage } = useAppContext();
  const friends = Object.values(storage.getFriends());

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      <div className="h-14 flex items-center justify-between px-4 bg-[var(--panel)] border-b border-white/5 shrink-0">
        <h2 className="font-bold tracking-wider text-sm uppercase text-[var(--accent)]">Squad / Friends</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-slate-500 text-center">
        <i className="fa-solid fa-crosshairs text-4xl opacity-50 mb-4"></i>
        <p className="text-sm font-mono uppercase tracking-widest max-w-[200px]">No squad members registered yet</p>
        <button className="mt-6 px-4 py-2 border border-white/10 rounded bg-[var(--panel)] text-slate-300 text-xs font-bold uppercase tracking-widest hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
          Add Member
        </button>
      </div>
    </div>
  );
}
