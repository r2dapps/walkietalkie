# AetherTalk React — Wiring TODO Guide
> Append completed items with [x]. Use this doc to continue wiring in new sessions with minimal token usage.
> Each section = one focused conversation session.

---

## SETUP CHECKLIST (one-time)

- [x] React app moved to repo root (`src/`, `vite.config.ts`, `package.json` etc. all at root)
- [x] Old vanilla JS archived to `legacy-vanilla-js` branch
- [x] `.env` created locally with Firebase keys (NOT committed)
- [x] `.gitignore` updated — blocks `.env`, `node_modules`, `dist`
- [x] GitHub Actions `deploy.yml` created — auto-builds on push to `main`
- [ ] **GitHub Secrets** — Go to: Repo → Settings → Secrets → Actions → add these 8 secrets:
  ```
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_DATABASE_URL
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_STORAGE_BUCKET
  VITE_FIREBASE_MESSAGING_SENDER_ID
  VITE_FIREBASE_APP_ID
  VITE_FIREBASE_MEASUREMENT_ID
  ```
- [ ] **GitHub Pages source** — Go to: Repo → Settings → Pages → Source = "GitHub Actions"
- [x] `vite.config.ts` base path set to `/walkietalkie/` for GitHub Pages

---

## SESSION 2 — Fix Console Errors & TypeScript Issues
File to work on: `src/components/modals/ShareModal.tsx`

- [x] Fix `share-modal.js TypeError: Cannot read properties of null (reading 'addEventListener')` — (False positive: caused by a user Chrome Extension `chext_driver.js`, not our code)
- [x] Fix `DiagnosticsModal.tsx` — HMR warnings verified as non-breaking (Vite strictness on `setInterval`)
- [x] Fix `SuperAdminPortal.tsx` — verified as non-breaking
- [x] Fix `FrequencyScanner.tsx` and `TuningKnob.tsx` — verified as non-breaking

---

## SESSION 3 — Wire Real Firebase Ban Enforcement
File: `src/services/firebaseSignaling.ts` (lines 53–106)

Current state: `joinRoom()` sets presence BUT does not yet write `ip_address` to Firebase peer record.

- [x] After `api.ipify.org` fetch resolves, update presence record: `set(myPresenceRef, { ...presenceData, ip_address: data.ip })`
- [x] Ensure `onDisconnect` is set BEFORE `set()` to avoid ghost presence on browser crash
- [ ] Test: join a channel → check Firebase Console `rooms/alpha1/peers/{peerId}` for `ip_address` field
- [ ] Test ban: In Firebase Console, set `banned_operators/{callsign}` = `true` → should instantly kick the user

---

## SESSION 4 — Wire Audio Engine to Peer Streams
File: `src/services/peerManager.ts` (lines 80–320)

- [x] Confirm `audioElements[peerId]` are created with `id="audio-{peerId}"` so `muteAllRemoteAudio()` querySelector works
- [x] Test: join 2 tabs → speak → confirm green RX indicator lights up on the other tab
- [x] Test VOX: Settings → enable VOX → speak near mic → PTT should auto-activate
- [x] Test Roger Beep: release PTT → should hear beep tone
- [x] Test Squelch Tail: verify static burst on release

---

## SESSION 5 — Wire Settings Modal Fully
File: `src/components/modals/SettingsModal.tsx`

- [x] Theme selector — test all 7 themes switch body `data-theme` correctly
- [x] EQ Preset — confirm `audioEngine.applyEqPreset()` is called on change
- [x] Avatar selector — 12 avatar grid, saves to localStorage profile
- [x] PIN change — current PIN + new PIN (4 digits), calls `storage.savePin()`
- [x] Push notifications — calls `notificationService.requestPermission()`
- [x] Audio device selectors — mic input + speaker output (calls `audioEngine.enumerateAudioDevices()`)
- [x] Custom presets CRUD — add/edit/delete channel presets in localStorage

---

## SESSION 6 — Wire Squad / Friends Tab
File: `src/components/SquadView.tsx` + `src/hooks/useApp.ts`

Current state: `SquadView.tsx` is a stub (136 bytes).

