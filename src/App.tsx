import React, { useState, useEffect } from 'react';
import SuperAdminPortal from './components/admin/SuperAdminPortal';
import { useAppContext } from './context/AppContext';
import SetupView from './components/SetupView';
import RadioView from './components/RadioView';
import BottomNav from './components/BottomNav';
import ChatModal from './components/modals/ChatModal';
import PeersModal from './components/modals/PeersModal';
import SettingsModal from './components/modals/SettingsModal';
import SquadView from './components/SquadView';
import AppLockModal from './components/modals/AppLockModal';
import ToastManager from './components/ui/ToastManager';

export default function App() {
  const { state, banned } = useAppContext();
  const [activeTab, setActiveTab] = useState('radio');
  const [isAdminPortal, setIsAdminPortal] = useState(() => window.location.hash.includes('admin'));

  useEffect(() => {
    const handleHash = () => {
      setIsAdminPortal(window.location.hash.includes('admin'));
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (isAdminPortal) {
    return <SuperAdminPortal />;
  }

  if (banned) {
    return (
      <div className="flex flex-col h-full bg-rose-950 p-6 items-center justify-center text-center touch-none">
        <i className="fa-solid fa-ban text-6xl text-rose-500 mb-6"></i>
        <h1 className="text-3xl font-bold tracking-widest uppercase text-white mb-2">BANNED</h1>
        <p className="text-rose-200 font-mono text-sm">Your access to AetherTalk has been revoked by an administrator.</p>
      </div>
    );
  }

  // If not joined, always show SetupView regardless of tab
  if (!state.isJoined) {
    return (
      <>
        <SetupView />
        <AppLockModal />
        <ToastManager />
      </>
    );
  }

  // Render content based on active tab
  let content = null;
  switch (activeTab) {
    case 'radio':
      content = <RadioView />;
      break;
    case 'peers':
      content = <PeersModal />;
      break;
    case 'chat':
      content = <ChatModal />;
      break;
    case 'squad':
      content = <SquadView />;
      break;
    case 'settings':
      content = <SettingsModal />;
      break;
    default:
      content = <RadioView />;
  }

  return (
    <>
      <div className="flex flex-col h-full w-full bg-[var(--bg)] overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          {content}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <AppLockModal />
      <ToastManager />
    </>
  );
}
