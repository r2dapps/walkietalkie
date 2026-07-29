import React from 'react';
import { useAppContext } from '../context/AppContext';

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: Props) {
  const { state } = useAppContext();
  
  const tabs = [
    { id: 'radio', icon: 'fa-walkie-talkie', label: 'Radio' },
    { id: 'peers', icon: 'fa-users', label: 'Operators', badge: Object.keys(state.peers).length },
    { id: 'chat', icon: 'fa-message', label: 'Comms', badge: state.unreadCount },
    { id: 'squad', icon: 'fa-crosshairs', label: 'Squad' },
    { id: 'settings', icon: 'fa-gear', label: 'Config' }
  ];

  return (
    <div className="h-16 bg-[var(--panel)] border-t border-[var(--accent)] border-opacity-20 flex justify-around items-center px-2 pb-safe">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full relative transition-colors
              ${isActive ? 'text-[var(--accent)]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="relative">
              <i className={`fa-solid ${tab.icon} text-lg mb-1`}></i>
              {tab.badge ? (
                <span className="absolute -top-2 -right-3 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium tracking-wide uppercase">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
