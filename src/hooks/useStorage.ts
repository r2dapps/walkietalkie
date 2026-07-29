import { useState, useEffect, useCallback } from 'react';
import * as storage from '../services/storageService';
import { AudioPrefs, ChannelPreset, OperatorProfile, Friend, BlockedPeer, ThemeName } from '../types';

export function useStorage() {
  const [profile, setProfileState] = useState<OperatorProfile>(storage.getProfile());
  const [audioPrefs, setAudioPrefsState] = useState<AudioPrefs>(storage.getAudioPrefs());
  const [theme, setThemeState] = useState<ThemeName>(storage.getTheme());
  
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const updateProfile = useCallback((p: Partial<OperatorProfile>) => {
    storage.saveProfile(p);
    setProfileState(storage.getProfile());
  }, []);

  const updateAudioPrefs = useCallback((p: Partial<AudioPrefs>) => {
    storage.saveAudioPrefs(p);
    setAudioPrefsState(storage.getAudioPrefs());
  }, []);

  const updateTheme = useCallback((t: ThemeName) => {
    storage.saveTheme(t);
    setThemeState(t);
  }, []);

  return {
    profile,
    updateProfile,
    audioPrefs,
    updateAudioPrefs,
    theme,
    updateTheme,
    // Provide pure functions for the rest to avoid unnecessary re-renders
    getCallsign: storage.getCallsign,
    setCallsign: storage.setCallsign,
    getLastChannel: storage.getLastChannel,
    setLastChannel: storage.setLastChannel,
    getFavorites: storage.getFavorites,
    addFavorite: storage.addFavorite,
    removeFavorite: storage.removeFavorite,
    getCustomPresets: storage.getCustomPresets,
    saveCustomPreset: storage.saveCustomPreset,
    deleteCustomPreset: storage.deleteCustomPreset,
    getFriends: storage.getFriends,
    saveFriends: storage.saveFriends,
    getBlockedPeers: storage.getBlockedPeers,
    saveBlockedPeers: storage.saveBlockedPeers,
    getPin: storage.getPin,
    savePin: storage.savePin,
    getIsLocked: storage.getIsLocked,
    saveIsLocked: storage.saveIsLocked
  };
}
