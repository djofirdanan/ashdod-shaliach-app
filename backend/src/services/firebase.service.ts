// ============================================================
// אשדוד-שליח – Firebase Service
// CRUD operations, realtime listeners, FCM, Auth verification
// ============================================================

import { getDb, getMessagingInstance, getAuthInstance } from '../config/firebase';
import { Notification, NotificationType } from '../types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  COLLECTION_NOTIFICATIONS,
  COLLECTION_COURIER_LOCATIONS,
} from '../config/constants';
import type { GeoPoint } from '../types';

// ─────────────────────────────────────────
// Auth
// ─────────────────────────────────────────

export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const auth = getAuthInstance();
  const decoded = await auth.verifyIdToken(idToken);
  return { uid: decoded.uid, email: decoded.email };
}

export async function getUserByUid(uid: string): Promise<{ uid: string; email?: string; displayName?: string }> {
  const auth = getAuthInstance();
  const userRecord = await auth.getUser(uid);
  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName,
  };
}

// ─────────────────────────────────────────
// Generic Firestore CRUD
// ─────────────────────────────────────────

export async function createDocument<T extends { id?: string }>(
  collection: string,
  data: T
): Promise<T & { id: string }> {
  const db = getDb();
  const id = data.id ?? uuidv4();
  const doc = { ...data, id };
  await db.collection(collection).doc(id).set(doc);
  return doc as T & { id: string };
}

export async function getDocument<T>(
  collection: string,
  id: string
): Promise<T | null> {
  const db = getDb();
  const snapshot = await db.collection(collection).doc(id).get();
  if (!snapshot.exists) return null;
  return snapshot.data() as T;
}

export async function updateDocument<T>(
  collection: string,
  id: string,
  data: Partial<T>
): Promise<void> {
  const db = getDb();
  await db
    .collection(collection)
    .doc(id)
    .update({ ...data, updatedAt: new Date() });
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  const db = getDb();
  await db.collection(collection).doc(id).delete();
}

export async function queryDocuments<T>(
  collection: string,
  filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }>,
  orderBy?: { field: string; direction?: 'asc' | 'desc' },
  limitCount?: number
): Promise<T[]> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection(collection);

  for (const filter of filters) {
    query = query.where(filter.field, filter.op, filter.value);
  }
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.direction ?? 'asc');
  }
  if (limitCount) {
    query = query.limit(limitCount);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((d) => d.data() as T);
}

export async function countDocuments(
  collection: string,
  filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }>
): Promise<number> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection(collection);
  for (const filter of filters) {
    query = query.where(filter.field, filter.op, filter.value);
  }
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

// ─────────────────────────────────────────
// Courier Location (realtime)
// ─────────────────────────────────────────

export async function updateCourierLocation(
  courierId: string,
  location: GeoPoint
): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTION_COURIER_LOCATIONS).doc(courierId).set({
    courierId,
    latitude: location.latitude,
    longitude: location.longitude,
    updatedAt: new Date(),
  });
}

export async function getCourierLocation(courierId: string): Promise<GeoPoint | null> {
  const db = getDb();
  const doc = await db.collection(COLLECTION_COURIER_LOCATIONS).doc(courierId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return { latitude: data.latitude, longitude: data.longitude };
}

export async function getAllActiveCourierLocations(): Promise<
  Array<{ courierId: string; location: GeoPoint; updatedAt: Date }>
> {
  const db = getDb();
  // Only couriers updated in last 5 minutes
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const snapshot = await db
    .collection(COLLECTION_COURIER_LOCATIONS)
    .where('updatedAt', '>=', since)
    .get();

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      courierId: data.courierId,
      location: { latitude: data.latitude, longitude: data.longitude },
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
    };
  });
}

// ─────────────────────────────────────────
// Realtime listener helper
// ─────────────────────────────────────────

export function listenToDocument(
  collection: string,
  id: string,
  callback: (data: Record<string, unknown> | null) => void
): () => void {
  const db = getDb();
  return db
    .collection(collection)
    .doc(id)
    .onSnapshot(
      (snapshot) => {
        callback(snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null);
      },
      (err) => {
        logger.error(`Firestore listener error on ${collection}/${id}:`, err);
      }
    );
}

// ─────────────────────────────────────────
// FCM Push Notifications
// ─────────────────────────────────────────

export async function sendPushNotification(params: {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<boolean> {
  try {
    const messaging = getMessagingInstance();
    await messaging.send({
      token: params.fcmToken,
      notification: { title: params.title, body: params.body },
      data: params.data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
    return true;
  } catch (err) {
    logger.error('FCM send error:', err);
    return false;
  }
}

export async function sendMulticastNotification(params: {
  fcmTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ successCount: number; failureCount: number }> {
  try {
    const messaging = getMessagingInstance();
    const response = await messaging.sendEachForMulticast({
      tokens: params.fcmTokens,
      notification: { title: params.title, body: params.body },
      data: params.data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    logger.error('FCM multicast error:', err);
    return { successCount: 0, failureCount: params.fcmTokens.length };
  }
}

// ─────────────────────────────────────────
// In-app Notification storage
// ─────────────────────────────────────────

export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
}): Promise<Notification> {
  const notification: Notification = {
    id: uuidv4(),
    userId: params.userId,
    title: params.title,
    body: params.body,
    type: params.type,
    data: params.data,
    isRead: false,
    createdAt: new Date(),
  };
  await createDocument(COLLECTION_NOTIFICATIONS, notification);
  return notification;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDocument(COLLECTION_NOTIFICATIONS, notificationId, { isRead: true });
}

export async function getUserNotifications(
  userId: string,
  limit = 30
): Promise<Notification[]> {
  return queryDocuments<Notification>(
    COLLECTION_NOTIFICATIONS,
    [{ field: 'userId', op: '==', value: userId }],
    { field: 'createdAt', direction: 'desc' },
    limit
  );
}
