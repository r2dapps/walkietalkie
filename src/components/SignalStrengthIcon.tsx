import React, { useEffect, useState } from 'react';
import { peerManager } from '../services/peerManager';
import { useAppContext } from '../context/AppContext';

export default function SignalStrengthIcon() {
  const { state } = useAppContext();
  const { isJoined, peers } = state;
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    if (!isJoined) {
      setLatency(null);
      return;
    }

    const interval = setInterval(() => {
      const avgPing = peerManager.getAverageLatency();
      setLatency(avgPing);
    }, 1500);

    // Initial check
    setLatency(peerManager.getAverageLatency());

    return () => clearInterval(interval);
  }, [isJoined, peers]);

  // Calculate signal bars (0 to 4)
  let bars = 0;
  let label = 'SEARCHING';
  let colorClass = 'text-slate-500';

  if (isJoined) {
    if (latency === null) {
      bars = 1;
      label = 'CONNECTING';
      colorClass = 'text-amber-400';
    } else if (latency <= 80) {
      bars = 4;
      label = 'EXCELLENT';
      colorClass = 'text-emerald-400';
    } else if (latency <= 180) {
      bars = 3;
      label = 'GOOD';
      colorClass = 'text-cyan-400';
    } else if (latency <= 350) {
      bars = 2;
      label = 'FAIR';
      colorClass = 'text-amber-400';
    } else {
      bars = 1;
      label = 'POOR';
      colorClass = 'text-rose-400';
    }
  }

  const heights = ['h-1.5', 'h-2.5', 'h-3.5', 'h-4.5'];

  return (
    <div 
      className="flex items-center space-x-2 bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg select-none"
      title={`Connection Quality: ${label}${latency !== null ? ` (${latency}ms latency)` : ''}`}
    >
      {/* Standard Cellular Signal Bar Iconography */}
      <div className="flex items-end space-x-0.5 h-5 pb-0.5">
        {[1, 2, 3, 4].map((barNum) => {
          const isActive = barNum <= bars;
          return (
            <div
              key={barNum}
              className={`w-1 rounded-xs transition-all duration-300 ${heights[barNum - 1]} ${
                isActive
                  ? colorClass === 'text-emerald-400'
                    ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                    : colorClass === 'text-cyan-400'
                    ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]'
                    : colorClass === 'text-amber-400'
                    ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                    : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  : 'bg-slate-700/60'
              }`}
            />
          );
        })}
      </div>

      {/* Latency / Status Badge Text */}
      <div className="flex flex-col text-[9px] font-mono leading-none">
        <span className={`font-bold tracking-wider ${colorClass}`}>{label}</span>
        <span className="text-slate-400 text-[8px] mt-0.5">
          {latency !== null ? `${latency}ms` : 'OFFLINE'}
        </span>
      </div>
    </div>
  );
}
