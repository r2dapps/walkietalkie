# 📻 AetherTalk — Tactical P2P Walkie Talkie PWA

[![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Voice%20%26%20Data-rose)](https://webrtc.org/)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Capable-emerald)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Signaling-amber)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**AetherTalk** is a high-performance, serverless, peer-to-peer (P2P) tactical walkie-talkie Progressive Web Application (PWA). Built with Vanilla JavaScript, WebRTC, Web Audio API, and Firebase Realtime Database, it enables encrypted voice audio streaming and instant text communications across mobile phones and desktop devices anywhere in the world.

---

## 🔥 Key Features

- 🎙️ **Hardware DSP Audio Chain**: High-pass filter (300Hz), Low-pass telephony filter (3200Hz), radio distortion presets, and audio dynamics compressor for authentic military radio sound.
- 👥 **Tactical Squad Roster (Dedicated Friends Tab)**: Save friends and family members (e.g. "Dad", "Mom", "Ops1") in your dedicated **Squad** tab for 1-tap pings and direct calls.
- 🔐 **Channel Security Keys (Private Channels)**: Optional passcode protection for frequencies. Only peers with the matching channel key can connect and listen to voice streams.
- 🔒 **Security PIN Lock**: Built-in 4-digit PIN keypad screen (`0000` default) to lock your radio screen on demand or startup.
- 📡 **Instant Invite Pings & Web Push**: Ping any squad member to send real-time audio chimes (`Quindar` space tones) and Web Push notifications to bring them to your channel.
- 📱 **Mobile-First PWA & Bottom Navigation Bar**: Full-screen mobile design with bottom navigation tabs, slide-out hamburger drawer, and offline installation support.
- 🚫 **Operator Blocking**: Block any peer to instantly mute their voice audio and suppress text chat messages.
- 💬 **P2P Text Chat & NATO Assistant**: Zero-latency text messaging over WebRTC DataChannels with a 1-tap NATO Phonetic Alphabet keyboard (Alpha, Bravo, Wilco, SOS).

---

## 🏗️ Architecture & How It Works

```
[ Operator A ] <================ DTLS-SRTP P2P WebRTC MediaStream ================> [ Operator B ]
 (Mic Stream)                               (Encrypted Audio & Text)                          (Speakers)
      |                                                                                           |
      +-----> [ Firebase Realtime DB ] <--- Presence & Channel Security Key Discovery --->----+
```

1. **Signaling & Room Discovery**: Firebase Realtime Database handles zero-latency room discovery and presence announcements.
2. **Channel Security**: Setting an optional channel key hashes the room namespace so unauthorized users cannot discover or join private streams.
3. **P2P WebRTC Audio**: Voice audio travels directly between devices using DTLS-SRTP encryption via PeerJS.
4. **NAT Traversal**: Built-in STUN & TURN relay fallback ensures connectivity across cellular 4G/5G, strict home routers, and public Wi-Fi networks worldwide.

---

## 🚀 Quick Start & Usage

### 1. Join a Channel
1. Open [AetherTalk PWA](https://r2dapps.github.io/walkietalkie/).
2. Type a channel name (e.g., `alpha-1`) or select a quick preset.
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

## ⚙️ Security & Privacy

- **Zero Server Storage**: Voice streams and text messages are never saved on any server.
- **End-to-End Encryption**: WebRTC audio and DataChannels are encrypted by default using standard DTLS-SRTP.
- **PIN Lock (`0000`)**: Protect your app screen locally with a customizable 4-digit PIN.

---

## 📄 License

MIT License — free for personal and commercial use.
