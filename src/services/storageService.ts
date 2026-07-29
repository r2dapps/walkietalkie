import { AudioPrefs, ChannelPreset, OperatorProfile, Friend, BlockedPeer, ThemeName } from '../types';

const PREFIX = 'aethertalk_';

function get<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(PREFIX + key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);
  }
}

export function getDeviceUuid(): string {
  let uuid = get<string>('device_uuid', '');
  if (!uuid) {
    uuid = crypto.randomUUID();
    set('device_uuid', uuid);
  }
  return uuid;
}

export function getCallsign(): string {
  return get<string>('callsign', 'Operator-1');
}

export function setCallsign(val: string): void {
  set('callsign', val);
}

export function getLastChannel(): string {
  return get<string>('last_channel', 'alpha-1');
}

export function setLastChannel(val: string): void {
  set('last_channel', val);
}

export function getFavorites(): string[] {
  return get<string[]>('favorites', ['alpha-1', 'bravo-2', 'tactical-9']);
}

export function addFavorite(ch: string): void {
  const favs = getFavorites();
  if (!favs.includes(ch)) {
    favs.push(ch);
    set('favorites', favs);
  }
}

export function removeFavorite(ch: string): void {
  const favs = getFavorites();
  set('favorites', favs.filter(c => c !== ch));
}

export function getCustomPresets(): ChannelPreset[] {
  return get<ChannelPreset[]>('custom_presets', []);
}

export function saveCustomPreset(p: ChannelPreset): ChannelPreset[] {
  const presets = getCustomPresets();
  const existing = presets.findIndex(c => c.id === p.id);
  if (existing >= 0) {
    presets[existing] = p;
  } else {
    presets.push(p);
  }
  set('custom_presets', presets);
  return presets;
}

export function deleteCustomPreset(id: string): ChannelPreset[] {
  const presets = getCustomPresets().filter(p => p.id !== id);
  set('custom_presets', presets);
  return presets;
}

export function getAudioPrefs(): AudioPrefs {
  return get<AudioPrefs>('audio_prefs', {
    rogerBeep: true,
    squelch: true,
    eqPreset: 'military',
    voxEnabled: false,
    voxThreshold: 20,
    totTimeout: 60,
    volume: 1.0,
    pttMode: 'hold'
  });
}

export function saveAudioPrefs(p: Partial<AudioPrefs>): void {
  const current = getAudioPrefs();
  set('audio_prefs', { ...current, ...p });
}

export function getProfile(): OperatorProfile {
  const profile = get<OperatorProfile>('profile', {
    callsign: 'Operator-1',
    displayName: 'Commander Vance',
    rank: 'Squad Leader',
    avatar: 'radio',
    status: 'Online & Ready'
  });
  if (!profile.displayName) {
    profile.displayName = profile.callsign || 'Commander Vance';
  }
  return profile;
}

export function saveProfile(p: Partial<OperatorProfile>): void {
  const current = getProfile();
  set('profile', { ...current, ...p });
}

export function getFriends(): Record<string, Friend> {
  return get<Record<string, Friend>>('friends', {});
}

export function saveFriends(f: Record<string, Friend>): void {
  set('friends', f);
}

export function getBlockedPeers(): Record<string, BlockedPeer> {
  return get<Record<string, BlockedPeer>>('blocked', {});
}

export function saveBlockedPeers(b: Record<string, BlockedPeer>): void {
  set('blocked', b);
}

export function getPin(): string {
  return get<string>('pin', '0000');
}

export function savePin(pin: string): void {
  set('pin', pin);
}

export function getIsLocked(): boolean {
  return get<boolean>('is_locked', false);
}

export function saveIsLocked(v: boolean): void {
  set('is_locked', v);
}

export function getTheme(): ThemeName {
  return get<ThemeName>('theme', 'tactical-dark');
}

export function saveTheme(t: ThemeName): void {
  set('theme', t);
}
