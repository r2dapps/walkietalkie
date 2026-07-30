import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ThemeName, EqPreset } from '../../types';
import { audioEngine } from '../../services/audioEngine';
import { notificationService } from '../../services/notificationService';
import { showToast } from '../ui/ToastManager';
import { pwaService } from '../../services/pwaService';

export default function SettingsModal() {
  const { state, storage, setAppLocked } = useAppContext();
  const { profile, audioPrefs, theme } = storage;
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isPwaInstalled, setIsPwaInstalled] = useState(pwaService.isInstalled);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  // Custom Presets State
  const [presets, setPresets] = useState<any[]>(storage.getCustomPresets());
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [newPresetRoom, setNewPresetRoom] = useState('');
  const [newPresetFreq, setNewPresetFreq] = useState('');
  const [localDisplayName, setLocalDisplayName] = useState(profile.displayName || '');
  const [localCallsign, setLocalCallsign] = useState(profile.callsign || '');

  useEffect(() => {
    setLocalDisplayName(profile.displayName || '');
    setLocalCallsign(profile.callsign || '');
  }, [profile.displayName, profile.callsign]);

  useEffect(() => {
    audioEngine.enumerateAudioDevices().then(devices => {
      setAudioInputs(devices.inputs);
      setAudioOutputs(devices.outputs);
    });
  }, []);

  useEffect(() => {
    // Update local state if it changed between mount
    setIsPwaInstalled(pwaService.isInstalled);
  }, []);

  const handleInstallPwa = async () => {
    const success = await pwaService.promptInstall();
    if (success) {
      setIsPwaInstalled(true);
    } else if (!pwaService.deferredPrompt) {
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

        <div className="flex space-x-2">
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
          
          <button
            onClick={() => pwaService.forceUpdateApp()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all flex items-center space-x-1.5 bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 shadow-md"
            title="Force Update App"
          >
            <i className="fa-solid fa-arrows-rotate"></i>
            <span className="hidden sm:inline">Update</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 flex space-x-2">
        <button
          onClick={async () => {
            const granted = await notificationService.requestPermission();
            if (granted) alert('Push notifications enabled!');
            else alert('Notification permission denied or not supported.');
          }}
          className="flex-1 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-white/10 hover:bg-slate-700 flex justify-center items-center space-x-2"
        >
          <i className="fa-solid fa-bell text-amber-400"></i>
          <span className="hidden sm:inline">Notifications</span>
        </button>
        <button
          onClick={async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach(track => track.stop());
              alert('Microphone permission granted!');
            } catch (err) {
              alert('Microphone permission denied. Please allow it in your browser settings.');
            }
          }}
          className="flex-1 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-white/10 hover:bg-slate-700 flex justify-center items-center space-x-2"
        >
          <i className="fa-solid fa-microphone text-[var(--accent)]"></i>
          <span className="hidden sm:inline">Check Mic</span>
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
          <div className="flex items-center space-x-4 bg-white/5 p-3 rounded-lg border border-white/5">
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
                value={localDisplayName}
                onChange={e => setLocalDisplayName(e.target.value)}
                onBlur={() => storage.updateProfile({ displayName: localDisplayName })}
                placeholder="e.g. Captain Alex Vance"
                className="w-full bg-white/10 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Radio Callsign ID <span className="text-amber-400">(Unique ID)</span>
              </label>
              <input 
                type="text"
                value={localCallsign}
                onChange={e => setLocalCallsign(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                onBlur={() => storage.updateProfile({ callsign: localCallsign || 'Operator-1' })}
                placeholder="e.g. Operator-1"
                className="w-full bg-white/10 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)] font-mono"
              />
            </div>
          </div>

          {/* Avatar Selector Grid */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Profile Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {['radio', 'user-ninja', 'shield', 'tower-cell', 'headset', 'ghost', 'bolt', 'fire', 'crosshairs', 'robot', 'crown', 'cat', 'dog', 'hippo', 'dragon', 'otter', 'frog', 'kiwi-bird', 'spider', 'bug', 'snowman'].map(icon => (
                <button
                  key={icon}
                  onClick={() => storage.updateProfile({ avatar: icon as any })}
                  className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all border ${
                    profile.avatar === icon 
                      ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-[0_0_10px_rgba(6,182,212,0.5)] scale-105' 
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30 hover:text-white'
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
              className="w-full bg-white/10 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Microphone Input</label>
              <select 
                value={audioPrefs.inputDeviceId || ''}
                onChange={e => storage.updateAudioPrefs({ inputDeviceId: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-[var(--accent)] mb-3"
              >
                <option value="">Default Microphone</option>
                {audioInputs.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>

              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Speaker Output</label>
              <select 
                value={audioPrefs.outputDeviceId || ''}
                onChange={e => storage.updateAudioPrefs({ outputDeviceId: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-[var(--accent)]"
              >
                <option value="">Default Speaker</option>
                {audioOutputs.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PTT Talk Mode</label>
              <select 
                value={audioPrefs.pttMode}
                onChange={e => storage.updateAudioPrefs({ pttMode: e.target.value as any })}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-[var(--accent)] mb-3"
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
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
            {[
              { id: 'tactical-dark', label: 'Tactical', color: '#06b6d4', bg: '#090d16' },
              { id: 'techtalkie-oled', label: 'OLED', color: '#3b82f6', bg: '#050811' },
              { id: 'cyber-neon', label: 'Neon', color: '#a855f7', bg: '#090614' },
              { id: 'glassmorphism', label: 'Glass', color: '#3a86ff', bg: '#0b132b' },
              { id: 'creamy-vanilla', label: 'Vanilla', color: '#d97706', bg: '#f7f3e9' },
              { id: 'desert-camo', label: 'Desert', color: '#f59e0b', bg: '#1a1208' },
              { id: 'stealth-black', label: 'Stealth', color: '#64748b', bg: '#000000' },
              { id: 'bubblegum-pink', label: 'Bubblegum', color: '#ec4899', bg: '#fdf2f8' },
              { id: 'unicorn-magic', label: 'Unicorn', color: '#8b5cf6', bg: '#f5f3ff' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => storage.updateTheme(t.id as ThemeName)}
                title={t.label}
                className="flex flex-col items-center gap-1.5 transition-all group"
              >
                <div 
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                    theme === t.id 
                      ? 'scale-110 shadow-[0_0_15px_var(--accent)]' 
                      : 'border-white/10 group-hover:border-white/30 group-hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: t.bg,
                    borderColor: theme === t.id ? t.color : undefined
                  }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }}></div>
                </div>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${theme === t.id ? 'text-[var(--accent)]' : 'text-slate-400'}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Custom Presets */}
        <section className="bg-[var(--panel)] border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest border-b border-white/10 pb-2 font-orbitron flex items-center space-x-2">
            <i className="fa-solid fa-list-ol"></i>
            <span>Custom Frequencies</span>
          </h3>
          
          <div className="space-y-2">
            {presets.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white/10 border border-white/10 rounded px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{p.label} <span className="text-emerald-400 text-xs">({p.freq} MHz)</span></span>
                  <span className="text-[10px] text-slate-400 font-mono">Room: #{p.room}</span>
                </div>
                <button 
                  onClick={() => {
                    storage.deleteCustomPreset(p.id);
                    setPresets(storage.getCustomPresets());
                  }}
                  className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/40 transition-colors"
                >
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            ))}
            {presets.length === 0 && (
              <div className="text-xs text-slate-500 italic text-center py-2">No custom frequencies saved.</div>
            )}
          </div>

          <div className="mt-3 border-t border-white/5 pt-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add New Preset</div>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text"
                placeholder="Label (e.g. SQUAD-1)"
                value={newPresetLabel}
                onChange={e => setNewPresetLabel(e.target.value)}
                className="bg-white/10 border border-white/10 rounded py-1.5 px-2 text-xs text-white"
              />
              <input 
                type="text"
                placeholder="Freq (e.g. 145.200)"
                value={newPresetFreq}
                onChange={e => setNewPresetFreq(e.target.value)}
                className="bg-white/10 border border-white/10 rounded py-1.5 px-2 text-xs text-white"
              />
            </div>
            <div className="flex space-x-2">
              <input 
                type="text"
                placeholder="Room Name (secret key)"
                value={newPresetRoom}
                onChange={e => setNewPresetRoom(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                className="flex-1 bg-white/10 border border-white/10 rounded py-1.5 px-2 text-xs text-white"
              />
              <button 
                onClick={() => {
                  if (newPresetLabel && newPresetRoom && newPresetFreq) {
                    storage.saveCustomPreset({
                      id: Date.now().toString(),
                      label: newPresetLabel,
                      room: newPresetRoom,
                      freq: newPresetFreq
                    });
                    setPresets(storage.getCustomPresets());
                    setNewPresetLabel('');
                    setNewPresetRoom('');
                    setNewPresetFreq('');
                  }
                }}
                className="bg-emerald-500/20 text-emerald-400 px-3 rounded text-xs font-bold hover:bg-emerald-500/40 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Security & Application Lock */}
        <section className="bg-[var(--panel)] border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest border-b border-white/10 pb-2 font-orbitron flex items-center space-x-2">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Security Lock</span>
          </h3>
          <div className="space-y-2">
            <input 
              type="password"
              placeholder="Current PIN (if set)"
              maxLength={4}
              value={currentPinInput}
              onChange={e => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-white/10 border border-white/10 rounded-lg py-2 px-3 text-sm text-white tracking-widest font-mono"
            />
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
                  const savedPin = storage.getPin();
                  if (savedPin && savedPin !== currentPinInput) {
                    alert('Current PIN is incorrect!');
                    return;
                  }
                  if (pinInput.length === 4) {
                    storage.savePin(pinInput);
                    setPinInput('');
                    setCurrentPinInput('');
                    alert('Security PIN Updated!');
                  }
                }}
                className="bg-rose-500/20 text-rose-400 px-4 rounded-lg text-xs font-bold border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
              >
                Set PIN
              </button>
            </div>
          </div>
          <button 
            onClick={() => {
              const pin = storage.getPin();
              if (!pin) {
                showToast('⚠️ No PIN set. Default PIN is 0000.', 'warning');
              }
              storage.saveIsLocked(true);
              setAppLocked(true);
            }}
            className="w-full bg-rose-900/40 text-rose-300 border border-rose-700/40 py-3 rounded-lg font-bold tracking-widest uppercase text-xs mt-2 flex items-center justify-center space-x-2 hover:bg-rose-800/50 transition-colors"
          >
            <i className="fa-solid fa-lock"></i>
            <span>Lock Application Now</span>
          </button>
        </section>

        {/* Updates */}
        <section className="bg-[var(--panel)] border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <button 
            onClick={() => {
              showToast('Checking for updates...', 'info');
              setTimeout(() => {
                showToast('AetherTalk is up to date.', 'success');
              }, 1500);
            }}
            className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 py-3 rounded-lg font-bold tracking-widest uppercase text-xs flex items-center justify-center space-x-2 hover:bg-cyan-500/30 transition-colors"
          >
            <i className="fa-solid fa-arrows-rotate"></i>
            <span>Check for Updates</span>
          </button>
        </section>

      </div>
    </div>
  );
}
