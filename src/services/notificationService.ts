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
        await navigator.serviceWorker.register('/sw.js');
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
              icon: '/icon.svg',
              ...options
            });
          });
        } else {
          new Notification(title, {
            icon: '/icon.svg',
            ...options
          });
        }
      } catch (e) {}
    }
  }
}

export const notificationService = new NotificationService();
