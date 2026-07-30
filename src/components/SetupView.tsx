import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import UserGuideModal from './modals/UserGuideModal';

export default function SetupView() {
  const { state, joinFrequency, storage, setAppMode } = useAppContext();
  
  // Parse last channel if it was in squad-channel format
  const lastChannel = storage.getLastChannel();
  const parts = lastChannel.split('-');
  const initialSquad = parts.length > 1 ? parts.slice(0, -1).join('-') : lastChannel;
  const initialNato = parts.length > 1 ? parts[parts.length - 1] : 'alpha';

  const [squadCode, setSquadCode] = useState(initialSquad || '');
  const [natoChannel, setNatoChannel] = useState(initialNato || 'alpha');
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
    if (!callsign) {
      setError('Callsign is required.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      storage.updateProfile({ displayName: displayName || callsign || 'Operator-1' });
      const actualSquad = squadCode.trim() || 'public';
      const fullRoomName = `${actualSquad}-${natoChannel}`;
      await joinFrequency(fullRoomName, callsign, passcode);
    } catch (err: any) {
      setError(err.message || 'Failed to establish connection.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 items-center bg-[var(--bg)] relative">
      
      {/* Top Field Guide & Back Buttons */}
      <div className="absolute top-4 w-full px-4 flex justify-between">
        <button 
          onClick={() => setAppMode('home')}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center space-x-1.5 font-mono"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back</span>
        </button>
        <button 
          onClick={() => setGuideOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/10 flex items-center space-x-1.5 font-mono"
        >
          <i className="fa-solid fa-book-bookmark text-[var(--accent)]"></i>
          <span>User Guide</span>
        </button>
      </div>

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
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Squad Code <span className="text-slate-600">(Blank for public)</span></label>
          <div className="relative flex space-x-2">
            <div className="relative flex-1">
              <i className="fa-solid fa-users absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="text" 
                value={squadCode} 
                onChange={e => setSquadCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. smith-family"
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors uppercase font-mono"
                maxLength={20}
              />
            </div>
            
            <div className="relative w-1/3">
              <select
                value={natoChannel}
                onChange={e => setNatoChannel(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-3 pr-8 text-white focus:outline-none focus:border-[var(--accent)] transition-colors uppercase font-mono appearance-none"
              >
                <option value="alpha">ALPHA</option>
                <option value="bravo">BRAVO</option>
                <option value="charlie">CHARLIE</option>
                <option value="delta">DELTA</option>
                <option value="echo">ECHO</option>
              </select>
              <i className="fa-solid fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
            </div>
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

        <div className="flex space-x-3 mt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="flex-1 bg-[var(--accent)] text-[var(--bg)] font-bold uppercase tracking-widest py-3.5 rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center"
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
          
          <button 
            type="button"
            title="Save as Quick Preset"
            onClick={() => {
              if (squadCode) {
                 // @ts-ignore
                 storage.saveCustomPreset({
                   id: Date.now().toString(),
                   label: `${squadCode.toUpperCase()} (${natoChannel.toUpperCase()})`,
                   room: `${squadCode}-${natoChannel}`,
                   key: passcode,
                   freq: '144.000' // mock freq for settings view compatibility
                 });
                 // We don't have showToast imported here, so just use standard alert or rely on UI update
                 alert('Preset Saved to Quick Squads!');
              } else {
                 alert('Enter a Squad Code to save.');
              }
            }}
            className="w-14 bg-[var(--panel)] border-2 border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 active:scale-95 transition-all flex items-center justify-center"
          >
            <i className="fa-solid fa-bookmark text-lg"></i>
          </button>
        </div>

      </form>

      {/* Quick Presets could go here */}
      <div className="w-full max-w-sm mt-8">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Quick Squads</div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from(new Set([...storage.getFavorites(), ...storage.getCustomPresets().map(p => p.room)])).slice(0, 6).map(fav => {
            const preset = storage.getCustomPresets().find(p => p.room === fav);
            const label = preset ? preset.label : fav;
            
            // Extract squad from saved room if it follows squad-channel format
            const parts = fav.split('-');
            const displaySquad = parts.length > 1 ? parts.slice(0, -1).join('-') : fav;
            const displayChannel = parts.length > 1 ? parts[parts.length - 1] : 'alpha';

            return (
              <button 
                key={fav}
                onClick={() => {
                  setSquadCode(displaySquad);
                  setNatoChannel(displayChannel);
                  if (preset && preset.key) {
                    setPasscode(preset.key);
                  }
                }}
                className={`py-2 px-3 rounded text-sm font-mono border ${squadCode === displaySquad ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 text-slate-400 bg-[var(--panel)] hover:bg-white/5'} overflow-hidden text-ellipsis whitespace-nowrap`}
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
