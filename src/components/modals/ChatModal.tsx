import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PeerInfo } from '../../types';

const NATO_ALPHABET: Record<string, string> = {
  A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel',
  I: 'India', J: 'Juliet', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa',
  Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey',
  X: 'X-ray', Y: 'Yankee', Z: 'Zulu'
};

export default function ChatModal() {
  const { state, sendChat, sendGpsLocation, clearUnread } = useAppContext();
  const [text, setText] = useState('');
  const [showNato, setShowNato] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendChat(text.trim());
      setText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 bg-[var(--panel)] border-b border-white/5 shrink-0">
        <h2 className="font-bold tracking-wider text-sm uppercase text-[var(--accent)]">Comms Log</h2>
        <div className="flex space-x-3 text-slate-400">
          <button onClick={sendGpsLocation} className="hover:text-[var(--accent)] transition-colors">
            <i className="fa-solid fa-location-crosshairs"></i>
          </button>
          <button onClick={() => setShowNato(!showNato)} className={showNato ? 'text-[var(--accent)]' : 'hover:text-[var(--accent)]'}>
            <i className="fa-solid fa-spell-check"></i>
          </button>
        </div>
      </div>

      {/* NATO Helper */}
      {showNato && (
        <div className="bg-[var(--panel)] border-b border-white/5 p-2 grid grid-cols-4 sm:grid-cols-6 gap-1 shrink-0 overflow-y-auto max-h-40">
          {Object.entries(NATO_ALPHABET).map(([letter, word]) => (
            <button 
              key={letter}
              onClick={() => setText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + word + ' ')}
              className="bg-black/30 border border-white/10 rounded text-[10px] p-1 text-left hover:border-[var(--accent)] text-slate-300"
            >
              <span className="text-[var(--accent)] font-bold mr-1">{letter}</span>
              {word}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
            <i className="fa-solid fa-message text-3xl opacity-50"></i>
            <p className="text-sm font-mono uppercase tracking-widest text-opacity-50">No comms history</p>
          </div>
        ) : (
          state.chatMessages.map((msg, i) => {
            const peerInfo = (Object.values(state.peers) as PeerInfo[]).find(p => p.callsign === msg.sender);
            const displayName = msg.isMine ? (state.profile.displayName || state.myCallsign) : (peerInfo?.displayName || msg.sender);
            const displayStr = displayName !== msg.sender && !msg.isMine ? `${displayName} (${msg.sender})` : displayName;

            if (msg.sender === 'SYSTEM') {
              return (
                <div key={msg.id || i} className="flex justify-center my-2">
                  <div className="bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-full flex items-center space-x-1.5">
                    <i className="fa-solid fa-tower-broadcast"></i>
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id || i} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                <div className="text-[10px] text-slate-500 mb-1 ml-1 font-mono uppercase">
                  {displayStr} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`px-4 py-2 rounded-xl max-w-[85%] text-sm ${msg.isMine ? 'bg-[var(--accent)] text-[var(--bg)] rounded-tr-sm font-medium' : 'bg-[var(--panel)] border border-white/10 text-white rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-[var(--panel)] border-t border-white/5 shrink-0 flex items-end space-x-2 pb-safe">
        <input 
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Transmit message..."
          className="flex-1 bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors text-sm"
        />
        <button 
          type="submit"
          disabled={!text.trim()}
          className="w-12 h-12 flex-shrink-0 bg-[var(--accent)] text-[var(--bg)] rounded-lg flex items-center justify-center disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-500 hover:brightness-110 transition-colors"
        >
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
}
