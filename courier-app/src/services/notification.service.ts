// ============================================================
// NOTIFICATION SERVICE - אשדוד-שליח Courier App
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiService } from './api.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Request notification permissions and get push token
   */
  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A73E8',
      });

      await Notifications.setNotificationChannelAsync('delivery', {
        name: 'משלוחים חדשים',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#00C853',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'חירום',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#F44336',
        sound: 'default',
      });
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'ashdod-shaliach-courier',
      });
      this.expoPushToken = tokenData.data;

      // Register token with server
      await this.registerToken(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  private async registerToken(token: string): Promise<void> {
    try {
      await apiService.post('/courier/push-token', {
        token,
        platform: Platform.OS,
      });
    } catch (error) {
      console.warn('Failed to register push token:', error);
    }
  }

  /**
   * Set notification listeners
   */
  setListeners(
    onNotification: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    this.notificationListener = Notifications.addNotificationReceivedListener(onNotification);
    this.responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
  }

  /**
   * Remove notification listeners
   */
  removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Send a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Immediate
    });
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  getToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
