# AetherTalk / WalkieTalkie — Master React Conversion Spec

> **Purpose**: This document is a self-contained prompt/reference for AI Studio or any LLM to generate a clean React 19 + Vite + TypeScript + TailwindCSS 4 application that is a 1:1 feature-complete replacement of the existing vanilla JS `walkietalkie` codebase.
> Use this document as a single reference. The AI should generate files in the exact folder structure listed below, map every service to the existing logic described, and produce a PWA that is future-ready for Capacitor APK packaging.

---

## Project Stack

| Layer | Technology |
|:--|:--|
| Framework | React 19 (with hooks only — no class components) |
| Build Tool | Vite 6 |
| Language | TypeScript 5 (strict mode) |
| Styling | TailwindCSS 4 (utility-first, no pre-built UI libraries) |
| Icons | Lucide React + Font Awesome 6 CDN (for radio icons) |
| Realtime Signaling | Firebase Realtime Database v12 (modular SDK) |
| P2P Audio | PeerJS (loaded via CDN script tag in index.html) |
| Animations | Framer Motion (motion package) |
| State | React useState + useContext (no Redux) |
| Persistence | localStorage via a custom useStorage hook |
| PWA | Vite PWA Plugin + Service Worker |
| APK Path | Capacitor 7 (future — wrap Vite dist output) |

---

## Target Folder Structure

```
walkietalkie/
├── .env                        # Firebase keys (VITE_FIREBASE_*) — never committed
├── .env.example                # Template for Firebase keys
├── .gitignore
├── index.html                  # Vite entry HTML — loads PeerJS CDN + app root
├── vite.config.ts              # Vite + React + TailwindCSS + PWA plugins
├── tsconfig.json               # TypeScript strict config
├── package.json
├── public/
│   ├── icon.svg                # PWA app icon
│   ├── manifest.json           # PWA manifest (name, icons, theme_color)
│   └── sw.js                   # Service Worker (cache v1.0.15+)
└── src/
    ├── main.tsx                # React DOM root render
    ├── App.tsx                 # Root app component + providers
    ├── index.css               # Global CSS + TailwindCSS base + theme CSS variables
    ├── types.ts                # All TypeScript interfaces
    ├── services/               # Pure business logic (no JSX, no React deps)
    │   ├── audioEngine.ts
    │   ├── firebaseSignaling.ts
    │   ├── peerManager.ts
    │   ├── storageService.ts
    │   ├── shareService.ts
    │   └── notificationService.ts
    ├── hooks/
    │   ├── useApp.ts           # Main orchestration hook
    │   ├── useAudio.ts
    │   ├── useFirebase.ts
    │   ├── usePeer.ts
    │   └── useStorage.ts
    ├── context/
    │   └── AppContext.tsx
    └── components/
        ├── SetupView.tsx
        ├── RadioView.tsx
        ├── PttButton.tsx
        ├── LcdScreen.tsx
        ├── AudioVisualizer.tsx
        ├── BottomNav.tsx
        ├── SquadView.tsx
        ├── modals/
        │   ├── PeersModal.tsx
        │   ├── ChatModal.tsx
        │   ├── ShareModal.tsx
        │   ├── SettingsModal.tsx
        │   ├── AppLockModal.tsx
        │   └── DiagnosticsModal.tsx
        ├── admin/
        │   └── SuperAdminPortal.tsx
        └── ui/
            ├── Toast.tsx
            ├── ToastManager.tsx
            ├── NetworkBanner.tsx
            └── PresetsBar.tsx
```

---

## Environment Variables (.env)

```env
VITE_FIREBASE_API_KEY=AIzaSyAOdj4rmKB1GNDhhkm7ZpFgTRXTlHrEw5o
VITE_FIREBASE_AUTH_DOMAIN=walkietalkie-c0f03.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://walkietalkie-c0f03-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=walkietalkie-c0f03
VITE_FIREBASE_STORAGE_BUCKET=walkietalkie-c0f03.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=930318008093
VITE_FIREBASE_APP_ID=1:930318008093:web:06597d7007ebd089a3ebf4
VITE_FIREBASE_MEASUREMENT_ID=G-LYPVXMGNTR
```

---

## TypeScript Interfaces (src/types.ts)

