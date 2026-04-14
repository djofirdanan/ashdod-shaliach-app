// ============================================================
// אשדוד-שליח – Courier Controller
// ============================================================

import { Response } from 'express';
import {
  AuthRequest,
  Courier,
  Delivery,
  DeliveryStatus,
  UserRole,
  GeoPoint,
} from '../types';
import {
  getDocument,
  updateDocument,
  queryDocuments,
  updateCourierLocation,
  countDocuments,
} from '../services/firebase.service';
import { acceptDelivery as dispatchAccept } from '../services/dispatch.service';
import { notifyDeliveryStatusChange } from '../services/notification.service';
import { creditCourierEarnings } from '../services/bonus.service';
import { isValidStatusTransition, getStatusTimestampField } from '../models/delivery.model';
import {
  COLLECTION_DELIVERIES,
  COLLECTION_USERS,
} from '../config/constants';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from '../utils/helpers';
import logger from '../utils/logger';

export const courierController = {
  /**
   * PUT /courier/availability
   * Toggle courier online/offline.
   */
  async setAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user as Courier | undefined;
      if (!user || user.role !== UserRole.COURIER) {
        res.status(403).json(errorResponse('Forbidden', 'Courier access only'));
        return;
      }

      const { isAvailable, isOnDuty } = req.body;

      if (isAvailable === undefined && isOnDuty === undefined) {
        res.status(400).json(errorResponse('Bad Request', 'isAvailable or isOnDuty is required'));
        return;
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
      if (isOnDuty !== undefined) updates.isOnDuty = Boolean(isOnDuty);

      await updateDocument(COLLECTION_USERS, user.id, updates);

      logger.info(`Courier ${user.id} availability updated:`, updates);
      res.json(successResponse(updates, 'Availability updated'));
    } catch (err) {
      logger.error('setAvailability error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PUT /courier/location
   * Receive GPS coordinates and save to courier_locations.
   */
  async updateLocation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user as Courier | undefined;
      if (!user || user.role !== UserRole.COURIER) {
        res.status(403).json(errorResponse('Forbidden', 'Courier access only'));
        return;
      }

      const { latitude, longitude } = req.body;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json(errorResponse('Bad Request', 'latitude and longitude must be numbers'));
        return;
      }

      const location: GeoPoint = { latitude, longitude };
      await updateCourierLocation(user.id, location);
      // Also update currentLocation on user document
      await updateDocument(COLLECTION_USERS, user.id, { currentLocation: location, updatedAt: new Date() });

      res.json(successResponse({ location }, 'Location updated'));
    } catch (err) {
      logger.error('updateLocation error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /courier/deliveries/:id/accept
   * Courier accepts a dispatched delivery offer.
   */
  async acceptDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user as Courier | undefined;
      if (!user || user.role !== UserRole.COURIER) {
        res.status(403).json(errorResponse('Forbidden', 'Courier access only'));
        return;
      }

      const { id } = req.params;
      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);

      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      if (delivery.status !== DeliveryStatus.DISPATCHED) {
        res.status(400).json(errorResponse('Bad Request', 'Delivery is no longer available'));
        return;
      }

      if (!delivery.dispatchedTo.includes(user.id)) {
        res.status(403).json(errorResponse('Forbidden', 'This delivery was not offered to you'));
        return;
      }

      await dispatchAccept(id, user.id);

      // Add delivery to courier's active list
      const currentActive = user.activeDeliveries ?? [];
      await updateDocument(COLLECTION_USERS, user.id, {
        activeDeliveries: [...currentActive, id],
        updatedAt: new Date(),
      });

      const updated = { ...delivery, status: DeliveryStatus.ACCEPTED, courierId: user.id };
      await notifyDeliveryStatusChange(updated, DeliveryStatus.ACCEPTED).catch(() => {});

      logger.info(`Courier ${user.id} accepted delivery ${id}`);
      res.json(successResponse(null, 'Delivery accepted'));
    } catch (err) {
      logger.error('acceptDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /courier/deliveries/:id/reject
   * Courier rejects a dispatched delivery offer.
   */
  async rejectDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user as Courier | undefined;
      if (!user || user.role !== UserRole.COURIER) {
        res.status(403).json(errorResponse('Forbidden', 'Courier access only'));
        return;
      }

      const { id } = req.params;
      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);

      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      if (delivery.status !== DeliveryStatus.DISPATCHED) {
        res.status(400).json(errorResponse('Bad Request', 'Delivery is not in dispatched status'));
        return;
      }

      // Remove courier from dispatchedTo so they don't receive it again
      const newDispatchedTo = delivery.dispatchedTo.filter((cid) => cid !== user.id);
      await updateDocument(COLLECTION_DELIVERIES, id, {
        dispatchedTo: newDispatchedTo,
        updatedAt: new Date(),
      });

      logger.info(`Courier ${user.id} rejected delivery ${id}`);
      res.json(successResponse(null, 'Delivery rejected'));
    } catch (err) {
      logger.error('rejectDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /courier/deliveries/:id/pickup
   * Mark delivery as picked up.
   */
  async pickupDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user as Courier | undefined;
      if (!user || user.role !== UserRole.COURIER) {
        res.status(403).json(errorResponse('Forbidden', 'Courier access only'));
        return;
      }

      const { id } = req.params;
      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);

      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      if (delivery.courierId !== user.id) {
        res.status(403).json(errorResponse('Forbidden', 'This delivery is not assigned to you'));
        return;
      }

      if (!isValidStatusTransition(delivery.status, DeliveryStatus.PICKED_UP)) {
        res.status(400).json(errorResponse('Bad Request', `Cannot pick up delivery with status "${delivery.status}"`));
        return;
      }

      const now = new Date();
      await updateDocument(COLLECTION_DELIVERIES, id, {
        status: DeliveryStatus.PICKED_UP,
        pickedUpAt: now,
        updatedAt: now,
      });

      const updated = { ...delivery, status: DeliveryStatus.PICKED_UP, pickedUpAt: now };
      await notifyDeliveryStatusChange(updated, DeliveryStatus.PICKED_UP).catch(() => {});

      logger.info(`Delivery ${id} picked up by courier ${user.id}`);
      res.json(successResponse(null, 'Delivery marked as picked up'));
    } catch (err) {
      logger.error('pickupDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /courier/deliveries/:id/complete
   * Mark delivery as delivered with proof (photo url, signature url, GPS).
   */
  async completeDelivery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user as Courier | undefined;
      if (!user || user.role !== UserRole.COURIER) {
        res.status(403).json(errorResponse('Forbidden', 'Courier access only'));
        return;
      }

      const { id } = req.params;
      const delivery = await getDocument<Delivery>(COLLECTION_DELIVERIES, id);

      if (!delivery) {
        res.status(404).json(errorResponse('Not Found', 'Delivery not found'));
        return;
      }

      if (delivery.courierId !== user.id) {
        res.status(403).json(errorResponse('Forbidden', 'This delivery is not assigned to you'));
        return;
      }

      if (!isValidStatusTransition(delivery.status, DeliveryStatus.DELIVERED)) {
        res.status(400).json(errorResponse('Bad Request', `Cannot complete delivery with status "${delivery.status}"`));
        return;
      }

      const { proofOfDeliveryUrl, signatureUrl, deliveryLocation } = req.body;

      const now = new Date();
      const tsField = getStatusTimestampField(DeliveryStatus.DELIVERED);
      const updates: Record<string, unknown> = {
        status: DeliveryStatus.DELIVERED,
        updatedAt: now,
      };
      if (tsField) updates[tsField] = now;
      if (proofOfDeliveryUrl) updates.proofOfDeliveryUrl = proofOfDeliveryUrl;
      if (signatureUrl) updates.signatureUrl = signatureUrl;
      if (deliveryLocation) updates.deliveryLocation = deliveryLocation;

      await updateDocument(COLLECTION_DELIVERIES, id, updates);

      // Remove from courier active deliveries & increment completed count
      const currentActive = (user as Courier).activeDeliveries ?? [];
      const newActive = currentActive.filter((did) => did !== id);
      const fullCourier = await getDocument<Courier>(COLLECTION_USERS, user.id);
      const completedCount = (fullCourier?.completedDeliveries ?? 0) + 1;

      await updateDocument(COLLECTION_USERS, user.id, {
        activeDeliveries: newActive,
        completedDeliveries: completedCount,
        updatedAt: now,
      });

      // Credit earnings
      if (fullCourier?.earnings) {
        const bonusAmount = delivery.bonuses.reduce((s, b) => s + b.amount, 0);
        await creditCourierEarnings(user.id, delivery.totalPrice, bonusAmount, fullCourier.earnings);
      }

      const updated = { ...delivery, status: DeliveryStatus.DELIVERED, deliveredAt: now };
      await notifyDeliveryStatusChange(updated, DeliveryStatus.DELIVERED).catch(() => {});

      logger.info(`Delivery ${id} completed by courier ${user.id}`);
      res.json(successResponse(null, 'Delivery marked as delivered'));
    } catch (err) {
      logger.error('completeDelivery error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /courier/stats
   * Today earnings, deliveries count, rating for the authenticated courier.
   */
  async getCourierStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user as Courier | undefined;
      if (!user || user.role !== UserRole.COURIER) {
        res.status(403).json(errorResponse('Forbidden', 'Courier access only'));
        return;
      }

      const courier = await getDocument<Courier>(COLLECTION_USERS, user.id);
      if (!courier) {
        res.status(404).json(errorResponse('Not Found'));
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayDeliveriesCount = await countDocuments(COLLECTION_DELIVERIES, [
        { field: 'courierId', op: '==', value: user.id },
        { field: 'status', op: '==', value: DeliveryStatus.DELIVERED },
        { field: 'deliveredAt', op: '>=', value: today },
      ]);

      const stats = {
        todayEarnings: courier.earnings?.today ?? 0,
        weekEarnings: courier.earnings?.thisWeek ?? 0,
        monthEarnings: courier.earnings?.thisMonth ?? 0,
        totalEarnings: courier.earnings?.total ?? 0,
        bonusTotal: courier.earnings?.bonusTotal ?? 0,
        todayDeliveries: todayDeliveriesCount,
        totalDeliveries: courier.completedDeliveries ?? 0,
        activeDeliveries: (courier.activeDeliveries ?? []).length,
        rating: courier.rating ?? 0,
        ratingCount: courier.ratingCount ?? 0,
        isAvailable: courier.isAvailable,
        isOnDuty: courier.isOnDuty,
      };

      res.json(successResponse(stats));
    } catch (err) {
      logger.error('getCourierStats error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /courier/list  (admin only)
   * All couriers with filters.
   */
  async listCouriers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.ADMIN) {
        res.status(403).json(errorResponse('Forbidden', 'Admin access only'));
        return;
      }

      const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
      const { isAvailable, isOnDuty, vehicleType } = req.query;

      const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [
        { field: 'role', op: '==', value: UserRole.COURIER },
      ];

      if (isAvailable !== undefined) {
        filters.push({ field: 'isAvailable', op: '==', value: isAvailable === 'true' });
      }
      if (isOnDuty !== undefined) {
        filters.push({ field: 'isOnDuty', op: '==', value: isOnDuty === 'true' });
      }
      if (vehicleType) {
        filters.push({ field: 'vehicleType', op: '==', value: vehicleType });
      }

      const [couriers, total] = await Promise.all([
        queryDocuments<Courier>(COLLECTION_USERS, filters, { field: 'createdAt', direction: 'desc' }, limit),
        countDocuments(COLLECTION_USERS, filters),
      ]);

      res.json(paginatedResponse(couriers, page, limit, total));
    } catch (err) {
      logger.error('listCouriers error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
