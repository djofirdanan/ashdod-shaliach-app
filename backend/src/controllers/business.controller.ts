// ============================================================
// אשדוד-שליח – Business Controller
// ============================================================

import { Response } from 'express';
import { AuthRequest, Business, Delivery, DeliveryStatus, UserRole } from '../types';
import {
  getDocument,
  updateDocument,
  queryDocuments,
  countDocuments,
} from '../services/firebase.service';
import { COLLECTION_USERS, COLLECTION_DELIVERIES } from '../config/constants';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from '../utils/helpers';
import logger from '../utils/logger';

export const businessController = {
  /**
   * GET /business/profile
   */
  async getBusinessProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      if (user.role !== UserRole.BUSINESS && user.role !== UserRole.ADMIN) {
        res.status(403).json(errorResponse('Forbidden', 'Business access only'));
        return;
      }

      // Admin can fetch any business profile via ?businessId=...
      const targetId = user.role === UserRole.ADMIN && req.query.businessId
        ? String(req.query.businessId)
        : user.id;

      const business = await getDocument<Business>(COLLECTION_USERS, targetId);
      if (!business) {
        res.status(404).json(errorResponse('Not Found', 'Business not found'));
        return;
      }

      if (business.role !== UserRole.BUSINESS) {
        res.status(400).json(errorResponse('Bad Request', 'User is not a business'));
        return;
      }

      res.json(successResponse(business));
    } catch (err) {
      logger.error('getBusinessProfile error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PUT /business/profile
   */
  async updateBusinessProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.BUSINESS) {
        res.status(403).json(errorResponse('Forbidden', 'Business access only'));
        return;
      }

      const allowedFields = ['businessName', 'businessAddress', 'contactPerson', 'name', 'phone', 'fcmToken'];
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 1) {
        res.status(400).json(errorResponse('Bad Request', 'No valid fields to update'));
        return;
      }

      await updateDocument(COLLECTION_USERS, user.id, updates);

      res.json(successResponse({ ...user, ...updates }, 'Business profile updated'));
    } catch (err) {
      logger.error('updateBusinessProfile error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /business/stats
   */
  async getBusinessStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const targetId = user.role === UserRole.ADMIN && req.query.businessId
        ? String(req.query.businessId)
        : user.id;

      if (user.role !== UserRole.BUSINESS && user.role !== UserRole.ADMIN) {
        res.status(403).json(errorResponse('Forbidden'));
        return;
      }

      const business = await getDocument<Business>(COLLECTION_USERS, targetId);
      if (!business) {
        res.status(404).json(errorResponse('Not Found', 'Business not found'));
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [todayCount, weekCount, monthCount, totalCount, cancelledCount] = await Promise.all([
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'businessId', op: '==', value: targetId },
          { field: 'createdAt', op: '>=', value: today },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'businessId', op: '==', value: targetId },
          { field: 'createdAt', op: '>=', value: weekAgo },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'businessId', op: '==', value: targetId },
          { field: 'createdAt', op: '>=', value: monthAgo },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'businessId', op: '==', value: targetId },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'businessId', op: '==', value: targetId },
          { field: 'status', op: '==', value: DeliveryStatus.CANCELLED },
        ]),
      ]);

      const stats = {
        todayDeliveries: todayCount,
        weekDeliveries: weekCount,
        monthDeliveries: monthCount,
        totalDeliveries: totalCount,
        cancelledDeliveries: cancelledCount,
        totalSpent: business.totalSpent ?? 0,
        creditBalance: business.creditBalance ?? 0,
        isVerified: business.isVerified,
        cancellationRate: totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0,
      };

      res.json(successResponse(stats));
    } catch (err) {
      logger.error('getBusinessStats error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /business/list  (admin only)
   */
  async listBusinesses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.ADMIN) {
        res.status(403).json(errorResponse('Forbidden', 'Admin access only'));
        return;
      }

      const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
      const { isVerified, isActive } = req.query;

      const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [
        { field: 'role', op: '==', value: UserRole.BUSINESS },
      ];

      if (isVerified !== undefined) {
        filters.push({ field: 'isVerified', op: '==', value: isVerified === 'true' });
      }
      if (isActive !== undefined) {
        filters.push({ field: 'isActive', op: '==', value: isActive === 'true' });
      }

      const [businesses, total] = await Promise.all([
        queryDocuments<Business>(COLLECTION_USERS, filters, { field: 'createdAt', direction: 'desc' }, limit),
        countDocuments(COLLECTION_USERS, filters),
      ]);

      res.json(paginatedResponse(businesses, page, limit, total));
    } catch (err) {
      logger.error('listBusinesses error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
