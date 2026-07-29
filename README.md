# AetherTalk Walkie Talkie

AetherTalk is a high-fidelity real-time P2P push-to-talk walkie-talkie web application. Built for secure, instant voice communications using modern web technologies.

## Features
- **P2P Audio Communication**: Ultra-low latency voice chat powered by WebRTC (PeerJS).
- **Tactical UI/UX**: Military-grade LCD telemetry, responsive push-to-talk buttons, and real-time audio visualizers.
- **Voice Activation (VOX)**: Hands-free automatic transmission detection.
- **Firebase Signaling**: Real-time room discovery, PTT state locking, and robust fallback chat.
- **Customization**: Multiple visual themes, audio EQ filters, squelch tail simulation, and Roger Beeps.
- **PWA Ready**: Installable directly to your home screen as a standalone application.

## Technologies
- **React 19**
- **Vite 6**
- **Tailwind CSS 4**
- **TypeScript 5**
- **PeerJS** (WebRTC)
- **Firebase RTDB v12**

## Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure your `.env` file based on `.env.example` with your Firebase credentials.
4. Run the development server: `npm run dev`

## Architecture Overview
The application follows a strictly modular architecture separating UI components from core business logic:
- `src/services/audioEngine.ts`: Manages the Web Audio API DSP chain.
- `src/services/peerManager.ts`: Handles P2P WebRTC data and media connections.
- `src/services/firebaseSignaling.ts`: Coordinates room state and active connections.
- `src/hooks/useApp.ts`: The main React orchestrator linking services to UI state.
