interface NotificationPayload {
  title: string;
  message: string;
  data?: Record<string, any>;
  url?: string;
}

class NotificationService {
  private readonly appId = '2e795a82-c5c0-4fbc-94a5-72f363a36423';
  private isInitialized = false;

  // Initialize OneSignal
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Check if OneSignal is available
      if (typeof window === 'undefined' || !window.OneSignal) {
        console.warn('OneSignal SDK not loaded');
        return;
      }

      await window.OneSignal.init({
        appId: this.appId,
        safari_web_id: 'web.onesignal.auto.18140f1a-e44e-4a3d-ae64-9b89c84f1234',
        notifyButton: {
          enable: true,
        },
        allowLocalhostAsSecureOrigin: true,
      });

      this.isInitialized = true;
      console.log('OneSignal initialized successfully');
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (window.OneSignal) {
        const permission = await window.OneSignal.showNativePrompt();
        return permission;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Get user ID
  async getUserId(): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (window.OneSignal) {
        const userId = await window.OneSignal.getUserId();
        return userId;
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  // Set user tags
  async setUserTags(tags: Record<string, string>) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (window.OneSignal) {
        await window.OneSignal.sendTags(tags);
      }
    } catch (error) {
      console.error('Error setting user tags:', error);
    }
  }

  // Subscribe user
  async subscribeUser(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (window.OneSignal) {
        await window.OneSignal.setSubscription(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error subscribing user:', error);
      return false;
    }
  }

  // Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (window.OneSignal) {
        return await window.OneSignal.isPushNotificationsEnabled();
      }
      return false;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Show local notification (for testing)
  showLocalNotification(payload: NotificationPayload) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.message,
        icon: '/favicon.ico',
        data: payload.data
      });
    }
  }
}

export const notificationService = new NotificationService();

// Extend Window interface for OneSignal
declare global {
  interface Window {
    OneSignal?: any;
  }
}