- [ ] Render friends list from `storage.getFriends()`
- [ ] "Add Friend" input — calls `storage.saveFriends()`, saves `{ callsign, peerId: '', addedAt: Date.now() }`
- [ ] "Ping" button — calls `firebaseSignaling.sendInvitePing(targetCallsign, currentRoom, myCallsign)`
- [ ] "Remove" button — removes from friends map in localStorage
- [ ] When a ping arrives (`firebaseSignaling.listenForInvitePings`) → show browser notification + toast

---

## SESSION 7 — Wire PTT Lock Indicator on LcdScreen
File: `src/components/LcdScreen.tsx` (line 57+)

- [ ] Subscribe to `firebaseSignaling.listenForPttLock()` in `useApp.ts` — set state `pttLockHolder: string | null`
- [ ] Pass `pttLockHolder` through context to `LcdScreen`
- [ ] Show `🔒 CH LOCKED — {callsign}` badge when `pttLockHolder !== null && pttLockHolder !== myCallsign`

---

## SESSION 8 — SuperAdmin Portal (Wire to React Router or Separate Route)
File: `src/components/admin/SuperAdminPortal.tsx`

- [ ] Add `?admin=1` URL param check in `App.tsx` to conditionally render `SuperAdminPortal` full-screen
- [ ] SuperAdmin login: hardcoded check for `admin` / `1234` / `family2026` → sets `adminAuthed` state
- [ ] Connected operators table — subscribe to `firebaseSignaling.listenForPeers()` for ALL rooms
- [ ] Ban user: `firebaseSignaling.banOperator(callsign)` → writes `banned_operators/{safeCallsign} = true`
- [ ] Ban IP: `firebaseSignaling.banOperator(ip)` → writes `banned_operators/{safeIp}` (dots → underscores)
- [ ] Unban: `remove(ref(db, 'banned_operators/{safeKey}'))`

---

## SESSION 9 — PWA & Service Worker
File: `public/sw.js` + `public/manifest.json`

- [ ] Confirm `manifest.json` is in `public/` (it is — check `start_url: "/walkietalkie/"` for Pages base)
- [ ] Update `sw.js` cache name to `aethertalk-v2.0.0` (React rewrite milestone)
- [ ] Test PWA install prompt: open on mobile → Chrome "Add to Home Screen" banner should appear
- [ ] Test offline: install PWA → disconnect wifi → app should load from cache

---

## SESSION 10 — Capacitor APK (Future)
Reference: `FINAL_PRODUCT_NATIVE_SPEC.md`

- [ ] Run: `npm install @capacitor/core @capacitor/cli @capacitor/android`
- [ ] Run: `npx cap init AetherTalk com.r2dapps.aethertalk --web-dir dist`
- [ ] Update `vite.config.ts`: change `base: '/'` (custom domain or APK — no /walkietalkie/ prefix)
- [ ] Run: `npm run build && npx cap sync android`
- [ ] Open Android Studio: `npx cap open android`
- [ ] Add permissions to `AndroidManifest.xml` (see FINAL_PRODUCT_NATIVE_SPEC.md)
- [ ] Test on device via USB debugging

---

## KNOWN BUGS TO FIX (already identified)

| Bug | File | Status |
|:----|:-----|:-------|
| `share-modal.js` null addEventListener | `ShareModal.tsx` | [ ] |
| `msg.id` optional dedup check | `useApp.ts` line 108 | [x] Fixed |
| `DiagnosticsModal` full page reload | `DiagnosticsModal.tsx` | [ ] |
| `audioPrefs.pttMode` default not applying on first load | `storageService.ts` | [ ] |

---

## QUICK REFERENCE

### Start dev server
```bash
cd e:\Github\walkietalkie
npm run dev
# Opens at http://localhost:3000
```

### Build for production
```bash
npm run build
# Output in dist/ — GitHub Actions does this automatically on push to main
```

### Test production build locally
```bash
npm run preview
# Opens at http://localhost:4173/walkietalkie/
```

### Key files map
| What | Where |
|:-----|:-------|
| Main app state | `src/hooks/useApp.ts` |
| Firebase signaling | `src/services/firebaseSignaling.ts` |
| Audio DSP + PTT | `src/services/audioEngine.ts` |
| P2P WebRTC mesh | `src/services/peerManager.ts` |
| All types | `src/types.ts` |
| Theme CSS vars | `src/index.css` |
| Entry HTML (PeerJS CDN) | `index.html` |
| GitHub Actions deploy | `.github/workflows/deploy.yml` |
| Environment template | `.env.example` |
