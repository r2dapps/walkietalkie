import React, { createContext, useContext, ReactNode } from 'react';
import { useApp } from '../hooks/useApp';

type UseAppReturnType = ReturnType<typeof useApp>;

const AppContext = createContext<UseAppReturnType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const appState = useApp();
  
  return (
    <AppContext.Provider value={appState}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
