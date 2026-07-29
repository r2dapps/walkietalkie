import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { PeerInfo } from '../../types';

export default function PeersModal() {
  const { state } = useAppContext();
  const peersList: PeerInfo[] = Object.values(state.peers) as PeerInfo[];

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
            <div className="font-bold text-white tracking-wide">{state.myCallsign} <span className="text-xs text-slate-500 ml-1">(You)</span></div>
            <div className="text-xs text-[var(--accent)] font-mono mt-0.5">#{state.currentRoom}</div>
          </div>
          {state.radioState === 'transmitting' && (
            <div className="w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e] animate-pulse"></div>
          )}
        </div>

        {/* Remote Peers */}
        {peersList.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm font-mono uppercase tracking-widest">
            Scanning for operators...
          </div>
        ) : (
          peersList.map(peer => (
            <div key={peer.peerId} className="bg-[var(--panel)] border border-white/5 rounded-lg p-3 flex items-center space-x-4">
              <div className={`w-12 h-12 bg-black/30 rounded-full flex items-center justify-center border ${peer.isTransmitting ? 'border-emerald-500 text-emerald-400' : 'border-white/10 text-slate-400'}`}>
                <i className={`fa-solid fa-${peer.avatar || 'radio'} text-xl`}></i>
              </div>
              <div className="flex-1">
                <div className="font-bold text-white tracking-wide">{peer.callsign}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  <i className="fa-solid fa-signal mr-1"></i> 
                  {peer.pingMs > 0 ? `${peer.pingMs}ms` : 'Connected'} 
                  <span className="mx-2">•</span> 
                  {new Date(peer.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {peer.isTransmitting && (
                  <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse"></div>
                )}
                {/* Could add Mute button here if desired */}
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}
