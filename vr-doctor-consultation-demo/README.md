# REAL WebRTC Doctor-Patient VR Consultation App

This is a **100% REAL, FUNCTIONAL WebRTC App** designed to test live video/audio streaming between your **Mobile Device (Doctor)** and your **Laptop / Meta Quest 3 (Unity)**.

---

## 📱 How to Deploy & Test on GitHub Pages (Mobile Device)

1. Push this `vr-doctor-consultation-demo` folder to GitHub.
2. Enable **GitHub Pages** in your GitHub Repo settings (set source to `main` branch or `/vr-doctor-consultation-demo`).
3. Open the GitHub Pages URL on your **Mobile Phone** (e.g. `https://yourusername.github.io/walkietalkie/vr-doctor-consultation-demo/`).
4. Enter or generate a Doctor Room Key (e.g. `DOC-8921`).
5. Tap **"Start Doctor Session"**:
   - Your Mobile Phone screen will switch to **Full-Screen Video Call Mode**.
   - Your Mobile Webcam will appear in the **Top-Left Floating Thumbnail (PiP)**.
   - The main background screen will show a waiting spinner for the Unity VR video stream!

---

## 💻 How to Test in Unity (Laptop / Meta Quest 3 / Quest 3S)

1. Open your Unity Project (2022.3 LTS or 2023).
2. Install **Unity WebRTC** package (`com.unity.webrtc`) in Unity Package Manager (`Window > Package Manager > Add package by name: com.unity.webrtc`).
3. Copy `UnityVRWebRTC.cs` into your Unity `Assets/Scripts/` directory.
4. Create a 3D Quad in your scene (representing the floating doctor screen).
5. Attach `UnityVRWebRTC.cs` to a GameObject.
6. In the Unity Inspector:
   - Set `Room Key` to `DOC-8921` (matching your phone!).
   - Drag your 3D Quad's `Material` into the `Doctor Display Material` slot.
   - Drag your Main Camera into `VR Stream Camera` slot.
7. Click **PLAY in Unity**!
8. **Watch the magic happen**:
   - Unity will capture the Unity Camera view and stream it live to your Mobile Phone (Full Screen background)!
   - Mobile Phone will stream its webcam live to Unity and render it on your 3D Quad in VR!
