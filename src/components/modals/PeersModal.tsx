import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PeerInfo } from '../../types';
import { showToast } from '../ui/ToastManager';

export default function PeersModal() {
  const { state, storage, firebase, sendPing, pingCooldowns } = useAppContext();
  const peersList: PeerInfo[] = Object.values(state.peers) as PeerInfo[];
  const [updateTick, setUpdateTick] = useState(0);

  // Re-render every second to update cooldown UI
  React.useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const friends = storage.getFriends();

  const handleAddFriend = (peer: PeerInfo) => {
    storage.saveFriends({
      ...storage.getFriends(),
      [peer.callsign]: { callsign: peer.callsign, peerId: peer.peerId, addedAt: Date.now() }
    });
    showToast(`${peer.callsign} added to squad!`, 'success');
    setUpdateTick(t => t + 1);
  };

  const handlePing = (peer: PeerInfo) => {
    sendPing(peer.callsign);
  };

  const handleCopyCallsign = () => {
    navigator.clipboard.writeText(state.myCallsign);
    showToast('Callsign copied to clipboard!', 'success');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      <div className="h-14 flex items-center justify-between px-4 bg-[var(--panel)] border-b border-white/5 shrink-0">
        <h2 className="font-bold tracking-wider text-sm uppercase text-[var(--accent)]">
          Active Operators <span className="ml-2 bg-[var(--accent)] text-[var(--bg)] px-2 py-0.5 rounded-full text-xs">{peersList.length + 1}</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        
        {/* Myself */}
        <div className="bg-[var(--panel)] border border-[var(--accent)]/30 rounded-lg p-3 flex items-center space-x-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]"></div>
          <div className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center border border-[var(--accent)]/50 text-[var(--accent)]">
            <i className={`fa-solid fa-${state.profile.avatar} text-xl`}></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-white tracking-wide flex items-center">
              {state.profile.displayName || state.myCallsign} <span className="text-xs text-slate-500 ml-1">(You)</span>
            </div>
            <div className="text-xs text-[var(--accent)] font-mono mt-0.5">#{state.currentRoom} • {state.myCallsign}</div>
          </div>
          <div className="flex items-center space-x-2">
            {state.radioState === 'transmitting' && (
              <div className="w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e] animate-pulse"></div>
            )}
            <button 
              onClick={handleCopyCallsign}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
              title="Copy Callsign"
            >
              <i className="fa-regular fa-copy"></i>
            </button>
          </div>
        </div>

        {/* Remote Peers */}
        {peersList.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm font-mono uppercase tracking-widest">
            Scanning for operators...
          </div>
        ) : (
          peersList.map(peer => {
            const isFriend = !!friends[peer.callsign];
            return (
              <div key={peer.peerId} className="bg-[var(--panel)] border border-white/5 rounded-lg p-3 flex items-center space-x-4">
                <div className={`w-12 h-12 bg-black/30 rounded-full flex items-center justify-center border ${peer.isTransmitting ? 'border-emerald-500 text-emerald-400' : 'border-white/10 text-slate-400'}`}>
                  <i className={`fa-solid fa-${peer.avatar || 'radio'} text-xl`}></i>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white tracking-wide">
                    {peer.displayName || peer.callsign}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    <i className="fa-solid fa-signal mr-1"></i> 
                    {peer.pingMs > 0 ? `${peer.pingMs}ms` : 'Connected'} 
                    <span className="mx-2">•</span> 
                    {peer.callsign} 
                    {new Date(peer.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {peer.isTransmitting && (
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse"></div>
                  )}
                  
                  <button 
                    onClick={() => handlePing(peer)}
                    disabled={Date.now() - (pingCooldowns.current[peer.callsign] || 0) < 60000}
                    className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Ping Operator"
                  >
                    {Date.now() - (pingCooldowns.current[peer.callsign] || 0) < 60000 ? (
                      <span className="text-[10px] font-bold font-mono">
                        {Math.ceil((60000 - (Date.now() - pingCooldowns.current[peer.callsign])) / 1000)}s
                      </span>
                    ) : (
                      <i className="fa-solid fa-tower-broadcast text-xs"></i>
                    )}
                  </button>

                  {!isFriend && (
                    <button 
                      onClick={() => handleAddFriend(peer)}
                      className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 flex items-center justify-center transition-all"
                      title="Add to Squad"
                    >
                      <i className="fa-solid fa-user-plus text-xs"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
