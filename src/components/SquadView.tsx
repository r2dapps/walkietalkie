import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function SquadView() {
  const { state, storage, firebase } = useAppContext();
  const [newFriendCallsign, setNewFriendCallsign] = useState('');
  
  const friends = Object.values(storage.getFriends() as Record<string, any>);

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
    firebase.sendInvitePing(targetCallsign, state.currentRoom, state.myCallsign, state.passcode);
    alert(`Ping sent to ${targetCallsign}!`);
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
            {friends.map(friend => (
              <div key={friend.callsign} className="bg-[var(--panel)] border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400">
                    <i className="fa-solid fa-user-ninja"></i>
                  </div>
                  <div>
                    <div className="font-bold text-white font-orbitron">{friend.callsign}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Offline / Unknown</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handlePing(friend.callsign)}
                    title="Send Join Ping"
                    className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 hover:bg-emerald-500/40 transition-colors"
                  >
                    <i className="fa-solid fa-tower-broadcast text-xs"></i>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
