# AetherTalk — Tactical Walkie-Talkie

> **A high-fidelity, real-time Push-to-Talk voice communication platform for the web.** Built with a military-grade tactical aesthetic, AetherTalk works across the internet, on LAN networks, and installs as a standalone PWA on any device.

---

## ✨ Feature Overview

### 🎙️ Voice Communication
| Feature | Description |
|---|---|
| **P2P Audio (WebRTC)** | Ultra-low-latency voice chat via PeerJS. Audio travels directly between peers — no server relay needed once connected. |
| **PTT (Push-to-Talk)** | Hold the on-screen PTT button OR press the **SPACEBAR** to transmit. |
| **VOX (Voice Activation)** | Hands-free mode. Your mic auto-transmits when it detects your voice above a configurable threshold, with a 1-second hang-time to prevent choppy transmission. |
| **PTT Toggle Mode** | Instead of hold-to-talk, tap once to lock TX on, tap again to release. |
| **Time-Out Timer (TOT)** | Configurable countdown (30-300s) that cuts your mic if you transmit too long — prevents channel jamming. |
| **Roger Beep** | Classic tactical roger beep plays at end of each transmission. |
| **Squelch Tail** | Short burst of white noise plays at end of a received transmission (authentic radio feel). |
| **Channel Busy Alert** | If another operator is already transmitting, you cannot interrupt them — your PTT will show a busy state. |

### 📻 Radio LCD & Interface
| Feature | Description |
|---|---|
| **OLCD Display** | Military-style LCD shows: Channel frequency name, TX/RX/STANDBY state, Active speaker callsign, VHF band indicator, EQ preset name, VOX indicator, TOT countdown. |
| **Tuning Knob** | Physical-style drag knob to switch between preset frequencies. Respects the **Radio Lock** so channels cannot be changed accidentally. |
| **EQ Audio Presets** | 5 presets: **CLN** (clean mic), **AFM** (Analog FM radio warmth), **MIL** (military tactical harsh), **CB** (trucker CB radio), **VTG** (vintage 1940s walkie crackle). |
| **Audio Visualizer** | Live animated waveform bar in the LCD while transmitting or receiving. |
| **Channel Lock** | Lock icon on the radio panel. When active: prevents PTT and prevents the tuning knob from changing channels. |

### 👥 Operators & Squad
| Feature | Description |
|---|---|
| **Active Operators** | Live list of all operators on the same frequency, showing avatar, display name, callsign, channel, and ping (ms). Transmitting operators glow green. |
| **Ping System** | Send a join-invite ping to any operator. Each ping has a **60-second cooldown** timer shown live in the button — unified across all tabs. |
| **Squad / Friends** | Save operator callsigns to your squad list. If they come online on the same frequency, their card updates live with their avatar, display name, and latency. Offline friends show greyed out. |

### 💬 Comms Log (Chat)
| Feature | Description |
|---|---|
| **Text Chat** | Real-time text chat via dual redundant channels: P2P WebRTC data channel (fast) + Firebase RTDB (reliable fallback). |
| **De-duplication** | Smart deduplication prevents double messages even when both channels deliver the same message simultaneously. |
| **Display Names in Chat** | Chat log shows operator Display Name with callsign in parentheses for context. |
| **NATO Phonetic Keyboard** | Tap-to-insert NATO phonetic alphabet buttons for authentic radio spelling. |
| **GPS Location Share** | Share your current GPS coordinates as a text message for tactical positioning. |
| **Unread Badge** | Red badge on the COMMS tab icon shows count of unread messages. |

### 🔐 Security & Identity
| Feature | Description |
|---|---|
| **Passcode-Protected Rooms** | Optional passcode when joining a frequency. Passcode is hashed before use — never stored plain. |
| **Application PIN Lock** | Set a 4-digit PIN to lock the entire app. Requires PIN entry to unlock. |
| **Device ID** | Browser generates a permanent device fingerprint UUID. Admins can ban by Device ID, preventing rejoining by changing callsign. |
| **Operator Profile** | Set your Callsign (tactical), Display Name (full name), and Avatar (icon). |
| **QR Code Invite** | Generate a QR code for your current frequency so others can scan and join instantly. |

