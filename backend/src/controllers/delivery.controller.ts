// ============================================================
// אשדוד-שליח – Delivery Controller
// ============================================================

import { Response } from 'express';
import {
  AuthRequest,
  Delivery,
  DeliveryStatus,
  DeliveryType,
  UserRole,
  VehicleType,
  WeatherCondition,
} from '../types';
import {
  createDocument,
  getDocument,
  updateDocument,
  queryDocuments,
  countDocuments,
} from '../services/firebase.service';
import {
  calculatePrice,
  isValidZone,
} from '../services/pricing.service';
import { dispatchDelivery } from '../services/dispatch.service';
import { notifyDeliveryStatusChange } from '../services/notification.service';
import { createDelivery, isValidStatusTransition, getStatusTimestampField } from '../models/delivery.model';
import { COLLECTION_DELIVERIES, COLLECTION_USERS } from '../config/constants';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from '../utils/helpers';
import logger from '../utils/logger';

export const deliveryController = {
  /**
   * POST /deliveries
   * Create a new delivery (business only).
   */
  async createDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.BUSINESS) {
        res.status(403).json(errorResponse('Forbidden', 'Only business accounts can create deliveries'));
        return;
      }

      const {
        type = DeliveryType.REGULAR,
        pickupAddress,
        dropoffAddress,
        recipientName,
        recipientPhone,
        pricingZone,
        isFragile = false,
        requiresSignature = false,
        packageDescription,
        packageWeight,
        notes,
        vehicleType = VehicleType.MOTORCYCLE,
        isUrgent = false,
        weatherCondition = WeatherCondition.CLEAR,
      } = req.body;

      if (!pickupAddress || !dropoffAddress || !recipientName || !recipientPhone || !pricingZone) {
        res.status(400).json(errorResponse('Bad Request', 'pickupAddress, dropoffAddress, recipientName, recipientPhone, pricingZone are required'));
        return;
      }

      if (!isValidZone(pricingZone)) {
        res.status(400).json(errorResponse('Bad Request', `Invalid pricing zone: "${pricingZone}"`));
        return;
      }

      const hour = new Date().getHours();

      let priceResult;
      try {
        priceResult = calculatePrice({
          zoneName: pricingZone,
          deliveryType: type,
          vehicleType,
          isUrgent,
          isDangerousArea: false,
          hour,
          weatherCondition,
          activeDeliveriesInArea: 0,
        });
      } catch (err) {
        res.status(400).json(errorResponse('Bad Request', err instanceof Error ? err.message : 'Price calculation failed'));
        return;
      }

      const delivery = createDelivery({
        businessId: user.id,
        type,
        pickupAddress,
        dropoffAddress,
        recipientName,
        recipientPhone,
        pricingZone,
        basePrice: priceResult.basePrice,
        bonuses: priceResult.bonuses,
        totalPrice: priceResult.totalPrice,
        isFragile,
        requiresSignature,
        packageDescription,
        packageWeight,
        notes,
      });

      await createDocument(COLLECTION_DELIVERIES, delivery);

      // Trigger async dispatch
      const pickupGeo = pickupAddress.geoPoint ?? { latitude: 31.8, longitude: 34.65 };
      dispatchDelivery(delivery, pickupGeo, false).catch((err) => {
        logger.error(`Dispatch failed for delivery ${delivery.id}:`, err);
      });

      logger.info(`Delivery created: ${delivery.id} by business ${user.id}`);
      res.status(201).json(successResponse(delivery, 'Delivery created successfully'));
    } catch (err) {
      logger.error('createDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error', 'Failed to create delivery'));
    }
  },

  /**
   * GET /deliveries/:id
   */
  async getDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);
      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      // Access control: business can only see own deliveries, courier can see assigned deliveries
      if (user.role === UserRole.BUSINESS && delivery.businessId !== user.id) {
        res.status(403).json(errorResponse('Forbidden', 'Access denied'));
        return;
      }
      if (user.role === UserRole.COURIER && delivery.courierId !== user.id && !delivery.dispatchedTo.includes(user.id)) {
        res.status(403).json(errorResponse('Forbidden', 'Access denied'));
        return;
      }

      res.json(successResponse(delivery));
    } catch (err) {
      logger.error('getDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /deliveries
   * Paginated list with filters.
   */
  async listDeliveries(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
      const { status, date } = req.query;

      const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [];

      // Role-based base filters
      if (user.role === UserRole.BUSINESS) {
        filters.push({ field: 'businessId', op: '==', value: user.id });
      } else if (user.role === UserRole.COURIER) {
        filters.push({ field: 'courierId', op: '==', value: user.id });
      } else if (req.query.businessId) {
        filters.push({ field: 'businessId', op: '==', value: req.query.businessId });
      } else if (req.query.courierId) {
        filters.push({ field: 'courierId', op: '==', value: req.query.courierId });
      }

      if (status) {
        filters.push({ field: 'status', op: '==', value: status });
      }

      if (date) {
        const start = new Date(String(date));
        start.setHours(0, 0, 0, 0);
        const end = new Date(String(date));
        end.setHours(23, 59, 59, 999);
        filters.push({ field: 'createdAt', op: '>=', value: start });
        filters.push({ field: 'createdAt', op: '<=', value: end });
      }

      const [deliveries, total] = await Promise.all([
        queryDocuments<Delivery>(
          COLLECTION_DELIVERIES,
          filters,
          { field: 'createdAt', direction: 'desc' },
          limit
        ),
        countDocuments(COLLECTION_DELIVERIES, filters),
      ]);

      res.json(paginatedResponse(deliveries, page, limit, total));
    } catch (err) {
      logger.error('listDeliveries error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PUT /deliveries/:id
   * Update delivery status/details.
   */
  async updateDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);
      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      // Only admin can freely update, businesses and couriers are restricted
      if (user.role === UserRole.BUSINESS && delivery.businessId !== user.id) {
        res.status(403).json(errorResponse('Forbidden'));
        return;
      }
      if (user.role === UserRole.COURIER && delivery.courierId !== user.id) {
        res.status(403).json(errorResponse('Forbidden'));
        return;
      }

      const allowedFields = ['notes', 'recipientName', 'recipientPhone', 'packageDescription'];
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // Status transition (admin only for arbitrary changes)
      if (req.body.status && user.role === UserRole.ADMIN) {
        updates.status = req.body.status;
        const tsField = getStatusTimestampField(req.body.status as DeliveryStatus);
        if (tsField) updates[tsField] = new Date();
      }

      await updateDocument(COLLECTION_DELIVERIES, id, updates);

      const updated = { ...delivery, ...updates };
      res.json(successResponse(updated, 'Delivery updated'));
    } catch (err) {
      logger.error('updateDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /deliveries/:id/cancel
   * Cancel a delivery (only if pending or dispatched).
   */
  async cancelDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);
      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      // Access check
      if (user.role === UserRole.BUSINESS && delivery.businessId !== user.id) {
        res.status(403).json(errorResponse('Forbidden'));
        return;
      }

      const cancellableStatuses: DeliveryStatus[] = [DeliveryStatus.PENDING, DeliveryStatus.DISPATCHED];
      if (!cancellableStatuses.includes(delivery.status) && user.role !== UserRole.ADMIN) {
        res.status(400).json(errorResponse('Bad Request', `Cannot cancel delivery with status "${delivery.status}". Only pending or dispatched deliveries can be cancelled.`));
        return;
      }

      if (!isValidStatusTransition(delivery.status, DeliveryStatus.CANCELLED) && user.role !== UserRole.ADMIN) {
        res.status(400).json(errorResponse('Bad Request', 'Status transition not allowed'));
        return;
      }

      const cancellationReason = req.body.reason ?? 'Cancelled by user';

      await updateDocument(COLLECTION_DELIVERIES, id, {
        status: DeliveryStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason,
        updatedAt: new Date(),
      });

      const updated = { ...delivery, status: DeliveryStatus.CANCELLED, cancellationReason };
      await notifyDeliveryStatusChange(updated, DeliveryStatus.CANCELLED).catch(() => {});

      logger.info(`Delivery ${id} cancelled by user ${user.id}`);
      res.json(successResponse(null, 'Delivery cancelled'));
    } catch (err) {
      logger.error('cancelDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /deliveries/:id/confirm
   * Business confirms receipt after delivery.
   */
  async confirmDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);
      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      if (user.role === UserRole.BUSINESS && delivery.businessId !== user.id) {
        res.status(403).json(errorResponse('Forbidden'));
        return;
      }

      if (delivery.status !== DeliveryStatus.DELIVERED) {
        res.status(400).json(errorResponse('Bad Request', 'Only delivered parcels can be confirmed'));
        return;
      }

      const now = new Date();
      const actualDuration = delivery.pickedUpAt
        ? Math.round((now.getTime() - new Date(delivery.pickedUpAt).getTime()) / 60000)
        : undefined;

      await updateDocument(COLLECTION_DELIVERIES, id, {
        status: DeliveryStatus.CONFIRMED,
        confirmedAt: now,
        actualDuration,
        updatedAt: now,
      });

      // Update business delivery count
      if (user.role === UserRole.BUSINESS) {
        const biz = user as import('../types').Business;
        await updateDocument(COLLECTION_USERS, user.id, {
          deliveryCount: (biz.deliveryCount ?? 0) + 1,
          totalSpent: (biz.totalSpent ?? 0) + delivery.totalPrice,
          updatedAt: now,
        });
      }

      const updated = { ...delivery, status: DeliveryStatus.CONFIRMED };
      await notifyDeliveryStatusChange(updated, DeliveryStatus.CONFIRMED).catch(() => {});

      logger.info(`Delivery ${id} confirmed by business ${user.id}`);
      res.json(successResponse(null, 'Delivery confirmed'));
    } catch (err) {
      logger.error('confirmDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /deliveries/active
   * Active (non-terminal) deliveries for the authenticated user.
   */
  async getActiveDeliveries(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const activeStatuses = [
        DeliveryStatus.PENDING,
        DeliveryStatus.DISPATCHED,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
      ];

      const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [
        { field: 'status', op: 'in', value: activeStatuses },
      ];

      if (user.role === UserRole.BUSINESS) {
        filters.push({ field: 'businessId', op: '==', value: user.id });
      } else if (user.role === UserRole.COURIER) {
        filters.push({ field: 'courierId', op: '==', value: user.id });
      }

      const deliveries = await queryDocuments<Delivery>(
        COLLECTION_DELIVERIES,
        filters,
        { field: 'createdAt', direction: 'desc' }
      );

      res.json(successResponse(deliveries));
    } catch (err) {
      logger.error('getActiveDeliveries error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
