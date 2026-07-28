# 🔍 AetherTalk Deep Audit, Limitations & Simplification Plan

This document serves as a comprehensive audit of the current AetherTalk architecture, outlining existing limitations, bugs, unnecessary UI elements, and a roadmap for offline capabilities and stability. 

---

## 1. 🐞 Architectural Bugs & WebRTC Limitations

### The "Full Mesh" Scalability Limit
- **The Issue:** AetherTalk currently connects every user directly to every other user in a channel (Full Mesh topology). If 10 people join, one device maintains 9 outgoing and 9 incoming audio streams.
- **The Impact:** Great for 2-5 users. For 10+ users, mobile browsers will throttle, overheat, or crash due to excessive CPU and bandwidth usage. 
- **Future Fix:** Requires transitioning to a centralized audio server (SFU - Selective Forwarding Unit) instead of pure P2P for larger groups.

### Firebase Presence Lag ("Ghost" Operators)
- **The Issue:** We rely on Firebase `onDisconnect()` to remove users when they leave. However, on mobile, if a user hard-closes the app or loses cellular connection, Firebase takes up to 3–5 minutes to realize the connection is dead.
- **The Impact:** Other users see "ghosts" in the channel, and WebRTC wastes resources trying to dial dead connections.
- **Future Fix:** Implement a fast "heartbeat" ping system that drops users locally if they haven't pinged in 15 seconds.

### The "Double Talk" Race Condition
- **The Issue:** Walkie-talkies are half-duplex (one speaker at a time). If two people press Push-To-Talk at the exact same millisecond, both will transmit.
- **The Impact:** Audio overlaps. Without a strict centralized server lock, distributed WebRTC cannot completely prevent this physical race condition.

### Audio DSP vs. Echo Cancellation
- **The Issue:** Custom radio distortions (bandpass, crunch) are applied to the mic *before* sending to WebRTC.
- **The Impact:** This confuses the browser's built-in Acoustic Echo Cancellation (AEC). If operators use loud speakers instead of headphones, severe feedback loops can occur.

---

## 2. 📱 Interactive Mobile Notifications (To Be Fixed)

- **Current State:** The app uses standard browser `new Notification()`. Tapping the notification on a mobile device does nothing because the Service Worker isn't handling the tap event.
- **The Plan:** 
  1. Migrate notifications to the Service Worker (`sw.js` via `showNotification`).
  2. Add a `notificationclick` event listener.
  3. When tapped, the Service Worker will force the mobile OS to focus the AetherTalk app and auto-join the specific channel via URL routing.

---

## 3. 🌐 1-Click Custom Channels (Dad-Friendly URLs)

- **Current State:** To join a private channel, a user has to manually type `#family` and manually type the passcode `7788`.
- **The Plan:**
  - Support passcodes directly in the share URL (e.g., `https://.../#room=family&key=7788`).
  - When Dad clicks the link, the app automatically fills in the room, fills in the key, and clicks "Establish Frequency" instantly without him touching the screen.

---

## 4. 🗑️ UI Simplification (Wiping Unnecessary Elements)

To make the app foolproof for non-technical users, we plan to remove or hide the following:
1. **Favorite Channels Grid:** It's redundant now that we have the **Squad Tab** and 1-click share URLs. 
2. **Hardware Diagnostics Menu:** Too technical and confusing for casual users; remove from the Hamburger drawer.
3. **Tactical Avatar Selection:** It clutters the profile screen and provides minimal value in a mesh network UI.
4. **Quick Presets Pill Bar:** Alpha-1, Bravo-2 buttons are rarely used if family members are using custom secure channels.

---

## 5. 📡 Connection Stability & Smooth Streaming

### Automatic Disconnections
- **Cause:** Mobile browsers aggressively put idle WebSockets and WebRTC connections to sleep to save battery.
- **The Plan:** Implement an invisible "Keep-Alive Ping" over WebRTC DataChannels every 10 seconds to trick the mobile OS into keeping the socket awake.

### Smooth Streaming on Slow Internet
- **Cause:** High-fidelity Opus audio requires stable 4G/Wi-Fi. On 2G/3G, the audio stutters.
- **The Plan:** Lower the default WebRTC Opus bitrate to 16 kbps or 24 kbps. Voice communications don't need music-quality fidelity, and lower bitrates drastically reduce stuttering on slow internet.

---

## 6. 📴 Totally Offline Capabilities (Wi-Fi Hotspot & Bluetooth)

**Can it run totally offline without internet?**
- **Wi-Fi Hotspot (LAN-only):** *Yes, but with caveats.* WebRTC can send audio locally over a Wi-Fi router without internet. *However*, the initial "Handshake" (Signaling) requires internet to connect to Firebase. To fix this, we would need to implement **QR Code Signaling** (scanning a QR code on Dad's phone with your phone to exchange WebRTC SDP tokens without internet).
- **Bluetooth:** *No.* Standard web browsers (Safari, Chrome) do not support sending WebRTC audio directly over Bluetooth. The Web Bluetooth API only supports small sensor data (like heart rate monitors), not high-bandwidth streaming audio. 

**Offline Verdict:** We can support "No-Internet Wi-Fi" strictly via QR code handshakes in the future, but true Bluetooth peer-to-peer audio requires a native iOS/Android app, not a browser PWA.
