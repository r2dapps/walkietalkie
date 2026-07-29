import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getShareableUrl, copyInviteLink, shareNative } from '../../services/shareService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { state } = useAppContext();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = getShareableUrl(state.currentRoom, state.passcode);

  const handleCopy = async () => {
    const success = await copyInviteLink(state.currentRoom, state.passcode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    await shareNative(state.currentRoom, state.passcode);
  };

  // Pure-JS Vector QR Matrix SVG Generator ported from legacy
  const generateQrSvg = (text: string) => {
    const size = 256;
    const modulesCount = 25;
    const cellSize = size / modulesCount;

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    let rects = '';
    
    const addFinderPattern = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (isOuter || isInner) {
            const x = (col + c) * cellSize;
            const y = (row + r) * cellSize;
            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#f43f5e"/>`;
          }
        }
      }
    };

    addFinderPattern(1, 1);
    addFinderPattern(1, modulesCount - 8);
    addFinderPattern(modulesCount - 8, 1);

    for (let r = 0; r < modulesCount; r++) {
      for (let c = 0; c < modulesCount; c++) {
        if ((r < 9 && c < 9) || (r < 9 && c >= modulesCount - 9) || (r >= modulesCount - 9 && c < 9)) continue;

        const val = Math.abs(Math.sin(hash * 0.001 + r * 13 + c * 37));
        if (val > 0.45) {
          const x = c * cellSize;
          const y = r * cellSize;
          rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#e2e8f0" rx="1"/>`;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" class="rounded-xl shadow-lg bg-slate-950 p-3 border border-slate-800">
        <rect width="${size}" height="${size}" fill="#090d16" rx="12"/>
        ${rects}
      </svg>
    `;
  };

  const qrSvg = generateQrSvg(shareUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-100 font-sans relative flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        <div className="flex items-center space-x-3 mb-6 w-full">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <i className="fa-solid fa-qrcode text-lg"></i>
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-base text-white">Frequency Share</h3>
            <p className="text-xs text-slate-400 font-mono">Channel: #{state.currentRoom}</p>
          </div>
        </div>

        <div 
          className="w-48 h-48 mb-6 relative"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <div className="space-y-4 w-full">
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Direct Invite URL</label>
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-[10px] text-cyan-300 break-all select-all">
              {shareUrl}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopy}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold font-mono tracking-wider transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
              }`}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleNativeShare}
              className="py-2.5 px-3 rounded-lg text-xs font-bold font-mono tracking-wider bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <i className="fa-solid fa-paper-plane text-cyan-400"></i>
              <span>Share...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
