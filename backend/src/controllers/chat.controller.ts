// ============================================================
// אשדוד-שליח – Chat Controller
// ============================================================

import { Response } from 'express';
import { AuthRequest, Delivery, UserRole, ChatMessageType } from '../types';
import { getDocument } from '../services/firebase.service';
import {
  sendChatMessage,
  getDeliveryMessages,
  markMessagesRead,
} from '../services/chat.service';
import { COLLECTION_DELIVERIES } from '../config/constants';
import { successResponse, errorResponse } from '../utils/helpers';
import logger from '../utils/logger';

export const chatController = {
  /**
   * POST /chat/:deliveryId/messages
   * Send a message in a delivery conversation.
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { deliveryId } = req.params;
      const { content, messageType = ChatMessageType.TEXT, mediaUrl, recipientId } = req.body;

      if (!content && !mediaUrl) {
        res.status(400).json(errorResponse('Bad Request', 'content or mediaUrl is required'));
        return;
      }

      if (!recipientId) {
        res.status(400).json(errorResponse('Bad Request', 'recipientId is required'));
        return;
      }

      // Verify access to delivery
      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, deliveryId);
      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      const hasAccess =
        user.role === UserRole.ADMIN ||
        delivery.businessId === user.id ||
        delivery.courierId === user.id;

      if (!hasAccess) {
        res.status(403).json(errorResponse('Forbidden', 'Access denied'));
        return;
      }

      const message = await sendChatMessage({
        deliveryId,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.name,
        content: content ?? '',
        messageType,
        mediaUrl,
        recipientId,
      });

      res.status(201).json(successResponse(message, 'Message sent'));
    } catch (err) {
      logger.error('sendMessage error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /chat/:deliveryId/messages
   * Get messages between business and courier for a delivery.
   */
  async getConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { deliveryId } = req.params;
      const limit = Math.min(100, parseInt(String(req.query.limit ?? '50'), 10) || 50);

      // Verify access
      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, deliveryId);
      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      const hasAccess =
        user.role === UserRole.ADMIN ||
        delivery.businessId === user.id ||
        delivery.courierId === user.id;

      if (!hasAccess) {
        res.status(403).json(errorResponse('Forbidden', 'Access denied'));
        return;
      }

      const messages = await getDeliveryMessages(deliveryId, limit);
      res.json(successResponse(messages));
    } catch (err) {
      logger.error('getConversation error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PUT /chat/:deliveryId/read
   * Mark all messages in a delivery as read.
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { deliveryId } = req.params;

      // Verify access
      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, deliveryId);
      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      const hasAccess =
        user.role === UserRole.ADMIN ||
        delivery.businessId === user.id ||
        delivery.courierId === user.id;

      if (!hasAccess) {
        res.status(403).json(errorResponse('Forbidden', 'Access denied'));
        return;
      }

      await markMessagesRead(deliveryId, user.id);
      res.json(successResponse(null, 'Messages marked as read'));
    } catch (err) {
      logger.error('markAsRead error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
