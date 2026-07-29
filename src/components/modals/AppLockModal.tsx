import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function AppLockModal() {
  const { state, setAppLocked, storage } = useAppContext();
  const [inputPin, setInputPin] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);

  const savedPin = storage.getPin();
  // If no PIN has been set, any 4-digit code unlocks (or just press 0000)
  const effectivePin = savedPin || '0000';
  const hasPinSet = !!savedPin;

  // Countdown for failed attempts lockout
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); };
  }, [cooldown]);

  useEffect(() => {
    if (inputPin.length === 4) {
      if (cooldown > 0) {
        setInputPin('');
        return;
      }
      if (inputPin === effectivePin) {
        setAppLocked(false);
        storage.saveIsLocked(false);
        setInputPin('');
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setShake(true);
        // After 5 failed attempts, add a cooldown
        if (newAttempts >= 5) {
          setCooldown(30);
          setAttempts(0);
        }
        setTimeout(() => {
          setShake(false);
          setInputPin('');
        }, 500);
      }
    }
  }, [inputPin, savedPin, setAppLocked, storage, attempts, cooldown]);

  const handleKeypad = (num: string) => {
    if (cooldown > 0 || inputPin.length >= 4) return;
    setInputPin(prev => prev + num);
  };

  const handleBackspace = () => {
    setInputPin(prev => prev.slice(0, -1));
  };

  if (!state.appLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 touch-none select-none">
      
      {/* Top branding */}
      <div className="mb-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          <i className="fa-solid fa-lock text-4xl text-slate-400"></i>
        </div>
        <h1 className="text-2xl font-bold tracking-widest uppercase text-white font-orbitron mb-2">
          Terminal Locked
        </h1>
        <p className="text-slate-500 text-sm font-mono">
          {hasPinSet ? 'Enter authorization code' : 'Enter PIN: 0000 (no PIN set)'}
        </p>
        {cooldown > 0 && (
          <div className="mt-3 px-4 py-2 bg-rose-950/80 border border-rose-700/50 rounded-lg">
            <p className="text-rose-400 text-xs font-mono font-bold">
              <i className="fa-solid fa-shield-halved mr-1"></i>
              Too many attempts. Wait {cooldown}s
            </p>
          </div>
        )}
      </div>

      {/* PIN dots */}
      <div className={`flex space-x-5 mb-12 ${shake ? 'animate-bounce' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < inputPin.length
                ? shake
                  ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_#ef4444]'
                  : 'bg-white border-white shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                : 'border-slate-700 bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 max-w-[260px] w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleKeypad(num.toString())}
            disabled={cooldown > 0}
            className="w-20 h-20 rounded-full border-2 border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600 active:scale-95 flex items-center justify-center text-2xl font-mono text-white transition-all disabled:opacity-30"
          >
            {num}
          </button>
        ))}
        {/* Empty, 0, Backspace */}
        <div className="w-20 h-20" />
        <button
          onClick={() => handleKeypad('0')}
          disabled={cooldown > 0}
          className="w-20 h-20 rounded-full border-2 border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600 active:scale-95 flex items-center justify-center text-2xl font-mono text-white transition-all disabled:opacity-30"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={cooldown > 0}
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl text-slate-500 hover:text-white active:scale-95 transition-all disabled:opacity-30"
        >
          <i className="fa-solid fa-delete-left"></i>
        </button>
      </div>

      {/* Attempt dots */}
      {attempts > 0 && (
        <div className="mt-8 flex space-x-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i < attempts ? 'bg-rose-500' : 'bg-slate-800'}`}
            />
          ))}
        </div>
      )}

      <p className="mt-10 text-slate-700 text-xs font-mono tracking-widest uppercase">
        AetherTalk · Secure
      </p>
    </div>
  );
}
