// ============================================================
// אשדוד-שליח – Pricing Controller
// ============================================================

import { Request, Response } from 'express';
import { AuthRequest, UserRole, DeliveryType, VehicleType, WeatherCondition } from '../types';
import {
  listAllZones,
  calculatePrice,
  isValidZone,
  getZonesFromDb,
  getZoneBasePrice,
} from '../services/pricing.service';
import {
  getDocument,
  updateDocument,
  queryDocuments,
} from '../services/firebase.service';
import { COLLECTION_PRICING_ZONES } from '../config/constants';
import { successResponse, errorResponse } from '../utils/helpers';
import logger from '../utils/logger';

export const pricingController = {
  /**
   * GET /pricing/zones
   * Return all pricing zones.
   */
  async getAllZones(req: Request, res: Response): Promise<void> {
    try {
      // Try DB first, fall back to in-memory map
      const zones = await getZonesFromDb();
      res.json(successResponse(zones));
    } catch (err) {
      logger.error('getAllZones error:', err);
      // Fallback to in-memory
      const zones = listAllZones();
      res.json(successResponse(zones));
    }
  },

  /**
   * PUT /pricing/zones/:id  (admin only)
   * Update price for a specific zone.
   */
  async updateZone(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.ADMIN) {
        res.status(403).json(errorResponse('Forbidden', 'Admin access only'));
        return;
      }

      const { id } = req.params;
      const { basePrice, carOnlyPrice, requiresCar, isActive } = req.body;

      const zone = await getDocument(COLLECTION_PRICING_ZONES, id);
      if (!zone) {
        res.status(404).json(errorResponse('Not Found', 'Pricing zone not found'));
        return;
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (basePrice !== undefined) updates.basePrice = Number(basePrice);
      if (carOnlyPrice !== undefined) updates.carOnlyPrice = Number(carOnlyPrice);
      if (requiresCar !== undefined) updates.requiresCar = Boolean(requiresCar);
      if (isActive !== undefined) updates.isActive = Boolean(isActive);

      await updateDocument(COLLECTION_PRICING_ZONES, id, updates);

      logger.info(`Pricing zone ${id} updated by admin ${user.id}`);
      res.json(successResponse({ id, ...updates }, 'Zone updated successfully'));
    } catch (err) {
      logger.error('updateZone error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /pricing/calculate
   * Calculate price for given destination zone and delivery type.
   */
  async calculatePrice(req: Request, res: Response): Promise<void> {
    try {
      const {
        zoneName,
        deliveryType = DeliveryType.REGULAR,
        vehicleType = VehicleType.MOTORCYCLE,
        isUrgent = false,
        isDangerousArea = false,
        weatherCondition = WeatherCondition.CLEAR,
        activeDeliveriesInArea = 0,
      } = req.body;

      if (!zoneName) {
        res.status(400).json(errorResponse('Bad Request', 'zoneName is required'));
        return;
      }

      if (!isValidZone(zoneName)) {
        res.status(400).json(errorResponse('Bad Request', `Unknown zone: "${zoneName}"`));
        return;
      }

      const hour = new Date().getHours();
      const result = calculatePrice({
        zoneName,
        deliveryType,
        vehicleType,
        isUrgent,
        isDangerousArea,
        hour,
        weatherCondition,
        activeDeliveriesInArea,
      });

      res.json(successResponse(result));
    } catch (err) {
      logger.error('calculatePrice error:', err);
      if (err instanceof Error && err.message.includes('Unknown pricing zone')) {
        res.status(400).json(errorResponse('Bad Request', err.message));
        return;
      }
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /pricing/zones/by-name
   * Get zone info by name.
   */
  async getZoneByName(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.query;

      if (!name || typeof name !== 'string') {
        res.status(400).json(errorResponse('Bad Request', 'name query parameter is required'));
        return;
      }

      if (!isValidZone(name)) {
        res.status(404).json(errorResponse('Not Found', `Zone "${name}" not found`));
        return;
      }

      // Try DB first
      const zonesFromDb = await queryDocuments(
        COLLECTION_PRICING_ZONES,
        [{ field: 'name', op: '==', value: name }],
        undefined,
        1
      );

      if (zonesFromDb.length > 0) {
        res.json(successResponse(zonesFromDb[0]));
        return;
      }

      // Fallback: build from in-memory
      const basePrice = getZoneBasePrice(name);
      const allZones = listAllZones();
      const zoneData = allZones.find((z) => z.name === name);

      res.json(successResponse({
        name,
        basePrice,
        carOnlyPrice: zoneData?.carOnlyPrice,
        requiresCar: zoneData?.requiresCar ?? false,
        isActive: true,
      }));
    } catch (err) {
      logger.error('getZoneByName error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
