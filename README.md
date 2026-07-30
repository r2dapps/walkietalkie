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
| **OLCD Display** | Military-style LCD shows: Channel frequency name, dynamic PL (Private Line / CTCSS) tone derived from the frequency, TX/RX/STANDBY state, Active speaker callsign, VHF band indicator, EQ preset name, VOX indicator, TOT countdown. |
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
| **Application PIN Lock** | Set a 4-digit PIN to lock the entire app. Requires PIN entry to unlock (default `0000`). |
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

---

## 🏷️ Version History & Tags

We use Git tags to mark stable releases and major architecture shifts.

| Tag | Description |
|---|---|
| `v1.0.0` | Initial stable release. Features global rooms, P2P audio, themes, and basic config. Saved before migrating to the Multi-Channel Squad architecture. |
| `v1.1.0` | Tactical Radio UI Polish update. Added FM Radio filters (Language & Genre), custom background blending for light themes, and Notification-click routing to Chat. |

---

## 📖 Complete Beginner's Guide: How to Create a FREE Firebase Database (Pin-to-Pin)

If you have **never used Firebase before**, follow these exact step-by-step instructions. It takes less than 2 minutes, is 100% free forever, and requires no credit card!

### Step 1: Open Firebase Console
1. Open your web browser and go to [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. Log in with any standard Google (Gmail) account.

### Step 2: Create a New Project
1. Click the big **"+ Add project"** button (or "Create a project").
2. Type a name for your project (e.g., `walkietalkie-app`).
3. Click **Continue**.
4. Disable **Google Analytics** (toggle switch off) to keep it simple, then click **Create project**.
5. Wait 10 seconds for Google to set up your project, then click **Continue**.

### Step 3: Create a Realtime Database Instance
1. In the left-hand sidebar, click **Build** -> then select **Realtime Database**.
2. Click the blue **"Create Database"** button in the center of the page.
3. **Database Location**: Choose `Asia South (Mumbai)` or `United States` (closest to you), then click **Next**.
4. **Security Rules**: Select **Start in test mode**, then click **Enable**.

### Step 4: Copy Your Realtime Database Credentials
1. You will now see your database dashboard.
2. At the top of the page, copy the URL string that looks like this:
   `https://your-project-name-default-rtdb.asia-southeast1.firebasedatabase.app` (or ending in `.firebaseio.com`).
3. Put this URL in your `.env` file under `VITE_FIREBASE_DATABASE_URL`!

### Step 5: Make Database Rules Permanent (So It Never Expires)
1. Click on the **Rules** tab at the top of your Realtime Database dashboard.
2. Replace the text in the code editor with this exact JSON block:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
3. Click **Publish** at the top right. 
4. Done! Your AetherTalk tactical channels are now active 24/7/365 with zero cost!


