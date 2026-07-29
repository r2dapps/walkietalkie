import React, { useState, useEffect } from 'react';
import { firebaseSignaling } from '../../services/firebaseSignaling';

export default function SuperAdminPortal() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [bannedItems, setBannedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authed) {
      const unsub = firebaseSignaling.listenForBannedOperators(setBannedItems);
      return unsub;
    }
  }, [authed]);

  const handleUnban = (key: string) => {
    if (confirm(`Unban ${key}?`)) {
      firebaseSignaling.unbanOperator(key);
    }
  };

  const handleKickAll = async () => {
    if (confirm('KICK ALL USERS from ALL rooms? This cannot be undone.')) {
      await firebaseSignaling.kickAll();
      alert('Kick all command executed.');
    }
  };

  if (!authed) {
    return (
      <div className="flex flex-col h-full bg-[#000] p-6 items-center justify-center font-mono">
        <i className="fa-solid fa-terminal text-4xl text-emerald-500 mb-6"></i>
        <h1 className="text-xl text-emerald-500 font-bold mb-4">SUPER ADMIN PORTAL</h1>
        <input 
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (password === 'admin' || password === '1234' || password === 'family2026') setAuthed(true);
            }
          }}
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

  const bannedKeys = Object.keys(bannedItems);

  return (
    <div className="flex flex-col h-full bg-[#000] text-emerald-400 p-4 font-mono overflow-y-auto pb-20">
      <h1 className="text-2xl font-bold border-b border-emerald-500/30 pb-2 mb-4">AetherTalk Command Center</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-emerald-500/30 p-3 rounded">
          <div className="text-xs text-emerald-500/70 mb-1">ACTIVE OPERATORS</div>
          <div className="text-3xl font-bold">--</div>
        </div>
        <div className="border border-emerald-500/30 p-3 rounded">
          <div className="text-xs text-emerald-500/70 mb-1">BANNED DEVICES</div>
          <div className="text-3xl font-bold">{bannedKeys.length}</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2 text-rose-500 border-b border-rose-500/30 pb-1 flex items-center justify-between">
          <span>Global Actions</span>
        </h2>
        <button 
          onClick={handleKickAll}
          className="w-full bg-rose-500/20 text-rose-500 border border-rose-500 py-3 rounded uppercase font-bold hover:bg-rose-500/40 transition-colors"
        >
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          Kick All Active Users
        </button>
      </div>

      <div className="mb-4 flex-1 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">Banned Operators & IPs</h2>
        {bannedKeys.length === 0 ? (
          <div className="border border-emerald-500/30 rounded p-4 text-center text-sm opacity-50">
            No bans on record.
          </div>
        ) : (
          <div className="space-y-2">
            {bannedKeys.map(key => (
              <div key={key} className="border border-emerald-500/30 rounded p-3 flex items-center justify-between">
                <span className="text-emerald-300 truncate mr-2">{key.replace(/_/g, '.')}</span>
                <button 
                  onClick={() => handleUnban(key)}
                  className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-500 px-3 py-1 rounded text-xs font-bold border border-emerald-500/50"
                >
                  Unban
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button onClick={() => setAuthed(false)} className="mt-auto shrink-0 border border-rose-500 text-rose-500 p-2 rounded hover:bg-rose-500/20 uppercase text-xs font-bold">
        Lock Terminal
      </button>
    </div>
  );
}
