import { getMessaging, getToken, onTokenRefresh, Messaging } from 'firebase/messaging';
import { app } from '@/lib/firebase';

type DeviceInfo = Record<string, unknown>;

class PushNotificationService {
  private messaging: Messaging | null = null;
  private initialized = false;

  async init() {
    if (typeof window === 'undefined' || this.initialized) return;

    try {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        console.warn('[Push] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — skipping web push registration');
        return;
      }

      this.messaging = getMessaging(app);
      this.initialized = true;

      const token = await this.requestPermissionAndToken(vapidKey);
      if (token) {
        await this.registerToken(token);
      }

      if (this.messaging) {
        onTokenRefresh(this.messaging, async (newToken) => {
          if (newToken) {
            await this.registerToken(newToken);
          }
        });
      }
    } catch (error) {
      console.error('[Push] Initialization failed:', error);
    }
  }

  private async requestPermissionAndToken(vapidKey: string): Promise<string | null> {
    if (!('Notification' in window)) {
      console.warn('[Push] Notifications are not supported in this browser');
      return null;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'denied') {
      console.warn('[Push] Notification permission denied');
      return null;
    }

    try {
      return await getToken(this.messaging!, { vapidKey });
    } catch (error) {
      console.error('[Push] Failed to get FCM token:', error);
      return null;
    }
  }

  private async registerToken(token: string) {
    try {
      const deviceInfo: DeviceInfo = {
        platform: 'web',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };

      const response = await fetch('/api/register-user-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceInfo }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `Registration failed: ${response.status}`);
      }

      console.log('[Push] FCM token saved');
    } catch (error) {
      console.error('[Push] Failed to save FCM token:', error);
    }
  }

  async removeToken() {
    if (!this.messaging) return;

    try {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      const token = await getToken(this.messaging, { vapidKey });
      if (!token) return;

      const response = await fetch('/api/register-user-device', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `Removal failed: ${response.status}`);
      }

      console.log('[Push] FCM token removed successfully on sign-out');
    } catch (error) {
      console.error('[Push] Failed to remove FCM token:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
