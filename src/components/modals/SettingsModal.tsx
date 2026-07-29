import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ThemeName, EqPreset } from '../../types';

export default function SettingsModal() {
  const { state, storage, setAppLocked } = useAppContext();
  const { profile, audioPrefs, theme } = storage;
  const [pinInput, setPinInput] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install AetherTalk PWA: tap "Add to Home Screen" or "Install App" in your browser menu!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] pb-20 overflow-y-auto">
      <div className="h-14 flex items-center justify-between px-4 bg-[var(--panel)] border-b border-white/10 sticky top-0 z-10 shrink-0">
        <div className="flex items-center space-x-2">
          <i className="fa-solid fa-sliders text-[var(--accent)]"></i>
          <h2 className="font-orbitron font-bold tracking-wider text-sm uppercase text-[var(--accent)]">System Config</h2>
        </div>

        {/* PWA Direct Install Button */}
        <button
          onClick={handleInstallPwa}
          disabled={isPwaInstalled}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all flex items-center space-x-1.5 ${
            isPwaInstalled
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-[var(--accent)] text-[var(--bg)] hover:brightness-110 active:scale-95 shadow-md'
          }`}
        >
          <i className={`fa-solid ${isPwaInstalled ? 'fa-circle-check' : 'fa-download'}`}></i>
          <span>{isPwaInstalled ? 'PWA Installed' : 'Install PWA App'}</span>
        </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Profile Card */}
        <section className="bg-[var(--panel)] border border-white/10 rounded-xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest font-orbitron flex items-center space-x-2">
              <i className="fa-solid fa-address-card"></i>
              <span>Operator Profile Card</span>
            </h3>
            <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">OPERATOR ID CARD</span>
          </div>

          {/* Profile Header Card Display */}
          <div className="flex items-center space-x-4 bg-black/30 p-3 rounded-lg border border-white/5">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--accent)] flex items-center justify-center text-2xl text-[var(--accent)] shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <i className={`fa-solid fa-${profile.avatar || 'radio'}`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-base truncate font-orbitron">
                {profile.displayName || profile.callsign || 'Vance Commander'}
              </div>
              <div className="text-xs font-mono text-[var(--accent)] font-bold flex items-center space-x-2">
                <span>CALLSIGN: @{profile.callsign}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400">{profile.rank || 'Squad Leader'}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono italic truncate mt-0.5">
                "{profile.status || 'Active Operator'}"
              </div>
            </div>
          </div>

          {/* Editable Display Name vs Callsign */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Display Name <span className="text-emerald-400">(Public)</span>
              </label>
              <input 
                type="text"
                value={profile.displayName || ''}
                onChange={e => storage.updateProfile({ displayName: e.target.value })}
                placeholder="e.g. Captain Alex Vance"
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Radio Callsign ID <span className="text-amber-400">(Unique ID)</span>
              </label>
              <input 
                type="text"
                value={profile.callsign || ''}
                onChange={e => storage.updateProfile({ callsign: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="e.g. Operator-1"
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] font-mono"
              />
            </div>
          </div>

          {/* Avatar Selector Grid */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Profile Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {['radio', 'user-ninja', 'shield', 'tower-cell', 'headset', 'ghost', 'bolt', 'fire', 'crosshairs', 'robot', 'crown', 'cat'].map(icon => (
                <button
                  key={icon}
                  onClick={() => storage.updateProfile({ avatar: icon as any })}
                  className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all border ${
                    profile.avatar === icon 
                      ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-[0_0_10px_rgba(6,182,212,0.5)] scale-105' 
                      : 'bg-black/30 text-slate-400 border-white/10 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <i className={`fa-solid fa-${icon}`}></i>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Message</label>
            <input 
              type="text"
              value={profile.status || ''}
              onChange={e => storage.updateProfile({ status: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
              placeholder="e.g. Monitoring frequency"
            />
          </div>
        </section>

        {/* Audio Processing Config */}
        <section className="bg-[var(--panel)] border border-white/10 rounded-xl p-4 shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest border-b border-white/10 pb-2 font-orbitron flex items-center space-x-2">
            <i className="fa-solid fa-sliders"></i>
            <span>Audio Processing</span>
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Roger Beep</div>
              <div className="text-xs text-slate-400">Play dual-tone burst after speech release</div>
            </div>
            <input 
              type="checkbox" 
              checked={audioPrefs.rogerBeep}
              onChange={e => storage.updateAudioPrefs({ rogerBeep: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
            />
          </div>
          
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div>
              <div className="text-sm font-bold text-white">Squelch Tail Noise</div>
              <div className="text-xs text-slate-400">Authentic analog radio white noise burst</div>
            </div>
            <input 
              type="checkbox" 
              checked={audioPrefs.squelch}
              onChange={e => storage.updateAudioPrefs({ squelch: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
            />
          </div>
          
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div>
              <div className="text-sm font-bold text-white">VOX (Voice Activated)</div>
              <div className="text-xs text-slate-400">Hands-free automatic microphone transmission</div>
            </div>
            <input 
              type="checkbox" 
              checked={audioPrefs.voxEnabled}
              onChange={e => storage.updateAudioPrefs({ voxEnabled: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/5 pt-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PTT Talk Mode</label>
              <select 
                value={audioPrefs.pttMode}
                onChange={e => storage.updateAudioPrefs({ pttMode: e.target.value as any })}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-[var(--accent)]"
              >
                <option value="hold">Hold to Talk (Standard)</option>
                <option value="toggle">Tap to Toggle On/Off</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Audio Filter EQ</label>
              <select 
                value={audioPrefs.eqPreset}
                onChange={e => storage.updateAudioPrefs({ eqPreset: e.target.value as EqPreset })}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-[var(--accent)]"
              >
                <option value="clean">Studio Clean (80Hz - 8kHz)</option>
                <option value="analog_fm">Analog FM Radio</option>
                <option value="military">Military Tactical Bandpass</option>
                <option value="cb_radio">CB Radio Heavy Distortion</option>
                <option value="vintage">Vintage Tube Radio</option>
              </select>
            </div>
          </div>
        </section>

        {/* Theme & Appearance */}
        <section className="bg-[var(--panel)] border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest border-b border-white/10 pb-2 font-orbitron flex items-center space-x-2">
            <i className="fa-solid fa-palette"></i>
            <span>Theme & Visual Styling</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'tactical-dark', label: 'Tactical Dark' },
              { id: 'techtalkie-oled', label: 'TechTalkie OLED' },
              { id: 'cyber-neon', label: 'Cyber Neon' },
              { id: 'glassmorphism', label: 'Glassmorphism Blue' },
              { id: 'creamy-vanilla', label: 'Creamy Vanilla' },
              { id: 'desert-camo', label: 'Desert Camo' },
              { id: 'stealth-black', label: 'Stealth Black' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => storage.updateTheme(t.id as ThemeName)}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold font-mono border text-left transition-all ${
                  theme === t.id 
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/15 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'border-white/10 text-slate-300 bg-black/20 hover:bg-white/5'
                }`}
              >
                <i className="fa-solid fa-circle-dot mr-2 text-[10px]"></i>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Security & Application Lock */}
        <section className="bg-[var(--panel)] border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest border-b border-white/10 pb-2 font-orbitron flex items-center space-x-2">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Security Lock</span>
          </h3>
          <div className="flex space-x-2">
            <input 
              type="password"
              placeholder="New 4-digit PIN"
              maxLength={4}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white tracking-widest font-mono"
            />
            <button 
              onClick={() => {
                if (pinInput.length === 4) {
                  storage.savePin(pinInput);
                  setPinInput('');
                  alert('Security PIN Updated!');
                }
              }}
              className="bg-rose-500/20 text-rose-400 px-4 rounded-lg text-xs font-bold border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
            >
              Set PIN
            </button>
          </div>
          <button 
            onClick={() => {
              storage.saveIsLocked(true);
              setAppLocked(true);
            }}
            className="w-full bg-slate-800 text-white border border-white/10 py-3 rounded-lg font-bold tracking-widest uppercase text-xs mt-2 flex items-center justify-center space-x-2 hover:bg-slate-700 transition-colors"
          >
            <i className="fa-solid fa-lock"></i>
            <span>Lock Application Now</span>
          </button>
        </section>

      </div>
    </div>
  );
}
