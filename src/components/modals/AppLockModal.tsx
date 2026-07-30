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
        setAttempts(prev => {
          const newAttempts = prev + 1;
          if (newAttempts >= 5) {
            setCooldown(30);
          }
          return newAttempts;
        });
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setInputPin('');
        }, 500);
      }
    }
  }, [inputPin]); // ONLY run when inputPin changes!

  const handleKeypad = (num: string) => {
    if (cooldown > 0 || inputPin.length >= 4) return;
    setInputPin(prev => prev + num);
  };

  const handleBackspace = () => {
    setInputPin(prev => prev.slice(0, -1));
  };

  if (!state.appLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--bg)] flex flex-col items-center justify-center p-6 touch-none select-none transition-colors duration-500">
      
      {/* LCD Container */}
      <div className="w-full max-w-sm bg-[#a4c214] rounded-2xl p-8 flex flex-col items-center font-vt323 text-[#2a3311] shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(120,150,20,0.9)] border-4 border-slate-800">
        
        {/* Top branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-xl bg-[#2a3311]/10 border-4 border-[#2a3311] flex items-center justify-center mb-4 shadow-[inset_0_0_10px_rgba(42,51,17,0.3)]">
            <i className="fa-solid fa-lock text-3xl text-[#2a3311]"></i>
          </div>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-[#2a3311] drop-shadow-[0_0_2px_rgba(42,51,17,0.4)] mb-1">
            TERMINAL LOCKED
          </h1>
          <p className="text-[#2a3311]/80 text-lg font-bold">
            ENTER AUTHORIZATION CODE
          </p>
          {cooldown > 0 && (
            <div className="mt-3 px-4 py-2 bg-[#2a3311] border-2 border-[#2a3311] rounded-none">
              <p className="text-[#a4c214] text-lg font-bold">
                <i className="fa-solid fa-shield-halved mr-2"></i>
                SYSTEM LOCKOUT: {cooldown}s
              </p>
            </div>
          )}
        </div>

        {/* PIN dots */}
        <div className={`flex space-x-6 mb-8 ${shake ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-6 h-8 border-b-4 transition-all duration-150 flex items-center justify-center ${
                i < inputPin.length
                  ? shake
                    ? 'border-rose-600 text-rose-600'
                    : 'border-[#2a3311] text-[#2a3311]'
                  : 'border-[#2a3311]/30 text-transparent'
              }`}
            >
              {i < inputPin.length ? <span className="text-3xl font-black">*</span> : null}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-5 max-w-[260px] w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeypad(num.toString())}
              disabled={cooldown > 0}
              className="w-16 h-14 border-2 border-[#2a3311] bg-[#2a3311]/5 hover:bg-[#2a3311]/20 active:bg-[#2a3311] active:text-[#a4c214] flex items-center justify-center text-3xl font-bold text-[#2a3311] transition-colors disabled:opacity-30 shadow-[4px_4px_0_rgba(42,51,17,0.5)] active:translate-y-1 active:translate-x-1 active:shadow-none mx-auto"
            >
              {num}
            </button>
          ))}
          {/* Empty, 0, Backspace */}
          <div className="w-16 h-14" />
          <button
            onClick={() => handleKeypad('0')}
            disabled={cooldown > 0}
            className="w-16 h-14 border-2 border-[#2a3311] bg-[#2a3311]/5 hover:bg-[#2a3311]/20 active:bg-[#2a3311] active:text-[#a4c214] flex items-center justify-center text-3xl font-bold text-[#2a3311] transition-colors disabled:opacity-30 shadow-[4px_4px_0_rgba(42,51,17,0.5)] active:translate-y-1 active:translate-x-1 active:shadow-none mx-auto"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={cooldown > 0}
            className="w-16 h-14 border-2 border-[#2a3311]/50 flex items-center justify-center text-2xl text-[#2a3311]/70 hover:bg-[#2a3311]/20 hover:text-[#2a3311] hover:border-[#2a3311] active:bg-[#2a3311] active:text-[#a4c214] transition-all disabled:opacity-30 shadow-[4px_4px_0_rgba(42,51,17,0.3)] active:translate-y-1 active:translate-x-1 active:shadow-none mx-auto"
          >
            <i className="fa-solid fa-delete-left"></i>
          </button>
        </div>

        {/* Attempt dots */}
        {attempts > 0 && (
          <div className="mt-8 flex space-x-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-none border border-[#2a3311] transition-all ${i < attempts ? 'bg-rose-600 border-rose-600 shadow-[0_0_8px_#e11d48]' : 'bg-transparent'}`}
              />
            ))}
          </div>
        )}

        <p className="mt-10 text-[#2a3311]/60 text-base font-bold tracking-widest uppercase">
          AETHERTALK SECURE
        </p>
      </div>
    </div>
  );
}
