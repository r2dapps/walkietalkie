import React, { useState, useEffect } from 'react';

export default function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-rose-600 text-white text-[11px] font-mono font-bold px-3 py-1.5 flex items-center justify-center space-x-2 animate-pulse shrink-0">
      <i className="fa-solid fa-wifi-slash"></i>
      <span>NETWORK DISCONNECTED — WEBRTC STANDBY</span>
    </div>
  );
}
