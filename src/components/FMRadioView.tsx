import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { radioApi, RadioStation } from '../services/radioApi';

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
    const duration = 0.5; // 500ms blend
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3500;
    
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration - 0.05);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(now);
    noise.stop(now + duration);
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

  // Calculate needle position based on current station index (88 MHz to 108 MHz mapping conceptually)
  const needlePosition = stations.length > 1 
    ? (currentIndex / (stations.length - 1)) * 100 
    : 50;

  return (
    <div className="flex flex-col h-full bg-[#1a0f0c] relative pb-safe overflow-hidden font-serif">
      {/* Overriding the global background with a pure vintage woodgrain/bakelite look */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #5d4037 0%, transparent 70%)' }}></div>
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #000 2px, #000 4px)' }}></div>
      
      {/* Top Navbar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex space-x-2">
        <button 
          onClick={() => {
            if (audioRef.current) audioRef.current.pause();
            setAppMode('home');
          }}
          className="px-3 py-1.5 rounded bg-black/60 border border-amber-900/50 text-xs text-amber-500 hover:bg-black/80 flex items-center space-x-1.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] transition-colors"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span className="hidden sm:inline">Exit</span>
        </button>
        
        <select 
          value={language} 
          onChange={e => setLanguage(e.target.value)}
          className="bg-black/60 border border-amber-900/50 text-amber-500 text-xs px-2 py-1.5 rounded outline-none focus:border-amber-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] flex-1 max-w-[120px] font-sans"
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
          className="bg-black/60 border border-amber-900/50 text-amber-500 text-xs px-2 py-1.5 rounded outline-none focus:border-amber-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] flex-1 max-w-[120px] font-sans"
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
          <i className="fa-solid fa-compass animate-spin text-4xl text-amber-600/50"></i>
          <p className="font-mono text-amber-600/70 text-sm tracking-widest uppercase">Tuning Receiver...</p>
        </div>
      ) : stations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <i className="fa-solid fa-plug text-4xl text-red-900/50"></i>
          <p className="font-mono text-red-900/70 text-sm">Static. No signal found.</p>
        </div>
      ) : (
        <>
          {/* Top Half: Radio Body (Vintage Analog) */}
          <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-6 px-6 z-0">
            
            {/* Station Branding & Dial */}
            <div className="w-full max-w-md bg-[#251511] p-4 rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_2px_3px_rgba(255,255,255,0.05)] border border-[#3e2723]">
              
              {/* Station Info */}
              <div className="flex flex-col items-center justify-center mb-6 h-24">
                <h2 className="text-3xl font-black text-amber-50 text-center tracking-wide line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {currentStation?.name || 'Tuner'}
                </h2>
                <div className="flex justify-center flex-wrap gap-2 mt-2 h-5 overflow-hidden">
                  {currentStation?.tags.map(tag => (
                    <span key={tag} className="text-[9px] bg-black/60 border border-amber-900/40 text-amber-600 px-2 py-0.5 rounded-sm font-sans uppercase tracking-widest shadow-[inset_0_1px_1px_rgba(0,0,0,1)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Classic Analog Tuning Dial */}
              <div className="w-full h-16 bg-[#110a08] rounded shadow-[inset_0_5px_15px_rgba(0,0,0,1)] border-b border-white/5 relative overflow-hidden px-2 mb-2">
                <div className="absolute inset-0 opacity-10 bg-amber-500 blur-md pointer-events-none"></div>
                
                {/* Scale markings */}
                <div className="absolute top-0 bottom-0 left-4 right-4 flex justify-between items-center opacity-40">
                  <div className="h-full flex flex-col justify-between py-1"><span className="text-[10px] text-amber-500">88</span><div className="h-2 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-end py-1"><div className="h-1 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-between py-1"><span className="text-[10px] text-amber-500">92</span><div className="h-2 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-end py-1"><div className="h-1 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-between py-1"><span className="text-[10px] text-amber-500">96</span><div className="h-2 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-end py-1"><div className="h-1 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-between py-1"><span className="text-[10px] text-amber-500">100</span><div className="h-2 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-end py-1"><div className="h-1 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-between py-1"><span className="text-[10px] text-amber-500">104</span><div className="h-2 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-end py-1"><div className="h-1 w-px bg-amber-500"></div></div>
                  <div className="h-full flex flex-col justify-between py-1"><span className="text-[10px] text-amber-500">108</span><div className="h-2 w-px bg-amber-500"></div></div>
                </div>

                {/* Moving Needle */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] transition-all duration-700 ease-in-out z-10"
                  style={{ left: `calc(1rem + ${needlePosition}% * 0.9)` }} // 0.9 to pad the edges
                >
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_5px_rgba(239,68,68,1)]"></div>
                </div>
              </div>
            </div>

            {/* Tactile Controls */}
            <div className="flex flex-col items-center justify-center mt-10 space-y-8">
              <div className="flex items-center justify-center space-x-8">
                {/* Prev Button */}
                <button onClick={tunePrev} className="w-16 h-16 rounded-full bg-[#1e1310] text-[#8d6e63] flex items-center justify-center active:scale-95 transition-transform shadow-[0_8px_15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] border-2 border-[#110a08]">
                  <i className="fa-solid fa-backward-step text-xl drop-shadow-[0_1px_1px_rgba(0,0,0,1)]"></i>
                </button>

                {/* Play/Pause Button */}
                <button 
                  onClick={togglePlay} 
                  className={`w-24 h-24 rounded-full flex items-center justify-center active:scale-95 transition-all border-4 border-[#110a08] ${isPlaying ? 'bg-[#3e2723] text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2),inset_0_2px_8px_rgba(0,0,0,1)]' : 'bg-[#1e1310] text-[#d7ccc8] shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)]'}`}
                >
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-power-off'} text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${isPlaying ? 'animate-pulse' : ''}`}></i>
                </button>

                {/* Next Button */}
                <button onClick={tuneNext} className="w-16 h-16 rounded-full bg-[#1e1310] text-[#8d6e63] flex items-center justify-center active:scale-95 transition-transform shadow-[0_8px_15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] border-2 border-[#110a08]">
                  <i className="fa-solid fa-forward-step text-xl drop-shadow-[0_1px_1px_rgba(0,0,0,1)]"></i>
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center space-x-4 w-full max-w-[220px] bg-[#110a08] px-4 py-3 rounded shadow-[inset_0_2px_5px_rgba(0,0,0,1)] border-b border-white/5">
                <i className="fa-solid fa-volume-off text-amber-900 text-sm"></i>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black rounded-full appearance-none cursor-pointer accent-amber-600 shadow-[inset_0_1px_2px_rgba(0,0,0,1)]"
                />
                <i className="fa-solid fa-volume-high text-amber-700 text-sm"></i>
              </div>
            </div>
          </div>

          {/* Bottom Half: Station List (Perforated Speaker Mesh Aesthetic) */}
          <div className="h-64 bg-[#0a0605] border-t-4 border-[#3e2723] overflow-y-auto px-4 py-3 shrink-0 relative shadow-[inset_0_10px_20px_rgba(0,0,0,1)] z-0">
            {/* Speaker mesh texture overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
            
            <h3 className="text-xs font-bold text-amber-900/80 uppercase tracking-[0.2em] mb-4 mt-2 px-2 font-sans relative z-10 text-center">Available Frequencies</h3>
            
            <div className="space-y-2 pb-4 relative z-10">
              {stations.map((station, index) => (
                <button
                  key={station.id}
                  onClick={() => {
                    playStatic();
                    setCurrentIndex(index);
                    setIsPlaying(true);
                  }}
                  className={`w-full text-left px-4 py-3 rounded flex items-center space-x-4 transition-all ${index === currentIndex ? 'bg-[#251511] border border-amber-900/50 shadow-[0_2px_10px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.05)]' : 'bg-[#110a08] border border-transparent hover:bg-[#1a0f0c] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)]'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 ${index === currentIndex ? 'border-amber-600 bg-amber-900/20' : 'border-amber-900/30 bg-black/50'}`}>
                    {station.favicon ? (
                      <img src={station.favicon} className="w-full h-full object-cover p-1.5" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                    ) : (
                      <i className={`fa-solid fa-music text-xs ${index === currentIndex ? 'text-amber-500' : 'text-amber-900/50'}`}></i>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className={`font-bold text-base truncate ${index === currentIndex ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'text-amber-900'}`}>
                      {station.name}
                    </div>
                    <div className="text-[10px] text-amber-900/60 font-sans truncate uppercase tracking-wider">{station.tags.join(' • ') || 'FM Radio'}</div>
                  </div>
                  {index === currentIndex && isPlaying && (
                    <div className="flex space-x-1 shrink-0">
                      <div className="w-1.5 h-4 bg-amber-600 rounded-sm animate-[pulse_1s_infinite]"></div>
                      <div className="w-1.5 h-4 bg-amber-600 rounded-sm animate-[pulse_1s_infinite_0.3s]"></div>
                      <div className="w-1.5 h-4 bg-amber-600 rounded-sm animate-[pulse_1s_infinite_0.6s]"></div>
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
