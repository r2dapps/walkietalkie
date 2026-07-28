/**
 * StorageManager - LocalStorage persistence layer for AetherTalk.
 * Manages callsigns, favorite channels, settings, audio preferences, and PWA options.
 */
class StorageManager {
  constructor() {
    this.PREFIX = 'aethertalk_';
  }

  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Storage read error:', e);
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }

  // Callsign
  getCallsign() {
    return this.get('callsign', 'Operator-1');
  }

  setCallsign(callsign) {
    this.set('callsign', callsign);
  }

  // Room / Channel
  getLastChannel() {
    return this.get('last_channel', 'alpha-1');
  }

  setLastChannel(channel) {
    this.set('last_channel', channel);
  }

  // Favorite Channels
  getFavorites() {
    return this.get('favorite_channels', ['alpha-1', 'bravo-2', 'tactical-9']);
  }

  addFavorite(channel) {
    const favs = this.getFavorites();
    if (!favs.includes(channel)) {
      favs.push(channel);
      this.set('favorite_channels', favs);
    }
  }

  removeFavorite(channel) {
    const favs = this.getFavorites().filter(c => c !== channel);
    this.set('favorite_channels', favs);
  }

  // Audio Preferences
  getAudioPrefs() {
    return this.get('audio_prefs', {
      rogerBeep: true,
      squelch: true,
      eqPreset: 'military', // 'clean', 'analog_fm', 'military', 'cb_radio', 'vintage'
      voxEnabled: false,
      voxThreshold: -35, // dB
      totTimeout: 60, // seconds
      volume: 1.0
    });
  }

  saveAudioPrefs(prefs) {
    const current = this.getAudioPrefs();
    this.set('audio_prefs', { ...current, ...prefs });
  }

  // General App Settings
  getAppSettings() {
    return this.get('app_settings', {
      haptics: true,
      audioRoute: 'default',
      darkTheme: true,
      natoHelperOpen: false
    });
  }

  saveAppSettings(settings) {
    const current = this.getAppSettings();
    this.set('app_settings', { ...current, ...settings });
  }
}

// Export singleton instance
window.storageManager = new StorageManager();
