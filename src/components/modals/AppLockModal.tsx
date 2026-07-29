import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function AppLockModal() {
  const { state, setAppLocked, storage } = useAppContext();
  const [inputPin, setInputPin] = useState('');
  const [shake, setShake] = useState(false);
  const correctPin = storage.getPin();

  useEffect(() => {
    if (inputPin.length === 4) {
      if (inputPin === correctPin) {
        setAppLocked(false);
        storage.saveIsLocked(false);
        setInputPin('');
      } else {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setInputPin('');
        }, 500);
      }
    }
  }, [inputPin, correctPin, setAppLocked, storage]);

  const handleKeypad = (num: string) => {
    if (inputPin.length < 4) {
      setInputPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setInputPin(prev => prev.slice(0, -1));
  };

  if (!state.appLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 touch-none">
      
      <div className="mb-12 flex flex-col items-center">
        <i className="fa-solid fa-lock text-5xl text-slate-500 mb-6"></i>
        <h1 className="text-xl font-bold tracking-widest uppercase text-white mb-2">Terminal Locked</h1>
        <p className="text-slate-500 text-sm font-mono">Enter authorization code</p>
      </div>

      {/* Dots */}
      <div className={`flex space-x-6 mb-16 h-4 ${shake ? 'animate-bounce text-rose-500' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-all ${i < inputPin.length ? (shake ? 'bg-rose-500 border-rose-500' : 'bg-white border-white shadow-[0_0_10px_#fff]') : 'border-slate-700 bg-transparent'}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-6 max-w-[280px] w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num}
            onClick={() => handleKeypad(num.toString())}
            className="w-20 h-20 rounded-full border-2 border-slate-800 flex items-center justify-center text-3xl font-mono active:bg-slate-800 transition-colors"
          >
            {num}
          </button>
        ))}
        <div className="w-20 h-20"></div>
        <button 
          onClick={() => handleKeypad('0')}
          className="w-20 h-20 rounded-full border-2 border-slate-800 flex items-center justify-center text-3xl font-mono active:bg-slate-800 transition-colors"
        >
          0
        </button>
        <button 
          onClick={handleBackspace}
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl text-slate-500 active:text-white transition-colors"
        >
          <i className="fa-solid fa-delete-left"></i>
        </button>
      </div>
    </div>
  );
}
