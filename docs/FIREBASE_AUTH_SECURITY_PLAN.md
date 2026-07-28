# 🔐 Firebase Email Authentication & Security Blueprint

This document outlines the step-by-step technical plan to upgrade **AetherTalk** with **Firebase Authentication** so only whitelisted email addresses (e.g. specific family members or team operators) can log in, access channel frequencies, and transmit audio.

---

## 🎯 Security Objective

- **Zero Unauthorized Access**: Only approved email accounts (e.g. `dad@gmail.com`, `ops1@company.com`) can authenticate.
- **Firebase Database Protection**: Firebase Realtime Database rules enforce that unauthenticated or non-whitelisted users cannot read room presence or signal WebRTC connections.
- **Encrypted Peer Connections**: PeerJS connection discovery requires a valid Firebase Auth ID Token.

---

## 📋 Step 1: Enable Firebase Authentication

1. Go to the [Firebase Console](https://console.firebase.google.com/project/walkietalkie-c0f03).
2. In the left navigation sidebar, click **Build** ➔ **Authentication**.
3. Click **Get Started**.
4. Under **Sign-in method**, enable **Google** (or **Email/Password**).
5. Add your domain (`r2dapps.github.io`) to **Authorized domains**.

---

## 🛡️ Step 2: Enforce Realtime Database Security Rules (Email Whitelist)

Go to **Realtime Database** ➔ **Rules** tab in Firebase Console and paste the following security rules:

```json
{
  "rules": {
    "rooms": {
      "$room_id": {
        ".read": "auth != null && (
          auth.token.email == 'your_dad_email@gmail.com' ||
          auth.token.email == 'your_email@gmail.com' ||
          auth.token.email.matches('.*@yourfamilydomain\\.com')
        )",
        ".write": "auth != null && (
          auth.token.email == 'your_dad_email@gmail.com' ||
          auth.token.email == 'your_email@gmail.com' ||
          auth.token.email.matches('.*@yourfamilydomain\\.com')
        )"
      }
    },
    "invites": {
      "$target_callsign": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 💻 Step 3: Frontend Integration (`js/firebase-auth.js`)

When ready to enable login, create `js/firebase-auth.js` and include it in `index.html`:

```javascript
/**
 * FirebaseAuth - Email Whitelist Authentication Manager for AetherTalk.
 */
class FirebaseAuth {
  constructor() {
    this.allowedEmails = [
      'your_email@gmail.com',
      'your_dad_email@gmail.com'
    ];
    this.currentUser = null;
  }

  init() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        if (this.isEmailAllowed(user.email)) {
          this.currentUser = user;
          console.log('[FirebaseAuth] Authenticated user:', user.email);
          if (window.uiController && window.uiController.showToast) {
            window.uiController.showToast(`Authenticated as ${user.email}`, 'success');
          }
        } else {
          console.warn('[FirebaseAuth] Unauthorized email attempted login:', user.email);
          alert(`Access Denied: ${user.email} is not on the approved operator list.`);
          firebase.auth().signOut();
        }
      } else {
        this.currentUser = null;
      }
    });
  }

  // Check if email matches whitelist or domain
  isEmailAllowed(email) {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    return this.allowedEmails.includes(cleanEmail);
  }

  // Google One-Tap / Popup Login
  async loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      return result.user;
    } catch (error) {
      console.error('[FirebaseAuth] Login error:', error);
      throw error;
    }
  }

  logout() {
    return firebase.auth().signOut();
  }
}

window.firebaseAuth = new FirebaseAuth();
```

---

## 🚀 Step 4: UI Login Button & Modal Integration

In `index.html`, add a Google Sign-In button overlay:

```html
<button onclick="window.firebaseAuth.loginWithGoogle()" class="w-full py-3 bg-white text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2">
  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5">
  Sign in with Google (Authorized Operators Only)
</button>
```

---

## 🔒 Result

Once activated:
1. Anyone opening `https://r2dapps.github.io/walkietalkie/` will be prompted to log in.
2. If their email is not on your whitelist (`allowedEmails`), Firebase Database blocks read/write access.
3. Your family's walkie-talkie voice & text communications will remain **100% private and confidential**.
