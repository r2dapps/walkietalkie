import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NATO_ALPHABET = [
  { letter: 'A', code: 'Alpha', phonic: 'AL-fah' },
  { letter: 'B', code: 'Bravo', phonic: 'BRAH-voh' },
  { letter: 'C', code: 'Charlie', phonic: 'CHAR-lee' },
  { letter: 'D', code: 'Delta', phonic: 'DELL-tah' },
  { letter: 'E', code: 'Echo', phonic: 'ECK-oh' },
  { letter: 'F', code: 'Foxtrot', phonic: 'FOKS-trot' },
  { letter: 'G', code: 'Golf', phonic: 'GOLF' },
  { letter: 'H', code: 'Hotel', phonic: 'HOH-tell' },
  { letter: 'I', code: 'India', phonic: 'IN-dee-ah' },
  { letter: 'J', code: 'Juliet', phonic: 'JEW-lee-ett' },
  { letter: 'K', code: 'Kilo', phonic: 'KEY-loh' },
  { letter: 'L', code: 'Lima', phonic: 'LEE-mah' },
  { letter: 'M', code: 'Mike', phonic: 'MIKE' },
  { letter: 'N', code: 'November', phonic: 'NO-vem-ber' },
  { letter: 'O', code: 'Oscar', phonic: 'OSS-cah' },
  { letter: 'P', code: 'Papa', phonic: 'PAH-pah' },
  { letter: 'Q', code: 'Quebec', phonic: 'keh-BECK' },
  { letter: 'R', code: 'Romeo', phonic: 'ROW-me-oh' },
  { letter: 'S', code: 'Sierra', phonic: 'see-AIR-rah' },
  { letter: 'T', code: 'Tango', phonic: 'TANG-go' },
  { letter: 'U', code: 'Uniform', phonic: 'YOU-nee-form' },
  { letter: 'V', code: 'Victor', phonic: 'VIK-tah' },
  { letter: 'W', code: 'Whiskey', phonic: 'WISS-key' },
  { letter: 'X', code: 'X-Ray', phonic: 'ECKS-ray' },
  { letter: 'Y', code: 'Yankee', phonic: 'YANG-key' },
  { letter: 'Z', code: 'Zulu', phonic: 'ZOO-loo' },
];

export default function UserGuideModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'guide' | 'nato' | 'faq'>('guide');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--panel)] border border-[var(--accent)]/30 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="h-14 bg-black/40 border-b border-white/10 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-book-bookmark text-[var(--accent)]"></i>
            <span className="font-bold uppercase text-sm tracking-wider font-orbitron">
              {activeTab === 'guide' && 'Operator Field Guide'}
              {activeTab === 'nato' && 'NATO Phonetic Reference'}
              {activeTab === 'faq' && 'Glossary & FAQ'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 bg-black/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'guide' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <i className="fa-solid fa-walkie-talkie mr-1 sm:mr-2"></i> How To Use
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'faq' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <i className="fa-solid fa-circle-question mr-1 sm:mr-2"></i> FAQ & Terms
          </button>
          <button
            onClick={() => setActiveTab('nato')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'nato' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <i className="fa-solid fa-spell-check mr-1 sm:mr-2"></i> NATO Phonetic
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-slate-300 font-sans">
          {activeTab === 'guide' ? (
            <div className="space-y-4">
              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">1. Joining a Frequency</h4>
                <p className="text-xs text-slate-400">
                  Enter a frequency name (e.g., <code className="text-amber-400">alpha-1</code>) and your operator Callsign on the setup screen. Share the frequency name with squad members so everyone joins the same channel.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">2. Transmitting (PTT)</h4>
                <p className="text-xs text-slate-400">
                  Hold the center <strong className="text-white">PTT Button</strong> or press the <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-400 font-mono">SPACEBAR</kbd> key to talk. Release to hear incoming transmissions.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">3. Voice Activation (VOX)</h4>
                <p className="text-xs text-slate-400">
                  Enable <strong className="text-white">VOX</strong> in System Config to speak hands-free without pressing the button. Your microphone will automatically transmit when it detects your voice.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">4. Tactical Flashlight</h4>
                <p className="text-xs text-slate-400">
                  Use the top-right <i className="fa-solid fa-lightbulb text-amber-400"></i> button on the Radio screen to toggle your device's camera torch or emergency beacon light.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">5. PWA Direct Installation</h4>
                <p className="text-xs text-slate-400">
                  Open <strong className="text-white">System Config</strong> to click <span className="text-emerald-400 font-bold">Install PWA App</span> to save AetherTalk directly to your phone or desktop home screen for full standalone performance.
                </p>
              </div>
            </div>
          ) : activeTab === 'faq' ? (
            <div className="space-y-4">
              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">Display Name vs Callsign vs Device ID</h4>
                <p className="text-xs text-slate-400 space-y-2">
                  <strong className="text-white">Callsign:</strong> A short, unique tactical name (e.g., "Alpha-1"). It's used on the radio LCD and for quick identification.<br/>
                  <strong className="text-white">Display Name:</strong> Your full name (e.g., "John Smith"), shown in the Squad list for a more personal touch.<br/>
                  <strong className="text-white">Device ID:</strong> A hidden, permanent hardware code tied to your phone/browser. If someone is banned, their Device ID is blocked so they cannot simply change their Callsign to rejoin.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">What does "EQ: MIL" mean?</h4>
                <p className="text-xs text-slate-400">
                  <strong className="text-white">EQ (Equalizer) Presets</strong> change how your voice sounds to others. <strong className="text-white">MIL (Military)</strong> adds a harsh, band-passed tactical radio effect. <strong className="text-white">CB (CB Radio)</strong> sounds like a trucker's radio, and <strong className="text-white">CLN (Clean)</strong> uses your raw high-quality microphone audio without effects.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-lg">
                <h4 className="font-bold text-[var(--accent)] mb-1 uppercase tracking-wider text-xs font-orbitron">LCD Screen Acronyms</h4>
                <p className="text-xs text-slate-400 space-y-1">
                  <strong className="text-white">TX (Transmit):</strong> You are currently broadcasting your voice.<br/>
                  <strong className="text-white">RX (Receive):</strong> You are actively hearing someone else speak.<br/>
                  <strong className="text-white">TOT (Time-Out-Timer):</strong> A countdown timer that automatically cuts off your microphone if you hold the button for too long, preventing you from accidentally jamming the channel.<br/>
                  <strong className="text-white">VHF (Very High Frequency):</strong> The simulated radio band standard used by the app.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NATO_ALPHABET.map((item) => (
                <div key={item.letter} className="bg-black/40 border border-white/10 p-2 rounded-lg flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-[var(--accent)]/20 border border-[var(--accent)]/50 flex items-center justify-center font-bold text-[var(--accent)] font-orbitron">
                    {item.letter}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs tracking-wider">{item.code}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.phonic}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-black/40 border-t border-white/10 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[var(--accent)] text-[var(--bg)] font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}
