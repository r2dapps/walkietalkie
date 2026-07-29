import React from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'error' | 'success';
  onClick?: () => void;
}

interface ToastProps {
  key?: React.Key;
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const bgStyles = {
    info: 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200',
    warning: 'bg-amber-950/90 border-amber-500/50 text-amber-200',
    error: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
    success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
  };

  const icons = {
    info: 'fa-circle-info text-cyan-400',
    warning: 'fa-triangle-exclamation text-amber-400',
    error: 'fa-circle-exclamation text-rose-400',
    success: 'fa-circle-check text-emerald-400'
  };

  const handleClick = () => {
    if (toast.onClick) {
      toast.onClick();
    }
    onDismiss(toast.id);
  };

  return (
    <div 
      onClick={handleClick}
      className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl border shadow-xl backdrop-blur-md cursor-pointer transition-all animate-fade-in text-xs font-mono select-none ${bgStyles[toast.type]} ${toast.onClick ? 'ring-1 ring-white/20 hover:ring-white/40' : ''}`}
    >
      <i className={`fa-solid ${icons[toast.type]} text-sm`}></i>
      <span className="font-bold flex-1">{toast.text}</span>
      {toast.onClick && <i className="fa-solid fa-arrow-right text-xs opacity-60"></i>}
    </div>
  );
}
