// ============================================================
// אשדוד-שליח – Notification Controller
// ============================================================

import { Response } from 'express';
import { AuthRequest, NotificationType, UserRole } from '../types';
import {
  sendPushNotification as fcmSend,
  getUserNotifications,
  markNotificationRead,
  queryDocuments,
  countDocuments,
} from '../services/firebase.service';
import { broadcastNotification, sendNotificationToUser } from '../services/notification.service';
import { COLLECTION_NOTIFICATIONS } from '../config/constants';
import { successResponse, errorResponse, getPaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

export const notificationController = {
  /**
   * POST /notifications/push
   * Send a push notification via FCM.
   */
  async sendPushNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { fcmToken, title, body, data } = req.body;

      if (!fcmToken || !title || !body) {
        res.status(400).json(errorResponse('Bad Request', 'fcmToken, title, body are required'));
        return;
      }

      const success = await fcmSend({ fcmToken, title, body, data });

      if (!success) {
        res.status(500).json(errorResponse('Notification Failed', 'Could not send push notification'));
        return;
      }

      res.json(successResponse(null, 'Push notification sent'));
    } catch (err) {
      logger.error('sendPushNotification error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /notifications
   * List notifications for the authenticated user.
   */
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { limit: limitParam } = req.query;
      const limit = Math.min(100, parseInt(String(limitParam ?? '30'), 10) || 30);
      const { page } = getPaginationParams(req.query.page, limit);

      const [notifications, total] = await Promise.all([
        getUserNotifications(user.id, limit),
        countDocuments(COLLECTION_NOTIFICATIONS, [
          { field: 'userId', op: '==', value: user.id },
        ]),
      ]);

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      res.json(successResponse({ notifications, unreadCount, total, page, limit }));
    } catch (err) {
      logger.error('getNotifications error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PUT /notifications/:id/read
   * Mark a specific notification as read.
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { id } = req.params;

      // Validate ownership
      const notifications = await queryDocuments(COLLECTION_NOTIFICATIONS, [
        { field: 'id', op: '==', value: id },
        { field: 'userId', op: '==', value: user.id },
      ]);

      if (notifications.length === 0) {
        res.status(404).json(errorResponse('Not Found', 'Notification not found'));
        return;
      }

      await markNotificationRead(id);
      res.json(successResponse(null, 'Notification marked as read'));
    } catch (err) {
      logger.error('markAsRead error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /notifications/bulk  (admin only)
   * Send bulk notification to multiple users.
   */
  async sendBulkNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.ADMIN) {
        res.status(403).json(errorResponse('Forbidden', 'Admin access only'));
        return;
      }

      const { userIds, title, body, type = NotificationType.SYSTEM, data } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json(errorResponse('Bad Request', 'userIds array is required'));
        return;
      }

      if (!title || !body) {
        res.status(400).json(errorResponse('Bad Request', 'title and body are required'));
        return;
      }

      if (userIds.length > 500) {
        res.status(400).json(errorResponse('Bad Request', 'Maximum 500 recipients per bulk notification'));
        return;
      }

      await broadcastNotification({ userIds, title, body, type, data });

      logger.info(`Bulk notification sent to ${userIds.length} users by admin ${user.id}`);
      res.json(successResponse({ sent: userIds.length }, 'Bulk notification sent'));
    } catch (err) {
      logger.error('sendBulkNotification error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /notifications/send-to-user  (admin or self)
   * Send in-app notification to a specific user.
   */
  async sendToUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { userId, title, body, type = NotificationType.SYSTEM, data } = req.body;

      if (!userId || !title || !body) {
        res.status(400).json(errorResponse('Bad Request', 'userId, title, body are required'));
        return;
      }

      // Non-admin can only send to themselves
      if (user.role !== UserRole.ADMIN && userId !== user.id) {
        res.status(403).json(errorResponse('Forbidden', 'Admin access required to send to other users'));
        return;
      }

      const notification = await sendNotificationToUser({ userId, title, body, type, data });
      res.json(successResponse(notification, 'Notification sent'));
    } catch (err) {
      logger.error('sendToUser error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
