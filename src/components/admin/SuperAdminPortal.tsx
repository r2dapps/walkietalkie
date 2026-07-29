import React, { useState } from 'react';

export default function SuperAdminPortal() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');

  if (!authed) {
    return (
      <div className="flex flex-col h-full bg-[#000] p-6 items-center justify-center font-mono">
        <i className="fa-solid fa-terminal text-4xl text-emerald-500 mb-6"></i>
        <h1 className="text-xl text-emerald-500 font-bold mb-4">SUPER ADMIN PORTAL</h1>
        <input 
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Access Code"
          className="bg-slate-900 border border-emerald-500/50 text-emerald-400 p-2 text-center rounded outline-none mb-4"
        />
        <button 
          onClick={() => {
            if (password === 'admin' || password === '1234' || password === 'family2026') setAuthed(true);
          }}
          className="bg-emerald-500/20 text-emerald-500 px-6 py-2 border border-emerald-500 rounded hover:bg-emerald-500/40 font-bold uppercase"
        >
          Authenticate
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#000] text-emerald-400 p-4 font-mono overflow-y-auto">
      <h1 className="text-2xl font-bold border-b border-emerald-500/30 pb-2 mb-4">AetherTalk Command Center</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-emerald-500/30 p-3 rounded">
          <div className="text-xs text-emerald-500/70 mb-1">ACTIVE OPERATORS</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="border border-emerald-500/30 p-3 rounded">
          <div className="text-xs text-emerald-500/70 mb-1">BANNED DEVICES</div>
          <div className="text-3xl font-bold">0</div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-bold mb-2">Live Monitor</h2>
        <div className="border border-emerald-500/30 rounded p-4 text-center text-sm opacity-50">
          Listening to Firebase RTDB streams...
        </div>
      </div>
      
      <button onClick={() => setAuthed(false)} className="mt-auto border border-rose-500 text-rose-500 p-2 rounded hover:bg-rose-500/20 uppercase text-xs font-bold">
        Lock Terminal
      </button>
    </div>
  );
}
