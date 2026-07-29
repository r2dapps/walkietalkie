import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import UserGuideModal from './modals/UserGuideModal';

export default function SetupView() {
  const { state, joinFrequency, storage } = useAppContext();
  const [room, setRoom] = useState(storage.getLastChannel());
  const [callsign, setCallsign] = useState(storage.profile.callsign || '');
  const [displayName, setDisplayName] = useState(storage.profile.displayName || '');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);

  React.useEffect(() => {
    setCallsign(storage.profile.callsign || '');
    setDisplayName(storage.profile.displayName || '');
  }, [storage.profile.callsign, storage.profile.displayName]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !callsign) {
      setError('Frequency and Callsign are required.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      storage.updateProfile({ displayName: displayName || callsign || 'Operator-1' });
      await joinFrequency(room, callsign, passcode);
    } catch (err: any) {
      setError(err.message || 'Failed to establish connection.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 items-center bg-[var(--bg)] relative">
      
      {/* Top Field Guide Button */}
      <button 
        onClick={() => setGuideOpen(true)}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center space-x-1.5 font-mono"
      >
        <i className="fa-solid fa-book-bookmark text-[var(--accent)]"></i>
        <span>User Guide</span>
      </button>

      <div className="mt-8 mb-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-[var(--panel)] border-2 border-[var(--accent)] rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)] text-4xl text-[var(--accent)]">
          <i className={`fa-solid fa-${storage.profile.avatar || 'satellite-dish'}`}></i>
        </div>
        <h1 className="text-3xl font-bold tracking-widest uppercase text-white mb-1 font-orbitron">AetherTalk</h1>
        <div className="flex items-center space-x-2 text-[var(--accent)] text-sm tracking-widest font-mono">
          <span className={`w-2 h-2 rounded-full ${state.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span>{state.isOnline ? (storage.profile.displayName || 'SYSTEM READY') : 'OFFLINE (NO NETWORK)'}</span>
        </div>
      </div>

      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-5 bg-[var(--panel)] p-6 rounded-xl border border-white/5 shadow-2xl">
        
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-sm p-3 rounded text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Frequency</label>
          <div className="relative">
            <i className="fa-solid fa-walkie-talkie absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input 
              type="text" 
              value={room} 
              onChange={e => setRoom(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. alpha-1"
              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors uppercase font-mono"
              maxLength={20}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Operator Callsign</label>
          <div className="relative">
            <i className="fa-solid fa-user-ninja absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input 
              type="text" 
              value={callsign} 
              onChange={e => setCallsign(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder="e.g. Ghost-Leader"
              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
              maxLength={15}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Display Name <span className="text-slate-600">(Public)</span></label>
          <div className="relative">
            <i className="fa-solid fa-id-badge absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input 
              type="text" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Captain Alex Vance"
              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors font-sans"
              maxLength={25}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Passcode <span className="text-slate-600">(Optional)</span></label>
          <div className="relative">
            <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input 
              type="password" 
              value={passcode} 
              onChange={e => setPasscode(e.target.value)}
              placeholder="Leave blank for public"
              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors font-mono tracking-widest"
              maxLength={20}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-4 bg-[var(--accent)] text-[var(--bg)] font-bold uppercase tracking-widest py-3.5 rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center"
        >
          {loading ? (
            <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
          ) : (
            <>
              <span>Establish Link</span>
              <i className="fa-solid fa-arrow-right ml-2"></i>
            </>
          )}
        </button>

      </form>

      {/* Quick Presets could go here */}
      <div className="w-full max-w-sm mt-8">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Quick Frequencies</div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from(new Set([...storage.getFavorites(), ...storage.getCustomPresets().map(p => p.room)])).slice(0, 6).map(fav => {
            const preset = storage.getCustomPresets().find(p => p.room === fav);
            const label = preset ? preset.label : `#${fav}`;
            return (
              <button 
                key={fav}
                onClick={() => setRoom(fav)}
                className={`py-2 px-3 rounded text-sm font-mono border ${room === fav ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 text-slate-400 bg-[var(--panel)] hover:bg-white/5'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Guide Modal */}
      <UserGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

    </div>
  );
}
