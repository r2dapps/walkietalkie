export class NotificationService {
  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      return false;
    }
  }

  public async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js');
      } catch (e) {
        console.error('SW registration failed', e);
      }
    }
  }

  public notify(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              icon: import.meta.env.BASE_URL + 'icon.svg',
              ...options
            });
          });
        } else {
          const n = new Notification(title, {
            icon: import.meta.env.BASE_URL + 'icon.svg',
            ...options
          });
          n.onclick = () => {
            window.focus();
            window.dispatchEvent(new CustomEvent('notification-clicked', { detail: options }));
          };
        }
      } catch (e) {}
    }
  }
}

export const notificationService = new NotificationService();