```typescript
export interface OperatorProfile {
  callsign: string;          // e.g. "Operator-1"
  rank: string;              // e.g. "Captain"
  avatar: AvatarId;
  status: string;
}

export type AvatarId =
  'radio' | 'user-ninja' | 'shield' | 'tower-cell' | 'headset' | 'ghost' |
  'bolt' | 'fire' | 'crosshairs' | 'robot' | 'crown' | 'cat';

export interface Channel {
  id: string;
  label: string;
  passcode: string;
}

export interface PeerInfo {
  peerId: string;            // format: wt-{room}-{callsign}-{rand5}
  callsign: string;
  avatar: string;
  isTransmitting: boolean;
  pingMs: number;
  joinedAt: number;
  muted: boolean;
  isBlocked: boolean;
  ipAddress?: string;        // SuperAdmin only
  deviceUuid?: string;       // SuperAdmin only
}

export interface AudioPrefs {
  rogerBeep: boolean;        // default true
  squelch: boolean;          // default true
  eqPreset: EqPreset;        // default 'military'
  voxEnabled: boolean;       // default false
  voxThreshold: number;      // default -35 dB (energy level ~20 out of 255)
  totTimeout: number;        // default 60 seconds
  volume: number;            // default 1.0
  pttMode: 'hold' | 'toggle'; // default 'hold'
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

export type ThemeName = 'tactical-dark' | 'techtalkie-oled' | 'cyber-neon' | 'desert-camo' | 'stealth-black';

export interface ChatMessage {
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
```

---

## Services — Business Logic Mapping

### src/services/storageService.ts
Replaces: js/storage.js (StorageManager class)
Pattern: Export pure functions using localStorage with prefix "aethertalk_"

```typescript
// All functions to implement:
getDeviceUuid(): string
getCallsign(): string             // default: 'Operator-1'
setCallsign(val: string): void
getLastChannel(): string          // default: 'alpha-1'
setLastChannel(val: string): void
getFavorites(): string[]          // default: ['alpha-1', 'bravo-2', 'tactical-9']
addFavorite(ch: string): void
removeFavorite(ch: string): void
getCustomPresets(): ChannelPreset[]
saveCustomPreset(p: ChannelPreset): ChannelPreset[]
deleteCustomPreset(id: string): ChannelPreset[]
getAudioPrefs(): AudioPrefs
saveAudioPrefs(p: Partial<AudioPrefs>): void
getProfile(): OperatorProfile
saveProfile(p: Partial<OperatorProfile>): void
getFriends(): Record<string, Friend>
saveFriends(f: Record<string, Friend>): void
getBlockedPeers(): Record<string, BlockedPeer>
saveBlockedPeers(b: Record<string, BlockedPeer>): void
getPin(): string                  // default: '0000'
savePin(pin: string): void
getIsLocked(): boolean
saveIsLocked(v: boolean): void
getTheme(): ThemeName             // default: 'tactical-dark'
saveTheme(t: ThemeName): void
```

---

### src/services/audioEngine.ts
Replaces: js/audio.js (AudioEngine class)
Export: Singleton class instance exported as audioEngine.

Audio DSP Chain (exact same as vanilla JS):
```
MicSource → HPF(300Hz) → LPF(3200Hz) → Distortion(WaveShaper) → Compressor → txGain → MediaStreamDestination
                                                                              ↘ Analyser (VOX/VU)
                                                                              ↘ masterGain → ctx.destination
```

