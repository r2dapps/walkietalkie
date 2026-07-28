# 📻 AetherTalk — Tactical P2P Walkie Talkie PWA

[![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Voice%20%26%20Data-rose)](https://webrtc.org/)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Capable-emerald)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Signaling-amber)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**AetherTalk** is a high-performance, serverless, peer-to-peer (P2P) tactical walkie-talkie Progressive Web Application (PWA). Built with Vanilla JavaScript, WebRTC, Web Audio API, and Firebase Realtime Database, it enables encrypted voice audio streaming and instant text communications across mobile phones and desktop devices anywhere in the world.

---

## 🔥 Key Features & Family UX

- 🔗 **1-Click Channel URLs**: Share links with embedded room names & passcodes (e.g. `https://r2dapps.github.io/walkietalkie/#room=family&key=7788`) for 1-tap instant joining.
- 🎙️ **Half-Duplex Auto-Muting (Zero Echo)**: Incoming speakers are automatically muted while holding Push-To-Talk to eliminate microphone feedback loops.
- 🔒 **Atomic Firebase PTT Channel Lock**: Prevents "double talk" race conditions by locking channel access during active transmissions.
- 🎧 **Bluetooth Audio Hardware Routing**: Auto-detects Bluetooth headset connections with microphone & speaker output selectors via `HTMLAudioElement.setSinkId()`.
- 💬 **Dual-Engine Tactical Chat**: Zero-latency chat delivered simultaneously over WebRTC P2P DataChannels and Firebase RTDB sync.
- 🔴 **Unread Chat Badge**: Glowing red dot indicators appear on Channel Log buttons when unread messages arrive.
- 🎨 **Sunofy-Style Color Themes**: Switch between *Tactical Dark*, *Cyber Neon*, *Desert Camo*, and *Stealth Black* themes.
- 👤 **Avatar Mesh Sync**: Syncs 12 tactical avatar icons across connected operator rosters and channel chat messages.
- 📋 **Nickname-Only Clipboard Copying**: 1-tap **Copy Name** button copies clean operator nicknames for squad lists.
- 📡 **Native Phone Screen Notifications**: Mobile OS notifications pop up natively with sound & vibration on phone screens when radio calls arrive.

---

## 🏗️ Architecture & How It Works

```
[ Operator A ] <================ DTLS-SRTP P2P WebRTC MediaStream ================> [ Operator B ]
 (Mic Stream)                               (Encrypted Audio & Text)                          (Speakers)
      |                                                                                           |
      +-----> [ Firebase Realtime DB ] <--- Presence, PTT Lock & Chat Sync --->-------------+
```

1. **Signaling & Room Discovery**: Firebase Realtime Database handles zero-latency room discovery, presence announcements, and atomic PTT channel locks.
2. **Channel Security**: Setting an optional channel key hashes the room namespace so unauthorized users cannot discover or join private streams.
3. **P2P WebRTC Audio**: Voice audio travels directly between devices using DTLS-SRTP encryption via PeerJS.
4. **NAT Traversal**: Built-in STUN & TURN relay fallback ensures connectivity across cellular 4G/5G, home routers, and public Wi-Fi networks worldwide.

---

## 📲 Closed-App Web Push Setup (Firebase Cloud Function)

AetherTalk includes a production-ready Firebase Cloud Function (`functions/index.js`) to trigger native Web Push notifications on Google FCM / Apple APNs gateways when a recipient's browser app is 100% closed:

### Deploying the Cloud Function (Free Tier)
```bash
# 1. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 2. Login to your Firebase account
firebase login

# 3. Deploy the Cloud Function to your Firebase project
cd functions
npm install
firebase deploy --only functions
```

When a user pings a squad member, the Cloud Function listens to `/invites/{targetCallsign}` in Realtime Database, looks up `/pushTokens/{targetCallsign}`, and sends a Web Push payload to wake up their phone screen natively.

---

## 🚀 Quick Start & Usage

### 1. Join a Channel
1. Open [AetherTalk PWA](https://r2dapps.github.io/walkietalkie/).
2. Type a channel name (e.g., `alpha-1`) or select a saved **Preset**.
3. *(Optional)* Set a **Channel Security Key** for a private channel.
4. Click **Establish Frequency**.

### 2. Push-To-Talk (PTT)
- **Mobile**: Tap and hold the big red **PUSH TO TALK** button.
- **Desktop**: Press and hold the **Spacebar** key to speak.
- Release to send a **Roger Beep** chime!

### 3. Add Friends & Send Invite Pings
1. Tap the **Squad 👥** tab in the bottom bar.
2. Enter your friend's callsign (e.g., `Dad`) and click **Add Friend**.
3. Tap **Ping & Call** anytime to send an instant notification chime to their phone!

---

## 📄 License

MIT License — free for personal and commercial use.
