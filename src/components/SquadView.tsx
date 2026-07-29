import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function SquadView() {
  const { state, storage, firebase, sendPing, pingCooldowns } = useAppContext();
  const [newFriendCallsign, setNewFriendCallsign] = useState('');
  const [tick, setTick] = useState(0);
  
  const friends = Object.values(storage.getFriends() as Record<string, any>);

  // Re-render every second to update cooldown UI
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddFriend = () => {
    if (!newFriendCallsign.trim()) return;
    const cleanCallsign = newFriendCallsign.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanCallsign) {
      storage.saveFriends({
        ...storage.getFriends(),
        [cleanCallsign]: {
          callsign: cleanCallsign,
          peerId: '', // unknown offline
          addedAt: Date.now()
        }
      });
      setNewFriendCallsign('');
    }
  };

  const handlePing = (targetCallsign: string) => {
    sendPing(targetCallsign);
    setTick(t => t + 1);
  };

  const handleRemove = (callsign: string) => {
    const current = { ...storage.getFriends() };
    delete current[callsign];
    storage.saveFriends(current);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] pb-20 overflow-hidden">
      <div className="h-14 flex items-center justify-between px-4 bg-[var(--panel)] border-b border-white/5 shrink-0">
        <h2 className="font-bold tracking-wider text-sm uppercase text-[var(--accent)] flex items-center space-x-2">
          <i className="fa-solid fa-crosshairs"></i>
          <span>Squad / Friends</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="flex space-x-2 mb-6">
          <input 
            type="text"
            placeholder="Add Callsign..."
            value={newFriendCallsign}
            onChange={e => setNewFriendCallsign(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] font-mono"
          />
          <button 
            onClick={handleAddFriend}
            className="bg-[var(--accent)] text-[var(--bg)] px-4 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {friends.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
            <i className="fa-solid fa-users-slash text-4xl opacity-50 mb-4"></i>
            <p className="text-sm font-mono uppercase tracking-widest max-w-[200px]">No squad members registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map(friend => {
              // Check if they are currently online
              const activePeer = Object.values(state.peers).find(p => p.callsign === friend.callsign);
              const isOnline = !!activePeer;
              
              return (
                <div key={friend.callsign} className="bg-[var(--panel)] border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${isOnline ? (activePeer.isTransmitting ? 'border-emerald-500 text-emerald-400 bg-black/30' : 'border-white/10 text-[var(--accent)] bg-black/30') : 'border-slate-700 text-slate-500 bg-slate-800'}`}>
                      <i className={`fa-solid fa-${isOnline && activePeer.avatar ? activePeer.avatar : 'user-ninja'} text-xl`}></i>
                    </div>
                    <div>
                      <div className={`font-bold tracking-wide ${isOnline ? 'text-white' : 'text-slate-500'}`}>
                        {isOnline ? (activePeer.displayName || activePeer.callsign) : friend.callsign}
                      </div>
                      <div className={`text-[10px] font-mono mt-0.5 ${isOnline ? 'text-[var(--accent)]' : 'text-slate-600'}`}>
                        {isOnline ? `#{state.currentRoom} • ${activePeer.callsign}` : 'Offline'}
                      </div>
                      {isOnline && (
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                          <i className="fa-solid fa-signal mr-1"></i> 
                          {activePeer.pingMs > 0 ? `${activePeer.pingMs}ms` : 'Connected'}
                        </div>
                      )}
                    </div>
                  </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handlePing(friend.callsign)}
                    disabled={Date.now() - (pingCooldowns.current[friend.callsign] || 0) < 60000}
                    title="Send Join Ping"
                    className="w-10 h-10 rounded-full flex items-center justify-center border transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/40 relative overflow-hidden"
                  >
                    {Date.now() - (pingCooldowns.current[friend.callsign] || 0) < 60000 ? (
                      <span className="text-[10px] font-bold font-mono">
                        {Math.ceil((60000 - (Date.now() - pingCooldowns.current[friend.callsign])) / 1000)}s
                      </span>
                    ) : (
                      <i className="fa-solid fa-tower-broadcast text-xs"></i>
                    )}
                  </button>
                  <button 
                    onClick={() => handleRemove(friend.callsign)}
                    title="Remove Friend"
                    className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 hover:bg-rose-500/30 transition-colors"
                  >
                    <i className="fa-solid fa-user-minus text-xs"></i>
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
