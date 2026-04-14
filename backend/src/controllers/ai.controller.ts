// ============================================================
// אשדוד-שליח – AI Controller
// ============================================================

import { Request, Response } from 'express';
import { AuthRequest, DeliveryType, UserRole } from '../types';
import {
  estimateDeliveryTime,
  getDynamicPricingSuggestion,
  recommendBestCourier,
  forecastDemand,
  detectAnomalies,
} from '../services/ai.service';
import { isValidZone } from '../services/pricing.service';
import { successResponse, errorResponse } from '../utils/helpers';
import logger from '../utils/logger';

export const aiController = {
  /**
   * POST /ai/estimate
   * Predict ETA for a delivery.
   */
  async getDeliveryEstimate(req: Request, res: Response): Promise<void> {
    try {
      const {
        zone,
        deliveryType = DeliveryType.REGULAR,
        distanceKm,
      } = req.body;

      if (!zone) {
        res.status(400).json(errorResponse('Bad Request', 'zone is required'));
        return;
      }

      const currentHour = new Date().getHours();
      const estimate = await estimateDeliveryTime({
        zone,
        deliveryType,
        currentHour,
        distanceKm: distanceKm !== undefined ? Number(distanceKm) : undefined,
      });

      res.json(successResponse(estimate));
    } catch (err) {
      logger.error('getDeliveryEstimate error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /ai/price-suggestion
   * Dynamic pricing recommendation for a zone.
   */
  async getPriceSuggestion(req: Request, res: Response): Promise<void> {
    try {
      const { zone } = req.query;

      if (!zone || typeof zone !== 'string') {
        res.status(400).json(errorResponse('Bad Request', 'zone query parameter is required'));
        return;
      }

      if (!isValidZone(zone)) {
        res.status(400).json(errorResponse('Bad Request', `Unknown zone: "${zone}"`));
        return;
      }

      const suggestion = await getDynamicPricingSuggestion(zone);
      res.json(successResponse(suggestion));
    } catch (err) {
      logger.error('getPriceSuggestion error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /ai/courier-recommendation
   * Get best courier recommendation for a delivery.
   */
  async getCourierRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const {
        pickupLat,
        pickupLng,
        deliveryType = DeliveryType.REGULAR,
        requiresCar = false,
      } = req.body;

      if (pickupLat === undefined || pickupLng === undefined) {
        res.status(400).json(errorResponse('Bad Request', 'pickupLat and pickupLng are required'));
        return;
      }

      const recommendation = await recommendBestCourier({
        pickupLat: Number(pickupLat),
        pickupLng: Number(pickupLng),
        deliveryType,
        requiresCar: Boolean(requiresCar),
      });

      if (!recommendation) {
        res.json(successResponse(null, 'No available couriers found'));
        return;
      }

      res.json(successResponse(recommendation));
    } catch (err) {
      logger.error('getCourierRecommendation error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /ai/demand-forecast
   * Predict busy times for a given hour.
   */
  async getDemandForecast(req: Request, res: Response): Promise<void> {
    try {
      const { hour } = req.query;

      const targetHour = hour !== undefined
        ? parseInt(String(hour), 10)
        : new Date().getHours();

      if (isNaN(targetHour) || targetHour < 0 || targetHour > 23) {
        res.status(400).json(errorResponse('Bad Request', 'hour must be an integer between 0 and 23'));
        return;
      }

      const forecast = await forecastDemand(targetHour);
      res.json(successResponse(forecast));
    } catch (err) {
      logger.error('getDemandForecast error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /ai/anomalies  (admin only)
   * Get report of suspicious users/deliveries.
   */
  async getAnomalyReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== UserRole.ADMIN) {
        res.status(403).json(errorResponse('Forbidden', 'Admin access only'));
        return;
      }

      const reports = await detectAnomalies();

      const summary = {
        total: reports.length,
        high: reports.filter((r) => r.severity === 'high').length,
        medium: reports.filter((r) => r.severity === 'medium').length,
        low: reports.filter((r) => r.severity === 'low').length,
        reports,
      };

      res.json(successResponse(summary));
    } catch (err) {
      logger.error('getAnomalyReport error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
