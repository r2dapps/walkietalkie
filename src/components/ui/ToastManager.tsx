import React, { useState, useEffect } from 'react';
import Toast, { ToastMessage } from './Toast';

let toastSubscriber: ((msg: string, type?: ToastMessage['type']) => void) | null = null;

export function showToast(text: string, type: ToastMessage['type'] = 'info') {
  if (toastSubscriber) {
    toastSubscriber(text, type);
  }
}

export default function ToastManager() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastSubscriber = (text: string, type: ToastMessage['type'] = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, text, type };
      setToasts(prev => [...prev.slice(-3), newToast]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    return () => {
      toastSubscriber = null;
    };
  }, []);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col space-y-2 max-w-xs w-full px-2 pointer-events-auto">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
