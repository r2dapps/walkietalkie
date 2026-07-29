export interface OperatorProfile {
  callsign: string;          // e.g. "Operator-1" (Unique ID)
  displayName: string;       // e.g. "Captain Alex Vance"
  rank: string;              // e.g. "Squad Leader"
  avatar: AvatarId;
  status: string;
}

export type AvatarId =
  | 'radio' | 'user-ninja' | 'shield' | 'tower-cell' | 'headset' | 'ghost'
  | 'bolt' | 'fire' | 'crosshairs' | 'robot' | 'crown' | 'cat' | 'dog' | 'hippo'
  | 'dragon' | 'otter' | 'frog' | 'kiwi-bird' | 'spider' | 'bug' | 'snowman';

export interface Channel {
  id: string;
  label: string;
  passcode: string;
}

export interface PeerInfo {
  peerId: string;
  callsign: string;
  displayName?: string;
  avatar: string;
  isTransmitting: boolean;
  pingMs: number;
  joinedAt: number;
  muted: boolean;
  isBlocked: boolean;
  ipAddress?: string;
  deviceUuid?: string;
}

export interface AudioPrefs {
  rogerBeep: boolean;
  squelch: boolean;
  eqPreset: EqPreset;
  voxEnabled: boolean;
  voxThreshold: number;
  totTimeout: number;
  volume: number;
  pttMode: 'hold' | 'toggle';
  inputDeviceId?: string;
  outputDeviceId?: string;
}

export type EqPreset = 'clean' | 'analog_fm' | 'military' | 'cb_radio' | 'vintage';

export interface AppState {
  isJoined: boolean;
  currentRoom: string;
  myCallsign: string;
  myPeerId: string;
  passcode: string;
  peers: Record<string, PeerInfo>;
  radioState: 'standby' | 'transmitting' | 'receiving';
  activeSpeaker: string | null;
  chatMessages: ChatMessage[];
  unreadCount: number;
  profile: OperatorProfile;
  audioPrefs: AudioPrefs;
  theme: ThemeName;
  appLocked: boolean;
}

export type ThemeName = 'tactical-dark' | 'techtalkie-oled' | 'cyber-neon' | 'desert-camo' | 'stealth-black' | 'glassmorphism' | 'creamy-vanilla';

export interface ChatMessage {
  id?: string;
  sender: string;
  text: string;
  timestamp: string;
  isMine: boolean;
}

export interface ChannelPreset {
  id: string;
  label: string;
  room: string;
  key: string;
}

export interface Friend {
  callsign: string;
  peerId: string;
  addedAt: number;
}

export interface BlockedPeer {
  callsign: string;
  blockedAt: number;
}

export interface PttLock {
  callsign: string;
  timestamp: number;
}

export interface InvitePing {
  fromCallsign: string;
  room: string;
  key: string;
  timestamp: number;
}