Key methods:
```typescript
getMicrophoneStream(): Promise<MediaStream>
// Init AudioContext (sampleRate: 48000) + build DSP chain + return processedStream

setTransmissionActive(active: boolean): void
// CRITICAL: t.enabled = active || audioPrefs.voxEnabled (keep mic on for VOX)
// txGain ramp: 0→1 (15ms fade-in) on active, 1→0 (15ms fade-out) on release
// On active: playPttClickSound(), muteAllRemoteAudio()
// On release: unmuteAllRemoteAudio(), then playRogerBeep() or playSquelchTail()

applyEqPreset(preset: EqPreset): void
// Amounts: clean=0, analog_fm=5, military=15, cb_radio=30, vintage=50
// Formula: curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
// clean: HPF=80Hz, LPF=8000Hz, curve=null | others: HPF=300Hz, LPF=3200Hz

getAnalyserNode(): AnalyserNode | null
playRogerBeep(): void       // 1000Hz (65ms) → 1200Hz (95ms) dual oscillator
playSquelchTail(): void     // 90ms bandpass(1200Hz) white noise burst
playPttClickSound(): void   // triangle osc 800Hz→200Hz, 25ms
playPeerJoinChime(): void   // [440, 660, 880]Hz ascending sine, 80ms apart
playPeerLeaveChime(): void  // [880, 660, 440]Hz descending sine, 80ms apart
startVoxMonitoring(cb): void // 100ms setInterval, threshold: avg > 20 (0-255 scale)
stopVoxMonitoring(): void
enumerateAudioDevices(): Promise<{inputs: MediaDeviceInfo[]; outputs: MediaDeviceInfo[]}>
selectAudioInputDevice(deviceId: string): Promise<void>
selectAudioOutputDevice(deviceId: string): Promise<void>
muteAllRemoteAudio(): void   // document.querySelectorAll('audio[id^="audio-"]').muted = true
unmuteAllRemoteAudio(): void
```

---

