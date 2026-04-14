// ============================================================
// אשדוד-שליח – Notification Service
// ============================================================

import { Server as SocketServer } from 'socket.io';
import {
  Notification,
  NotificationType,
  Delivery,
  DeliveryStatus,
  User,
} from '../types';
import {
  SOCKET_EVENT_NOTIFICATION,
  COLLECTION_USERS,
} from '../config/constants';
import {
  sendPushNotification,
  sendMulticastNotification,
  createNotification,
  getDocument,
} from './firebase.service';
import logger from '../utils/logger';

let io: SocketServer | null = null;

export function setNotificationSocketServer(socketServer: SocketServer): void {
  io = socketServer;
}

// ─────────────────────────────────────────
// Core send function
// ─────────────────────────────────────────

export async function sendNotificationToUser(params: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
}): Promise<Notification> {
  const { userId, title, body, type, data } = params;

  // 1. Store in-app notification
  const notification = await createNotification({ userId, title, body, type, data });

  // 2. Emit via Socket.io (realtime)
  if (io) {
    io.to(`user:${userId}`).emit(SOCKET_EVENT_NOTIFICATION, notification);
  }

  // 3. Send FCM push (best-effort)
  try {
    const user = await getDocument<User>(COLLECTION_USERS, userId);
    if (user?.fcmToken) {
      await sendPushNotification({
        fcmToken: user.fcmToken,
        title,
        body,
        data,
      });
    }
  } catch (err) {
    logger.warn(`FCM push failed for user ${userId}:`, err);
  }

  return notification;
}

// ─────────────────────────────────────────
// Delivery lifecycle notifications
// ─────────────────────────────────────────

export async function notifyDeliveryStatusChange(
  delivery: Delivery,
  newStatus: DeliveryStatus
): Promise<void> {
  const statusMessages: Record<DeliveryStatus, { title: string; body: string }> = {
    [DeliveryStatus.PENDING]: {
      title: 'משלוח חדש',
      body: `משלוח #${delivery.id.slice(0, 6)} ממתין לשליח`,
    },
    [DeliveryStatus.DISPATCHED]: {
      title: 'מחפשים שליח',
      body: 'משלוחך נשלח לשליחים זמינים',
    },
    [DeliveryStatus.ACCEPTED]: {
      title: 'שליח בדרך!',
      body: 'שליח קיבל את המשלוח שלך ובדרך אליך',
    },
    [DeliveryStatus.PICKED_UP]: {
      title: 'המשלוח נאסף',
      body: 'השליח אסף את החבילה ובדרך ליעד',
    },
    [DeliveryStatus.IN_TRANSIT]: {
      title: 'בדרך אליך',
      body: 'החבילה שלך בדרך',
    },
    [DeliveryStatus.DELIVERED]: {
      title: 'הגיע!',
      body: 'המשלוח הגיע ליעדו. נא לאשר קבלה',
    },
    [DeliveryStatus.CONFIRMED]: {
      title: 'משלוח אושר',
      body: 'המשלוח אושר בהצלחה. תודה!',
    },
    [DeliveryStatus.CANCELLED]: {
      title: 'משלוח בוטל',
      body: `משלוח #${delivery.id.slice(0, 6)} בוטל`,
    },
  };

  const message = statusMessages[newStatus];
  if (!message) return;

  const promises: Promise<Notification>[] = [];

  // Notify business
  promises.push(
    sendNotificationToUser({
      userId: delivery.businessId,
      title: message.title,
      body: message.body,
      type: statusToNotificationType(newStatus),
      data: { deliveryId: delivery.id, status: newStatus },
    })
  );

  // Notify courier (if assigned)
  if (delivery.courierId && newStatus !== DeliveryStatus.DISPATCHED) {
    promises.push(
      sendNotificationToUser({
        userId: delivery.courierId,
        title: message.title,
        body: message.body,
        type: statusToNotificationType(newStatus),
        data: { deliveryId: delivery.id, status: newStatus },
      })
    );
  }

  await Promise.allSettled(promises);
}

function statusToNotificationType(status: DeliveryStatus): NotificationType {
  const map: Partial<Record<DeliveryStatus, NotificationType>> = {
    [DeliveryStatus.DISPATCHED]: NotificationType.DELIVERY_OFFER,
    [DeliveryStatus.ACCEPTED]: NotificationType.DELIVERY_ACCEPTED,
    [DeliveryStatus.PICKED_UP]: NotificationType.DELIVERY_PICKED_UP,
    [DeliveryStatus.IN_TRANSIT]: NotificationType.DELIVERY_IN_TRANSIT,
    [DeliveryStatus.DELIVERED]: NotificationType.DELIVERY_DELIVERED,
    [DeliveryStatus.CONFIRMED]: NotificationType.DELIVERY_CONFIRMED,
    [DeliveryStatus.CANCELLED]: NotificationType.DELIVERY_CANCELLED,
  };
  return map[status] ?? NotificationType.SYSTEM;
}

// ─────────────────────────────────────────
// Broadcast to multiple users
// ─────────────────────────────────────────

export async function broadcastNotification(params: {
  userIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
}): Promise<void> {
  const { userIds, title, body, type, data } = params;

  // Fetch FCM tokens in parallel
  const userPromises = userIds.map((id) => getDocument<User>(COLLECTION_USERS, id));
  const users = await Promise.all(userPromises);

  const fcmTokens = users.filter((u) => u?.fcmToken).map((u) => u!.fcmToken!);

  if (fcmTokens.length > 0) {
    await sendMulticastNotification({ fcmTokens, title, body, data });
  }

  // Socket.io realtime + in-app storage
  const notifPromises = userIds.map((userId) =>
    sendNotificationToUser({ userId, title, body, type, data })
  );
  await Promise.allSettled(notifPromises);
}

// ─────────────────────────────────────────
// Delivery offer to specific couriers
// ─────────────────────────────────────────

export async function notifyDeliveryOffer(
  courierIds: string[],
  delivery: Delivery
): Promise<void> {
  const promises = courierIds.map((courierId) =>
    sendNotificationToUser({
      userId: courierId,
      title: 'משלוח חדש!',
      body: `משלוח מ${delivery.pickupAddress.city} ל${delivery.dropoffAddress.city} – ₪${delivery.totalPrice}`,
      type: NotificationType.DELIVERY_OFFER,
      data: {
        deliveryId: delivery.id,
        totalPrice: String(delivery.totalPrice),
        zone: delivery.pricingZone,
      },
    })
  );
  await Promise.allSettled(promises);
}
