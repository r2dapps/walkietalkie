# VR Doctor-Patient Consultation Test Kit

This directory contains a complete, runnable test environment for the **VR Doctor-Patient Consultation System**.

## 📁 Files Included

- `index.html` - The Doctor / Staff Web Dashboard (Pure HTML + Vanilla CSS).
- `style.css` - Sleek dark medical dashboard theme built with Vanilla CSS.
- `app.js` - WebRTC Web Camera streaming & room connection logic.
- `UnityVRWebRTC.cs` - C# Script for Unity (Meta Quest 3 / Quest 3S).

## 🚀 How to Test Immediately

### 1. Testing the Web Portal (Doctor / Staff)
Simply double-click `index.html` or open it in any web browser (Chrome, Edge, Safari, Firefox).
- Click **"Start Doctor Stream"** to enable your webcam & microphone.
- Enter a Room Code (e.g. `CLINIC-101`) and click **"Connect Session"**.
- A simulated VR Headset feed will appear alongside your webcam.

### 2. Testing in Unity (Meta Quest 3 / 3S)
1. Open your Unity VR Project (2022.3 LTS or 2023).
2. Install the **Unity WebRTC Package** (`com.unity.webrtc`) via Unity Package Manager.
3. Copy `UnityVRWebRTC.cs` into your Unity `Assets/Scripts/` folder.
4. Create a 3D Quad or Plane in your scene (representing the floating screen).
5. Attach `UnityVRWebRTC.cs` to a GameObject and drag the Quad's Material into the `Doctor Display Material` slot in the Inspector.
