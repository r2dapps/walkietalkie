import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { radioApi, RadioStation } from '../services/radioApi';
import FMEqualizer from './FMEqualizer';

export default function FMRadioView() {
  const { setAppMode } = useAppContext();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [language, setLanguage] = useState('telugu');
  const [genre, setGenre] = useState('');

  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      const data = await radioApi.searchStations({ language, tag: genre, limit: 30 });
      setStations(data.filter(s => s.url)); // ensure URL exists
      setCurrentIndex(0);
      setLoading(false);
    };
    fetchStations();
  }, [language, genre]);

  const currentStation = stations[currentIndex];

  const playStatic = () => {
    // Generate brief white noise
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 0.3; // 300ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  };

  const tuneNext = () => {
    if (stations.length === 0) return;
    playStatic();
    setCurrentIndex((prev) => (prev + 1) % stations.length);
    setIsPlaying(true);
  };

  const tunePrev = () => {
    if (stations.length === 0) return;
    playStatic();
    setCurrentIndex((prev) => (prev - 1 + stations.length) % stations.length);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current && currentStation) {
      audioRef.current.volume = volume;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentIndex, isPlaying, currentStation, volume]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] relative pb-safe">
      <div className="absolute top-4 left-4 right-4 z-10 flex space-x-2">
        <button 
          onClick={() => {
            if (audioRef.current) audioRef.current.pause();
            setAppMode('home');
          }}
          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white hover:bg-white/10 flex items-center space-x-1.5 font-mono shadow-lg backdrop-blur-md"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span className="hidden sm:inline">Exit</span>
        </button>
        
        <select 
          value={language} 
          onChange={e => setLanguage(e.target.value)}
          className="bg-black/40 border border-white/10 text-white text-xs px-2 py-1.5 rounded-lg font-mono outline-none focus:border-[var(--accent)] backdrop-blur-md flex-1 max-w-[120px]"
        >
          <option value="telugu">Telugu</option>
          <option value="hindi">Hindi</option>
          <option value="english">English</option>
          <option value="tamil">Tamil</option>
          <option value="malayalam">Malayalam</option>
          <option value="kannada">Kannada</option>
          <option value="all">Global</option>
        </select>
        
        <select 
          value={genre} 
          onChange={e => setGenre(e.target.value)}
          className="bg-black/40 border border-white/10 text-white text-xs px-2 py-1.5 rounded-lg font-mono outline-none focus:border-[var(--accent)] backdrop-blur-md flex-1 max-w-[120px]"
        >
          <option value="">All Genres</option>
          <option value="music">Music</option>
          <option value="news">News</option>
          <option value="talk">Talk</option>
          <option value="devotional">Devotional</option>
          <option value="classical">Classical</option>
          <option value="pop">Pop</option>
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <i className="fa-solid fa-tower-broadcast animate-ping text-3xl text-[var(--accent)]"></i>
          <p className="font-mono text-slate-400 text-sm tracking-widest uppercase">Scanning FM Frequencies...</p>
        </div>
      ) : stations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-500"></i>
          <p className="font-mono text-slate-400 text-sm">Failed to locate radio streams.</p>
        </div>
      ) : (
        <>
          {/* Top Half: Player UI (Retro Analog Radio Style) */}
          <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-8 px-6 bg-gradient-to-b from-[#5d4037] to-[#271005] border-b-[12px] border-[#3e2723] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
            
            {/* Retro Speaker Grill / Screen */}
            <div className="w-40 h-40 rounded-full bg-[#1c1a17] border-[6px] border-[#8d6e63] shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden mb-8 relative">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '8px 8px' }}></div>
              
              {currentStation?.favicon ? (
                <img src={currentStation.favicon} alt="Station" className="w-24 h-24 object-contain rounded-full bg-amber-100/10 p-2 z-10" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23333"/><text x="50" y="55" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle">FM</text></svg>';
                }} />
              ) : (
                <i className="fa-solid fa-radio text-6xl text-[#d7ccc8] z-10"></i>
              )}
              {isPlaying && (
                <div className="absolute inset-0 ring-8 ring-amber-500/30 animate-pulse rounded-full pointer-events-none z-20"></div>
              )}
            </div>

            <div className="text-center w-full max-w-sm mb-10 flex flex-col items-center">
              <div className="flex items-center justify-center space-x-3 mb-2">
                {isPlaying && (
                  <div className="flex space-x-1 h-6 items-end">
                    <div className="w-1.5 bg-amber-400 animate-[bounce_1s_infinite] h-full" style={{ animationDuration: '0.7s' }}></div>
                    <div className="w-1.5 bg-amber-500 animate-[bounce_1s_infinite] h-full" style={{ animationDuration: '1.2s' }}></div>
                    <div className="w-1.5 bg-amber-600 animate-[bounce_1s_infinite] h-full" style={{ animationDuration: '0.9s' }}></div>
                  </div>
                )}
                <h2 className="text-3xl font-black text-amber-100 font-serif tracking-wide truncate max-w-[200px] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {currentStation?.name || 'Analog Tuner'}
                </h2>
                {isPlaying && (
                  <div className="flex space-x-1 h-6 items-end">
                    <div className="w-1.5 bg-amber-600 animate-[bounce_1s_infinite] h-full" style={{ animationDuration: '0.8s' }}></div>
                    <div className="w-1.5 bg-amber-500 animate-[bounce_1s_infinite] h-full" style={{ animationDuration: '1.1s' }}></div>
                    <div className="w-1.5 bg-amber-400 animate-[bounce_1s_infinite] h-full" style={{ animationDuration: '0.6s' }}></div>
                  </div>
                )}
              </div>
              <div className="flex justify-center flex-wrap gap-2 px-2 h-6 overflow-hidden">
                {currentStation?.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-black/40 border border-amber-900/50 text-amber-200/80 px-2 py-0.5 rounded font-mono uppercase tracking-wider">{tag}</span>
                ))}
              </div>
            </div>

            {/* HUD Telemetry Equalizer */}
            <div className="w-full max-w-md px-4 mb-4">
              <FMEqualizer audioElement={audioRef.current} isPlaying={isPlaying} />
            </div>

            {/* Retro Analog Controls */}
            <div className="flex flex-col items-center justify-center space-y-8 mt-4">
              <div className="flex items-center justify-center space-x-10">
                <button onClick={tunePrev} className="w-14 h-14 rounded-full bg-gradient-to-br from-[#d7ccc8] to-[#8d6e63] text-black flex items-center justify-center transition-all active:scale-95 shadow-[0_5px_15px_rgba(0,0,0,0.6),inset_0_2px_2px_rgba(255,255,255,0.8)] border border-[#3e2723]">
                  <i className="fa-solid fa-backward text-xl drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"></i>
                </button>

                <button 
                  onClick={togglePlay} 
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 border border-[#3e2723] ${isPlaying ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-[0_5px_25px_rgba(245,158,11,0.6),inset_0_2px_2px_rgba(255,255,255,0.5)]' : 'bg-gradient-to-br from-[#d7ccc8] to-[#8d6e63] text-black shadow-[0_5px_15px_rgba(0,0,0,0.6),inset_0_2px_2px_rgba(255,255,255,0.8)]'}`}
                >
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-power-off'} text-4xl drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]`}></i>
                </button>

                <button onClick={tuneNext} className="w-14 h-14 rounded-full bg-gradient-to-br from-[#d7ccc8] to-[#8d6e63] text-black flex items-center justify-center transition-all active:scale-95 shadow-[0_5px_15px_rgba(0,0,0,0.6),inset_0_2px_2px_rgba(255,255,255,0.8)] border border-[#3e2723]">
                  <i className="fa-solid fa-forward text-xl drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"></i>
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center space-x-3 w-full max-w-[200px] bg-black/40 px-4 py-2 rounded-full border border-amber-900/50">
                <i className="fa-solid fa-volume-low text-amber-200/50 text-xs"></i>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-amber-900/50 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <i className="fa-solid fa-volume-high text-amber-200/80 text-xs"></i>
              </div>
            </div>
          </div>

          {/* Bottom Half: Station List */}
          <div className="h-64 bg-[var(--panel)] border-t border-white/5 overflow-y-auto px-4 py-2 shrink-0">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2 px-2">Top FM Frequencies</h3>
            <div className="space-y-1 pb-4">
              {stations.map((station, index) => (
                <button
                  key={station.id}
                  onClick={() => {
                    playStatic();
                    setCurrentIndex(index);
                    setIsPlaying(true);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg flex items-center space-x-3 transition-colors ${index === currentIndex ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
                    {station.favicon ? (
                      <img src={station.favicon} className="w-full h-full object-cover bg-white" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                    ) : (
                      <i className="fa-solid fa-music text-[10px] text-slate-500"></i>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className={`font-bold text-sm truncate ${index === currentIndex ? 'text-[var(--accent)]' : 'text-white'}`}>{station.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate uppercase">{station.tags.join(' • ') || 'FM Radio'}</div>
                  </div>
                  {index === currentIndex && isPlaying && (
                    <div className="flex space-x-0.5 shrink-0">
                      <div className="w-1 h-3 bg-[var(--accent)] animate-[bounce_1s_infinite]"></div>
                      <div className="w-1 h-3 bg-[var(--accent)] animate-[bounce_1s_infinite_0.2s]"></div>
                      <div className="w-1 h-3 bg-[var(--accent)] animate-[bounce_1s_infinite_0.4s]"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <audio 
            ref={audioRef} 
            src={currentStation?.url}
            onEnded={tuneNext}
            onError={(e) => {
              console.error("Audio Error:", e);
              // Auto skip broken streams
              if (isPlaying) {
                setTimeout(tuneNext, 1000);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
