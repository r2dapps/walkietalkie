# AetherTalk Bug Report & Issues Audit
**Date:** July 29, 2026  
**Status:** Documentation Updated - Flashlight Issue Clarified

---

## 🔴 CRITICAL ISSUES

### 1. **Flashlight Button Uses UI Overlay Instead of Device Torch** ⚠️ 
**File:** [src/components/RadioView.tsx](src/components/RadioView.tsx#L26-L35)  
**Severity:** CRITICAL  
**Issue:**  
- Flashlight button currently shows a white UI overlay (fake light)
- Should activate the device's actual camera flashlight/torch light
- When used, incorrectly requests **camera permissions** (confusing UX)
- The UI overlay is just a screen brightness increase, not actual flashlight

**Current Implementation:**
- Just renders a white div with `animate-pulse` CSS class
- Misleads user into thinking actual flashlight is enabled
- Camera permission prompt appears because user expects real torch functionality

**Expected Behavior:**
- Button should use **Mobile Torch API** (MediaStreamTrack.getCapabilities().torch)
- Activates device's rear camera flash/LED as actual light source
- Proper permission handling for torch capability
- Visual feedback showing torch is ON/OFF

**Why Camera Permissions Are Needed:**
- Device flashlight/torch is controlled through the camera API on most mobile devices
- `MediaStreamTrack` API requires camera access to control torch brightness
- This is the standard mobile web approach, not a bug

**Suggested Fix:**
- Implement proper Torch API instead of just UI overlay:
  ```javascript
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: 'environment' } 
  });
  const track = stream.getVideoTracks()[0];
  const capabilities = track.getCapabilities();
  
  if (capabilities.torch) {
    track.getSettings().torch 
      ? await track.applyConstraints({ advanced: [{ torch: false }] })
      : await track.applyConstraints({ advanced: [{ torch: true }] });
  }
  ```
- Add proper error handling if torch is unavailable
- Show platform-specific message if device doesn't support it

---

## 🟠 HIGH PRIORITY ISSUES

### 2. **Firebase IP Ban Check - Missing Error Handling & Network Failure**
**File:** [src/services/firebaseSignaling.ts](src/services/firebaseSignaling.ts#L85-L95)  
**Severity:** MEDIUM-HIGH  
**Issue:**
- The call to `fetch('https://api.ipify.org?format=json')` has no error handling
- If the API is unavailable, blocked, or slow, it fails silently
- Could cause unexpected behavior if IP ban check fails mid-connection

**Current Code:**
```typescript
fetch('https://api.ipify.org?format=json')
  .then(res => res.json())
  .then(data => {
    if (data.ip && this.db) {
      const safeIp = sanitizeKey(data.ip);
      const ipBanRef = ref(this.db, `banned_operators/${safeIp}`);
```

**Issue:** No `.catch()` handler for network failures

**Suggested Fix:**
- Add proper `.catch()` handler with fallback
- Add timeout mechanism (API call shouldn't block user)
- Log network errors for debugging

---

### 3. **Notification Service - BASE_URL Dependency Issues**
**File:** [src/services/notificationService.ts](src/services/notificationService.ts#L10-L25)  
**Severity:** MEDIUM-HIGH  
**Issue:**
- Uses `import.meta.env.BASE_URL` in two places for icon path
- If BASE_URL is not properly set or changes, notifications will fail to load icon
- No fallback if the path is incorrect

**Current Code:**
```typescript
icon: import.meta.env.BASE_URL + 'icon.svg',
```

**Risk:** Users won't see notification icons; notifications may fail on different deployments

---

### 4. **LocalStorage Error Handling - Silent Failures**
**File:** [src/services/storageService.ts](src/services/storageService.ts#L1-L20)  
**Severity:** MEDIUM  
**Issue:**
- Generic `try-catch` blocks catch errors but don't alert user
- If localStorage is full or disabled, settings won't persist silently
- No user feedback that storage operations failed

**Current Code:**
```typescript
function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);  // Only logs to console
  }
}
```

**Risk:** User settings/presets disappear without warning; app state lost on refresh

---

## 🟡 MEDIUM PRIORITY ISSUES

### 5. **Audio Visualizer - Event Listener Not Cleaned Up Properly**
**File:** [src/components/AudioVisualizer.tsx](src/components/AudioVisualizer.tsx#L16-L25)  
**Severity:** MEDIUM  
**Issue:**
- `resize` event listener is added but cleanup only happens on unmount
- If component re-mounts frequently, multiple listeners could accumulate
- Could cause memory leaks with many resize events firing

**Current Code:**
```typescript
useEffect(() => {
  // ...
  window.addEventListener('resize', resize);
  resize();
  // Missing cleanup in dependency array
  // return () => { ... } should also remove listener
}, []);
```

**Fix Needed:** Add return cleanup function to remove listener

---

### 6. **VOX Monitoring - Race Condition Risk**
**File:** [src/hooks/useApp.ts](src/hooks/useApp.ts#L115-L132)  
**Severity:** MEDIUM  
**Issue:**
- VOX monitoring starts/stops based on multiple state conditions
- If `radioState` changes rapidly, could have race conditions between stop/

- `stopVoxMonitoring()` might be called twice, or monitoring might continue when it shouldn't

**Risk:** VOX could trigger unexpectedly or not stop when receiving starts

---

### 7. **Peer Connection Cleanup - Potential Ghost Connections**
**File:** [src/services/peerManager.ts](src/services/peerManager.ts#L1-L50)  
**Severity:** MEDIUM  
**Issue:**
- When leaving a frequency, need to verify ALL peer connections/calls are properly destroyed
- If cleanup is incomplete, could have zombie connections consuming resources
- Could cause audio issues if peer state isn't fully reset

---

### 8. **Firebase Listener Unsubscribe - Ping Listener**
**File:** [src/hooks/useApp.ts](src/hooks/useApp.ts#L50-L66)  
**Severity:** MEDIUM  
**Issue:**
- The `listenForInvitePings` listener returns an unsubscribe function
- Need to verify it's being called on component unmount/cleanup
- Could accumulate listeners if hook is recreated multiple times

---

### 9. **Package.json - Incorrect Project Name**
**File:** [package.json](package.json#L1)  
**Severity:** LOW  
**Issue:**
- Project name is `"react-example"` instead of `"aethertalk"` or `"walkietalkie"`
- Could cause confusion in package registries and deployment

**Current:**
```json
"name": "react-example",
```

**Should be:**
```json
"name": "aethertalk",
```

---

## 📋 AUDIT SUMMARY

| Issue | Severity | Type | Impact |
|-------|----------|------|--------|
| Flashlight uses UI overlay instead of device torch | 🔴 CRITICAL | Feature Bug | Button doesn't control actual flashlight |
| Firebase fetch error handling | 🟠 HIGH | Error Handling | Could block user on connection |
| Notification BASE_URL issues | 🟠 HIGH | Configuration | Icons may fail in production |
| localStorage silent failures | 🟡 MEDIUM | Data Persistence | Settings lost without warning |
| Audio Visualizer memory leak | 🟡 MEDIUM | Performance | Event listener accumulation |
| VOX race condition | 🟡 MEDIUM | Logic Bug | Unexpected VOX behavior |
| Peer cleanup incomplete | 🟡 MEDIUM | Resource Management | Ghost connections possible |
| Firebase listener unsubscribe | 🟡 MEDIUM | Memory Leak | Unused listeners accumulate |
| Package name mismatch | 🟢 LOW | Metadata | Minimal impact |

---

## 🛠️ RECOMMENDATIONS FOR FIXES

1. **PRIORITY 1:** Implement Mobile Torch API for actual device flashlight control
   - Replace UI overlay with real camera torch functionality
   - Handle camera permissions properly with user-friendly messages
   - Include fallback for devices without torch support
2. **PRIORITY 2:** Add error handling to Firebase IP check
3. **PRIORITY 3:** Add .catch() handlers to all fetch() calls
4. **PRIORITY 4:** Add user feedback for storage failures
5. **PRIORITY 5:** Clean up all event listeners properly
6. **PRIORITY 6:** Review peer connection cleanup on frequency leave
7. **PRIORITY 7:** Update package.json metadata

---

**Note:** This audit documented bugs without code changes. Bug #1 (Flashlight) clarified: should use Mobile Torch API instead of UI overlay. Camera permissions are expected/required for real flashlight functionality.
