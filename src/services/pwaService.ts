import { showToast } from '../components/ui/ToastManager';

class PWAService {
  public deferredPrompt: any = null;
  public isInstalled: boolean = false;

  public init() {
    this.checkStandaloneMode();
    this.setupInstallPrompt();
    this.setupUpdateListener();
  }

  private checkStandaloneMode() {
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');
    
    if (this.isInstalled) {
      document.body.classList.add('pwa-standalone');
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      // We could trigger a global event here if we wanted the UI to react instantly
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
      showToast('App installed successfully!', 'success');
    });
  }

  private setupUpdateListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('🚀 New update ready! Tap "Force Update" in Settings.', 'info');
              }
            });
          }
        });
      });
    }
  }

  public async promptInstall(): Promise<boolean> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return outcome === 'accepted';
    }
    return false;
  }

  public async forceUpdateApp() {
    showToast('Checking for updates & clearing cache...', 'info');
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

    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
      window.location.href = cleanUrl;
    }, 500);
  }
}

export const pwaService = new PWAService();
