import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { peerManager } from '../../services/peerManager';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DiagnosticsModal({ isOpen, onClose }: DiagnosticsModalProps) {
  const { state } = useAppContext();
  const [diag, setDiag] = useState({
    rttMs: 0,
    packetsSent: 0,
    packetsLost: 0,
    codec: 'Opus (48kHz)',
    iceState: 'connected'
  });

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setDiag(peerManager.getDiagnostics());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1120] border border-emerald-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-100 font-sans relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <i className="fa-solid fa-chart-line text-lg"></i>
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-base text-white">Radio Diagnostics</h3>
            <p className="text-xs text-slate-400 font-mono">WebRTC & Network Telemetry</p>
          </div>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400">Round Trip Latency (RTT):</span>
            <span className="font-bold text-emerald-400">{diag.rttMs} ms</span>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400">ICE Connection State:</span>
            <span className="font-bold text-cyan-400 uppercase">{diag.iceState}</span>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400">Audio Codec:</span>
            <span className="font-bold text-amber-300">{diag.codec}</span>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400">Peer ID:</span>
            <span className="font-bold text-slate-300 text-[10px] break-all">{state.myPeerId || 'N/A'}</span>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400">Active Operators:</span>
            <span className="font-bold text-white">{Object.keys(state.peers).length + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
