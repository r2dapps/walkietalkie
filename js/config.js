/**
 * AetherTalk Application Configuration (Dynamic & Secure)
 * Loads Firebase config dynamically from localStorage or runtime environment.
 */
window.AETHERTALK_CONFIG = window.AETHERTALK_CONFIG || {};

(function() {
  const storedConfig = localStorage.getItem('aethertalk_firebase_config');
  let parsed = null;
  if (storedConfig) {
    try { parsed = JSON.parse(storedConfig); } catch(e) {}
  }

  window.AETHERTALK_CONFIG.firebase = parsed || {
    apiKey: (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_API_KEY) || window.AETHERTALK_CUSTOM_KEY || "",
    authDomain: "walkietalkie-c0f03.firebaseapp.com",
    databaseURL: "https://walkietalkie-c0f03-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "walkietalkie-c0f03",
    storageBucket: "walkietalkie-c0f03.firebasestorage.app",
    messagingSenderId: "930318008093",
    appId: "1:930318008093:web:06597d7007ebd089a3ebf4",
    measurementId: "G-LYPVXMGNTR"
  };
})();
