/**
 * Browser Notification Service for Reminders
 */

export class NotificationService {
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  static getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('[Notification permission error]:', err);
      return false;
    }
  }

  static send(title: string, body: string, icon = '/icon.png'): boolean {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }
    try {
      new Notification(title, {
        body,
        icon,
        badge: icon,
        requireInteraction: true,
      });
      return true;
    } catch (err) {
      console.error('[Notification send error]:', err);
      return false;
    }
  }
}