### src/services/firebaseSignaling.ts
Replaces: js/firebase-signaling.js (FirebaseSignaling class)
Uses: Firebase v12 modular SDK (NOT compat).
CRITICAL: All Firebase RTDB key strings → .replace(/[.#$\[\]]/g, '_')

Firebase RTDB Data Schema:
```
rooms/
  {roomKey}/
    peers/
      {peerId} = { callsign, avatar, device_uuid, ip_address, joinedAt, peerId }
    ptt_lock/
      { callsign, timestamp }
    chats/
      {pushId} = { sender, text, timestamp, created }

invites/
  {safeCallsign}/
    {pushId} = { fromCallsign, room, key, timestamp }

banned_operators/
  {safeTarget} = true      // dots in IPs replaced: 192_168_1_50
```

roomKey format: safeRoom + (passcode ? '_' + safePasscode : '')
where safeRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '')

Key methods:
```typescript
init(config): boolean
joinRoom(roomName, myPeerId, callsign, onPeerDiscovered, passcode): void
leaveRoom(): void
sendRoomChat(callsign, text): void
listenForRoomChat(onMessage): void
sendInvitePing(targetCallsign, roomName, senderCallsign): void   // 5s rate limit
listenForInvitePings(myCallsign): void
requestPttLock(callsign): Promise<boolean>   // runTransaction()
releasePttLock(callsign): void
listenForPttLock(onLockChanged): void
```

LIVE BAN ENFORCEMENT (Critical — was missing in vanilla JS):
```typescript
// Inside joinRoom(), use onValue() (NOT .once()) for persistent real-time checking:
const banRef = ref(db, `banned_operators/${safeCallsign}`);
const unsubBan = onValue(banRef, (snap) => {
  if (snap.exists() && snap.val() === true) {
    leaveRoom();             // Remove Firebase presence
    peerManager.disconnect(); // Destroy all WebRTC connections
    showBanModal('BANNED'); // Full-screen non-dismissible modal
  }
});
// Same for IP after api.ipify.org resolves
```

---

### src/services/peerManager.ts
Replaces: js/peer.js (PeerManager class)
Depends on: PeerJS loaded via CDN (window as any).Peer

Peer ID format: wt-{sanitizedRoom}-{sanitizedCallsign}-{random5}
- sanitizeRoom: .toLowerCase().replace(/[^a-z0-9]/g,'').substring(0, 20)
- sanitizeCallsign: .toLowerCase().replace(/[^a-z0-9]/g,'').substring(0, 10)

ICE Servers (exact config):
```typescript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
];
```

Key internal state:
```typescript
peer: Peer | null
myPeerId: string
activeCalls: Record<string, MediaConnection>
dataConns: Record<string, DataConnection>
connectedPeers: Record<string, PeerInfo>
dialingPeers: Record<string, boolean>     // prevents duplicate dial attempts
audioElements: Record<string, HTMLAudioElement>
isTransmitting: boolean
diagnostics: { rttMs, packetsSent, packetsLost, codec, iceState }
```

Callbacks (wire to React state via refs):
```typescript
callbacks: {
  onPeerListUpdate: (peers: Record<string, PeerInfo>) => void;
  onRadioStateChange: (state: 'standby'|'transmitting'|'receiving', speaker?: string) => void;
  onChatMessage: (sender: string, text: string, timestamp: string) => void;
  onChannelBusy: (speakerName: string) => void;
  onTotUpdate: (secondsLeft: number) => void;
}
```

TOT (Time-Out Timer): 60s countdown on PTT active. Force stopTransmission() at 0.

Audio elements: Created imperatively, appended to document.body (NOT in JSX).
ID format: `audio-{peerId}` — enables muteAllRemoteAudio() querySelector.

---

### src/services/shareService.ts
Replaces: js/share.js (ShareManager class)

```typescript
parseUrlHash(): { room, callsign, target, key } | null
getShareableUrl(roomName: string, passcode?: string): string   // #room={r}&key={k}
copyInviteLink(roomName, passcode?): Promise<boolean>
shareNative(roomName, passcode?): Promise<boolean>   // navigator.share()
// QR Code: use <QRCodeSVG> from qrcode.react library in the ShareModal component
```

---

## UI Components — Screen-by-Screen Spec

### Global CSS Variables (src/index.css)

Themes applied as data-theme on body element:
```css
body[data-theme="tactical-dark"]   { --bg: #090d16; --accent: #06b6d4; }
body[data-theme="techtalkie-oled"] { --bg: #050811; --panel: #0b1120; }
body[data-theme="cyber-neon"]      { --bg: #090614; --accent: #a855f7; }
body[data-theme="desert-camo"]     { --bg: #1a1208; --accent: #f59e0b; }
body[data-theme="stealth-black"]   { --bg: #000000; --accent: #64748b; }
```

---

### SetupView (src/components/SetupView.tsx)
Shown when: !appState.isJoined

UI Elements:
- App header: Logo + "AetherTalk" title + connection badge (pulsing green dot)
- Channel frequency input (id="roomInput", placeholder="alpha-1")
- Callsign input (id="callsignInput", placeholder="Operator-1")
- Channel passcode input (id="channelPasscodeInput", optional)
- Channel Presets bar: quick-click buttons (alpha-1, bravo-2, tactical-9, family-1)
- Custom Presets panel: saved presets from localStorage (label + quick-join)
- Join button: "Establish Frequency" — calls joinFrequency()
- Network offline banner (conditionally shown)

---

### RadioView (src/components/RadioView.tsx)
Shown when: appState.isJoined

Sub-components:
1. LcdScreen — channel, frequency, signal bars, TX/RX/BAT LEDs
2. AudioVisualizer — canvas FFT ring waveform
3. PttButton — large circular tactical button
4. RadioStateText — "STANDBY"/"TRANSMITTING"/"RECEIVING {name}" + 1-tap mode toggle
5. RadioControls — volume, EQ, VOX, Roger Beep, squelch toggles
6. TOT Timer — countdown badge (shown only when transmitting)
7. BottomNav — 5-tab navigation

---

### PttButton (src/components/PttButton.tsx)

Hold mode (pttMode === 'hold'):
- onMouseDown + onTouchStart → startPTT()
- onMouseUp + onMouseLeave + onTouchEnd → stopPTT()
- Spacebar on window triggers PTT

Toggle mode (pttMode === 'toggle'):
- First tap → startPTT(), second tap → stopPTT()

Visual states:
- Standby: bg-slate-800 border-slate-600, subtle glow
- Transmitting: bg-rose-600 border-rose-400, animate-ping outer ring
- Receiving: bg-emerald-600 border-emerald-400

---

### LcdScreen (src/components/LcdScreen.tsx)

Displays:
- Frequency text: "FREQ: 146.520 ({ROOM.toUpperCase()})"
- Active channel: "#{room}"
- Signal quality: 3-5 animated bars based on RTT diagnostics
- LED indicators: TX (rose), RX (emerald), BAT (amber) pulsing dots
- PTT Lock badge: "CH LOCKED — {callsign}" when Firebase PTT lock is held

---

### AudioVisualizer (src/components/AudioVisualizer.tsx)

Exact rendering algorithm (from js/visualizer.js):
- Canvas-based circular ring waveform using requestAnimationFrame
- Reads audioEngine.getAnalyserNode().getByteFrequencyData()
- Idle: sine wave animation (t = Date.now() * 0.003)
- Colors: TX=[244,63,94] RX=[16,185,129] Standby=[100,116,139]
- radius = Math.min(w,h) * 0.38
- maxExcursion = Math.min(w,h) * 0.13
- Pause RAF loop when document.hidden (visibility API)

---

### BottomNav (src/components/BottomNav.tsx)

5 Tabs:
- Radio (home — RadioView/SetupView)
- Peers (PeersModal — active channel operators with count badge)
- Chat (ChatModal — with unread count badge)
- Squad (SquadView — friends list + ping)
- Settings (SettingsModal)

---

### ChatModal (src/components/modals/ChatModal.tsx)

Features:
- Firebase RTDB chat scoped to current session: rooms/{roomKey}/chats/
- Text input + Send button
- GPS Location button: sendGpsLocation() → "GPS COORDS: {lat}, {lng}"
- Clear Log button (clears local display only)
- NATO Phonetic Helper (collapsible panel):
  - A=Alpha, B=Bravo, C=Charlie, D=Delta, E=Echo, F=Foxtrot, G=Golf, H=Hotel
  - I=India, J=Juliet, K=Kilo, L=Lima, M=Mike, N=November, O=Oscar, P=Papa
  - Q=Quebec, R=Romeo, S=Sierra, T=Tango, U=Uniform, V=Victor, W=Whiskey
  - X=X-ray, Y=Yankee, Z=Zulu
  - Each letter is a clickable chip that auto-inserts into chat input

---

### SettingsModal (src/components/modals/SettingsModal.tsx)

Sections:
1. Operator Profile: Callsign, Rank, Status, Avatar selector (12 grid presets with FA icons)
2. Audio Settings: EQ preset dropdown, Roger Beep toggle, Squelch toggle, VOX toggle, Volume slider
3. Audio Devices: Mic input selector, Speaker output selector
4. PTT Mode: Talk mode dropdown (hold / toggle)
5. UI Theme: Theme selector (5 themes)
6. Notifications: Enable push notifications button
7. Squad/Friends: Add friend input + friends list with Ping + Remove
8. Blocked Operators: List with Unblock button
9. Security: Change PIN (current + new 4-digit PIN)
10. PWA Cache: "Check For Latest App Updates (Clear Cache)" → pwaManager.forceCachePurge()
11. Custom Channel Presets: CRUD for saved presets (id, label, room, key)

---

### AppLockModal (src/components/modals/AppLockModal.tsx)

Full-screen overlay (z-50 or z-[9999], cannot be dismissed without correct PIN):
- 4-dot PIN display (pin-dot-1 through pin-dot-4)
- 3x4 numeric keypad (0-9, backspace)
- Shake animation (animate-shake) on wrong PIN
- Default PIN: 0000

---

### SuperAdminPortal (src/components/admin/SuperAdminPortal.tsx)

Login: user=admin, pass=admin|1234|family2026

Connected Operators Table (real-time from rooms/alpha1/peers):
Columns: Callsign | Device UUID | IP Address | Joined | [Ban User] [Ban IP]

Banned List (from banned_operators/):
- Each entry with Unban button

Stats: Active operators, Banned devices count, Estimated RTDB KB

CRITICAL: banOperator(target):
```typescript
const safeKey = rawTarget.trim().replace(/[.#$\[\]]/g, '_');
db.ref(`banned_operators/${safeKey}`).set(true);
```

---

## Main App Hook (src/hooks/useApp.ts)
Replaces: js/app.js (App class)

```typescript
// Core state:
const [isJoined, setIsJoined] = useState(false);
const [currentRoom, setCurrentRoom] = useState('alpha1');
const [myCallsign, setMyCallsign] = useState('Operator-1');
const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
const [radioState, setRadioState] = useState<'standby'|'transmitting'|'receiving'>('standby');
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

// On mount: parse URL hash params for auto-join
// hashParams format: #room=alpha-1&key=7788&target=wt-alpha1-dad-a1b2c

async function joinFrequency(roomVal, callsignVal, passcodeVal) {
  // 1. audioEngine.getMicrophoneStream() → localStream ref
  // 2. peerManager.initPeer(room, callsign, stream, targetPeer, passcode)
  // 3. firebaseSignaling.joinRoom(room, peerId, callsign, onPeerDiscovered, passcode)
  // 4. firebaseSignaling.listenForInvitePings(callsign)
  // 5. firebaseSignaling.listenForPttLock(onLockChanged)
  // 6. setIsJoined(true)
}

async function startPTT() {
  if (!isJoined) return;
  const locked = await firebaseSignaling.requestPttLock(myCallsign);
  if (!locked) { showToast('Channel Busy!', 'warning'); return; }
  peerManager.startTransmission(localStreamRef.current);
}

function stopPTT() {
  if (!isJoined) return;
  firebaseSignaling.releasePttLock(myCallsign);
  peerManager.stopTransmission();
}

function leaveFrequency() {
  peerManager.disconnect();
  firebaseSignaling.leaveRoom();
  setIsJoined(false);
}

function sendChat(text: string) {
  peerManager.sendChatMessage(text);                      // P2P DataChannel
  firebaseSignaling.sendRoomChat(myCallsign, text);       // Firebase backup
  appendChatMessage(myCallsign, text, Date.now().toString(), true);
}

function sendGpsLocation() {
  navigator.geolocation.getCurrentPosition((pos) => {
    const text = `GPS COORDS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
    sendChat(text);
  });
}
```

---

## PWA Configuration

public/manifest.json:
```json
{
  "name": "AetherTalk Walkie Talkie",
  "short_name": "AetherTalk",
  "theme_color": "#06b6d4",
  "background_color": "#090d16",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

Service Worker strategy:
- Cache name: aethertalk-v1.0.15
- .js files: Network-First (avoid stale JS during updates)
- Static assets: Cache-First
- Push event: self.registration.showNotification()
- notificationclick: clients.openWindow(url)

---

## Future APK Packaging (Capacitor)

After React app is stable and tested:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init AetherTalk com.r2dapps.aethertalk
npm run build
npx cap add android
npx cap copy android
npx cap open android     # Open Android Studio for APK signing + release build
```

Required AndroidManifest.xml permissions:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

Capacitor plugins for full native features:
- @capacitor/push-notifications → FCM native background ringtone (phone rings when closed)
- @capacitor-community/bluetooth-le → Hardware Bluetooth PTT buttons (Zello/Motorola accessories)
- @capacitor/media → Native iOS audio session management (AirPlay, earpiece routing)

---

## Critical Bug Fixes (Must Carry Forward to React)

1. Firebase key sanitization
   ALL callsign and IP strings: .replace(/[.#$\[\]]/g, '_') before Firebase RTDB key use.
   Dots in IPs (192.168.1.50) become 192_168_1_50.

2. Live ban enforcement
   Use onValue() persistent listener (not .once()) so banning while user is connected
   immediately triggers leaveRoom() + peerManager.disconnect() + full-screen ban modal.

3. VOX mic track standby
   In setTransmissionActive(active): t.enabled = active || audioPrefs.voxEnabled
   Keep mic hardware enabled on standby if VOX mode is active (otherwise VOX never detects voice).

4. Firebase API key
   Store in .env (VITE_FIREBASE_API_KEY). Hardcoded fallback only for local dev.
   Secret scanners flag AIzaSy* strings in git — keep them in .env only.

---

## Key Design Rules for AI Studio

1. No class components — use only function components + hooks.
2. Services are plain TypeScript — no React imports in services/ folder.
3. AudioEngine, PeerManager, FirebaseSignaling are singletons exported from module files.
4. All Firebase RTDB key writes must be sanitized with .replace(/[.#$\[\]]/g, '_').
5. Theme applied via document.body.setAttribute('data-theme', name) — not React inline styles.
6. Audio elements for peer streams created imperatively and appended to document.body (not in JSX).
7. PeerJS loaded via CDN in index.html — access via (window as any).Peer.
8. Do NOT use any UI component libraries (no shadcn, no MUI, no Chakra) — all custom TailwindCSS.
9. App must be mobile-first — all layouts must work at 375px viewport width.
10. All user-facing strings (callsign defaults, channel names, toast messages) must match exactly.

