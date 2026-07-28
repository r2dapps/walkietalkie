/**
 * PWAManager - Progressive Web App installer, Service Worker manager, & Network Monitor.
 */
class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
  }

  init() {
    this.registerServiceWorker();
    this.checkStandaloneMode();
    this.setupInstallPrompt();
    this.setupNetworkListeners();
  }

  // Register Service Worker for offline capability & auto-updates
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('SW Registered:', reg.scope);

            // Listen for service worker updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    if (window.uiController && window.uiController.showToast) {
                      window.uiController.showToast('🚀 New AetherTalk update ready! Tap "Force Update" in Settings.', 'info', 8000);
                    }
                  }
                });
              }
            });
          })
          .catch(err => console.warn('SW Register Error:', err));
      });
    }
  }

  // Force Update / Hard Refresh App for Mobile
  async forceUpdateApp() {
    if (window.uiController && window.uiController.showToast) {
      window.uiController.showToast('Checking for updates & clearing cache...', 'info', 2000);
    }

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Cache clearing notice:', e);
    }

    // Force reload with cache buster timestamp
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
      window.location.href = cleanUrl;
    }, 500);
  }

  // Check if running as Installed PWA / Standalone mode
  checkStandaloneMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone ||
                         document.referrer.includes('android-app://');
    this.isInstalled = isStandalone;

    if (isStandalone) {
      document.body.classList.add('pwa-standalone');
      console.log('App running in standalone PWA mode');
    }
  }

  // Capture beforeinstallprompt
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('pwaInstallBtn');
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.innerText = '📲 Install AetherTalk App';
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
      const installBtn = document.getElementById('pwaInstallBtn');
      if (installBtn) installBtn.innerText = '✓ App Installed';
    });
  }

  // Trigger PWA Install Modal
  async promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('Install prompt outcome:', outcome);
      this.deferredPrompt = null;
    } else {
      alert('AetherTalk is already installed or your browser installs PWAs via the menu options (Add to Home Screen).');
    }
  }

  // Online / Offline state monitor
  setupNetworkListeners() {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      const badge = document.getElementById('networkBanner');
      if (badge) {
        if (isOnline) {
          badge.classList.add('hidden');
        } else {
          badge.classList.remove('hidden');
          badge.innerHTML = `<i class="fa-solid fa-wifi"></i> Offline Mode - Waiting for peers...`;
        }
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }
}

window.pwaManager = new PWAManager();
