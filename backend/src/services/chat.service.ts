// ============================================================
// אשדוד-שליח – Chat Service
// ============================================================

import { Server as SocketServer } from 'socket.io';
import {
  ChatMessage,
  ChatMessageType,
  UserRole,
  NotificationType,
} from '../types';
import {
  COLLECTION_CHAT_MESSAGES,
  SOCKET_EVENT_CHAT_MESSAGE,
} from '../config/constants';
import { createDocument, queryDocuments } from './firebase.service';
import { sendNotificationToUser } from './notification.service';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

let io: SocketServer | null = null;

export function setChatSocketServer(socketServer: SocketServer): void {
  io = socketServer;
}

// ─────────────────────────────────────────
// Send message
// ─────────────────────────────────────────

export async function sendChatMessage(params: {
  deliveryId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  content: string;
  messageType?: ChatMessageType;
  mediaUrl?: string;
  recipientId: string;
}): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: uuidv4(),
    deliveryId: params.deliveryId,
    senderId: params.senderId,
    senderRole: params.senderRole,
    senderName: params.senderName,
    content: params.content,
    messageType: params.messageType ?? ChatMessageType.TEXT,
    mediaUrl: params.mediaUrl,
    isRead: false,
    createdAt: new Date(),
  };

  // Persist to Firestore
  await createDocument(COLLECTION_CHAT_MESSAGES, message);

  // Emit via Socket.io to delivery room
  if (io) {
    io.to(`delivery:${params.deliveryId}`).emit(SOCKET_EVENT_CHAT_MESSAGE, message);
  }

  // Push notification to recipient
  try {
    await sendNotificationToUser({
      userId: params.recipientId,
      title: `הודעה מ${params.senderName}`,
      body: params.messageType === ChatMessageType.TEXT ? params.content : '📎 מדיה חדשה',
      type: NotificationType.NEW_MESSAGE,
      data: { deliveryId: params.deliveryId, messageId: message.id },
    });
  } catch (err) {
    logger.warn('Failed to send chat push notification:', err);
  }

  return message;
}

// ─────────────────────────────────────────
// Get messages for a delivery
// ─────────────────────────────────────────

export async function getDeliveryMessages(
  deliveryId: string,
  limit = 50
): Promise<ChatMessage[]> {
  return queryDocuments<ChatMessage>(
    COLLECTION_CHAT_MESSAGES,
    [{ field: 'deliveryId', op: '==', value: deliveryId }],
    { field: 'createdAt', direction: 'asc' },
    limit
  );
}

// ─────────────────────────────────────────
// Mark messages as read
// ─────────────────────────────────────────

export async function markMessagesRead(
  deliveryId: string,
  readerId: string
): Promise<void> {
  // Firestore batch update – find unread messages not sent by reader
  const { getDb } = await import('../config/firebase');
  const db = getDb();

  const snapshot = await db
    .collection(COLLECTION_CHAT_MESSAGES)
    .where('deliveryId', '==', deliveryId)
    .where('senderId', '!=', readerId)
    .where('isRead', '==', false)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { isRead: true });
  });
  await batch.commit();

  logger.info(`Marked ${snapshot.size} messages as read for delivery ${deliveryId}`);
}

// ─────────────────────────────────────────
// System message (status updates)
// ─────────────────────────────────────────

export async function sendSystemMessage(
  deliveryId: string,
  content: string
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: uuidv4(),
    deliveryId,
    senderId: 'system',
    senderRole: UserRole.ADMIN,
    senderName: 'מערכת אשדוד-שליח',
    content,
    messageType: ChatMessageType.SYSTEM,
    isRead: false,
    createdAt: new Date(),
  };

  await createDocument(COLLECTION_CHAT_MESSAGES, message);

  if (io) {
    io.to(`delivery:${deliveryId}`).emit(SOCKET_EVENT_CHAT_MESSAGE, message);
  }

  return message;
}

// ─────────────────────────────────────────
// Unread count
// ─────────────────────────────────────────

export async function getUnreadCount(userId: string, deliveryId: string): Promise<number> {
  const messages = await queryDocuments<ChatMessage>(
    COLLECTION_CHAT_MESSAGES,
    [
      { field: 'deliveryId', op: '==', value: deliveryId },
      { field: 'senderId', op: '!=', value: userId },
      { field: 'isRead', op: '==', value: false },
    ]
  );
  return messages.length;
}