### 🔔 Notifications & Updates
| Feature | Description |
|---|---|
| **Push Notifications** | Browser push notifications for incoming pings. Works while tab is open or minimized. |
| **App Update Toast** | When a new version is deployed, an in-app toast pops up with a "tap to refresh" action — no manual reload needed. |
| **Mic Permission Check** | Dedicated button in Config to manually trigger microphone permission (useful if the browser prompt was accidentally dismissed). |

### 📱 PWA & Installation
| Feature | Description |
|---|---|
| **Installable PWA** | Full Progressive Web App with `manifest.json` and Service Worker. Install to home screen on Android, iOS (Add to Home Screen), and desktop Chrome/Edge. |
| **Offline Asset Cache** | Core app assets are cached by the Service Worker so the UI loads even without connectivity. |
| **Standalone App Feel** | Runs in standalone window mode — no browser chrome, full-screen immersion on mobile. |

### 🛠️ Configuration (System Config)
| Feature | Description |
|---|---|
| **Audio Preferences** | Volume, Input/Output device selection, EQ preset, VOX enable/threshold, TOT timeout. |
| **Custom Presets** | Save custom frequency presets (label + room + freq code) for quick joining. |
| **Visual Themes** | Multiple color themes: Default (Green), Amber/Khaki, Blue/Navy, Red Alert, Stealth (grey). |
| **Font Styles** | Toggle between different display font families. |

### 🔒 Admin Portal
| Feature | Description |
|---|---|
| **Super Admin Mode** | Hidden admin portal (append `#admin` to URL, requires secret key). |
| **Operator Ban** | Ban operators by callsign/Device ID from admin panel. |
| **Kick All** | Emergency channel clear — disconnects all operators from all rooms. |
| **Ban List Management** | View and unban operators from the ban list. |

---

## 🌐 Connectivity

### Does it work on LAN?
**Yes.** If all devices are on the same WiFi/LAN network, WebRTC will establish a **direct local connection** (usually < 5ms latency). No internet is required for the P2P audio stream itself.

> **Note:** Firebase (used for signaling/room discovery) requires internet to sync operator presence. For true offline LAN-only use, you would need to run a local STUN/TURN server and self-host a Firebase emulator.

### Does it work across the internet?
**Yes.** WebRTC will use STUN/TURN servers to punch through NAT firewalls. This works between operators on completely different networks, cities, or countries.

---

## ⚙️ Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/r2dapps/walkietalkie.git

# 2. Install dependencies
npm install

# 3. Configure Firebase credentials
cp .env.example .env
# Edit .env with your Firebase project config

# 4. Run the dev server
npm run dev
```

---

## 🏗️ Architecture

```
src/
├── components/          # UI components
│   ├── RadioView.tsx    # Main radio panel with PTT
│   ├── LcdScreen.tsx    # OLCD telemetry display
│   ├── TuningKnob.tsx   # Frequency tuning knob
│   ├── SquadView.tsx    # Squad/Friends list
│   ├── BottomNav.tsx    # Navigation tabs
│   └── modals/          # All modal dialogs
├── services/
│   ├── audioEngine.ts    # Web Audio DSP chain (EQ, VOX, visualizer)
│   ├── peerManager.ts    # WebRTC P2P connections (PeerJS)
│   ├── firebaseSignaling.ts # Room state, presence, chat (Firebase RTDB)
│   ├── notificationService.ts # Push notification API
│   └── storageService.ts # localStorage persistence
├── hooks/
│   ├── useApp.ts        # Main orchestrator hook (joins all services to React state)
│   ├── useFirebase.ts   # Firebase-specific hook
│   └── usePeer.ts       # PeerJS-specific hook
├── context/
│   └── AppContext.tsx   # Global React Context provider
└── types.ts             # Shared TypeScript interfaces
```

---

## 📋 Technologies
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 6 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| P2P Audio | WebRTC via PeerJS |
| Signaling / DB | Firebase Realtime Database v12 |
| PWA | Custom Service Worker + Web App Manifest |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts (Orbitron, Share Tech Mono) |

---

## ⚠️ Known Limitations & Future Work
- **iOS Safari Background:** Push notifications do not wake the device when the app is fully closed on iOS (browser limitation). A native wrapper (Capacitor/Cordova) would be required for full OS-level notifications on iOS.
- **Offline-First LAN:** True offline LAN support requires a local STUN/TURN relay and Firebase emulator.
- **Admin Portal Auth:** The admin portal currently relies on a secret key — consider moving to Firebase Auth for production.
