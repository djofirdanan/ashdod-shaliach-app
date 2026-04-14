// ============================================================
// אשדוד-שליח – AI Service
// Delivery time estimation, dynamic pricing, demand forecasting,
// courier recommendation, anomaly detection
// ============================================================

import {
  DeliveryTimeEstimate,
  DemandForecast,
  AnomalyReport,
  AnomalyType,
  Delivery,
  Courier,
  DeliveryStatus,
  UserRole,
  DeliveryType,
  VehicleType,
} from '../types';
import {
  COLLECTION_DELIVERIES,
  COLLECTION_USERS,
} from '../config/constants';
import { queryDocuments } from './firebase.service';
import { suggestDynamicMultiplier } from './pricing.service';
import { haversineDistance } from '../utils/helpers';
import NodeCache from 'node-cache';
import logger from '../utils/logger';

const aiCache = new NodeCache({ stdTTL: 600 }); // 10 min

// ─────────────────────────────────────────
// Delivery Time Estimation
// ─────────────────────────────────────────

/**
 * Estimate delivery duration using historical data + heuristics.
 */
export async function estimateDeliveryTime(params: {
  zone: string;
  deliveryType: DeliveryType;
  currentHour?: number;
  distanceKm?: number;
}): Promise<DeliveryTimeEstimate> {
  const { zone, deliveryType, currentHour = new Date().getHours(), distanceKm } = params;

  const cacheKey = `eta_${zone}_${deliveryType}_${currentHour}`;
  const cached = aiCache.get<DeliveryTimeEstimate>(cacheKey);
  if (cached) return cached;

  // Base time from historical deliveries for this zone
  let baseMinutes = 30;
  const factors: string[] = [];

  // Zone distance heuristic (zones further away take longer)
  const zoneTimes: Record<string, number> = {
    'אשדוד (בעיר)': 20,
    'ניר גלים': 25,
    'בני דרום': 30,
    'גן יבנה': 35,
    'יבנה': 50,
    'אשקלון': 70,
    'שדרות': 90,
    'קריית גת': 100,
    'באר שבע': 180,
    'נתיבות': 140,
    'דימונה / ירוחם / עד ערד': 220,
  };

  baseMinutes = zoneTimes[zone] ?? 30;
  factors.push(`אזור: ${zone}`);

  // Delivery type modifier
  if (deliveryType === DeliveryType.EXPRESS) {
    baseMinutes = Math.round(baseMinutes * 0.75);
    factors.push('אקספרס: זמן מופחת 25%');
  } else if (deliveryType === DeliveryType.FRAGILE) {
    baseMinutes = Math.round(baseMinutes * 1.1);
    factors.push('שביר: זמן נוסף 10%');
  }

  // Traffic heuristic by hour
  if (currentHour >= 7 && currentHour <= 9) {
    baseMinutes = Math.round(baseMinutes * 1.3);
    factors.push('פקק בוקר: +30%');
  } else if (currentHour >= 12 && currentHour <= 14) {
    baseMinutes = Math.round(baseMinutes * 1.2);
    factors.push('שעות עומס צהריים: +20%');
  } else if (currentHour >= 17 && currentHour <= 19) {
    baseMinutes = Math.round(baseMinutes * 1.35);
    factors.push('פקק ערב: +35%');
  }

  // Distance override if provided
  if (distanceKm !== undefined) {
    const distanceBased = Math.ceil(distanceKm * 2.5); // 2.5 min/km
    baseMinutes = Math.max(baseMinutes, distanceBased);
    factors.push(`מרחק: ${distanceKm.toFixed(1)} ק"מ`);
  }

  // Get historical average from DB (sample of recent deliveries)
  try {
    const recentDeliveries = await queryDocuments<Delivery>(COLLECTION_DELIVERIES, [
      { field: 'pricingZone', op: '==', value: zone },
      { field: 'status', op: '==', value: DeliveryStatus.CONFIRMED },
    ], { field: 'deliveredAt', direction: 'desc' }, 20);

    const withDuration = recentDeliveries.filter((d) => d.actualDuration && d.actualDuration > 0);
    if (withDuration.length >= 5) {
      const avgActual =
        withDuration.reduce((sum, d) => sum + (d.actualDuration ?? 0), 0) / withDuration.length;
      // Blend: 60% historical, 40% heuristic
      baseMinutes = Math.round(avgActual * 0.6 + baseMinutes * 0.4);
      factors.push(`ממוצע היסטורי: ${Math.round(avgActual)} דק' (${withDuration.length} משלוחים)`);
    }
  } catch (err) {
    logger.warn('Could not fetch historical delivery times:', err);
  }

  const estimate: DeliveryTimeEstimate = {
    zone,
    estimatedMinutes: baseMinutes,
    confidence: distanceKm !== undefined ? 0.8 : 0.65,
    factors,
  };

  aiCache.set(cacheKey, estimate);
  return estimate;
}

// ─────────────────────────────────────────
// Dynamic Pricing Suggestion
// ─────────────────────────────────────────

export async function getDynamicPricingSuggestion(zone: string): Promise<{
  multiplier: number;
  reason: string;
  activeDeliveries: number;
  availableCouriers: number;
}> {
  const [deliveries, couriers] = await Promise.all([
    queryDocuments<Delivery>(COLLECTION_DELIVERIES, [
      { field: 'pricingZone', op: '==', value: zone },
      { field: 'status', op: 'in', value: [DeliveryStatus.PENDING, DeliveryStatus.DISPATCHED, DeliveryStatus.ACCEPTED, DeliveryStatus.IN_TRANSIT] },
    ]),
    queryDocuments<Courier>(COLLECTION_USERS, [
      { field: 'role', op: '==', value: UserRole.COURIER },
      { field: 'isAvailable', op: '==', value: true },
      { field: 'isOnDuty', op: '==', value: true },
    ]),
  ]);

  const activeDeliveries = deliveries.length;
  const availableCouriers = couriers.length;
  const multiplier = suggestDynamicMultiplier(activeDeliveries, availableCouriers);

  let reason = 'מחיר רגיל';
  if (multiplier >= 1.4) reason = 'ביקוש גבוה מאוד – מחיר מוגבר';
  else if (multiplier >= 1.25) reason = 'ביקוש גבוה – מחיר מוגבר מעט';
  else if (multiplier >= 1.15) reason = 'ביקוש מוגבר';

  return { multiplier, reason, activeDeliveries, availableCouriers };
}

// ─────────────────────────────────────────
// Courier Recommendation
// ─────────────────────────────────────────

export async function recommendBestCourier(params: {
  pickupLat: number;
  pickupLng: number;
  deliveryType: DeliveryType;
  requiresCar: boolean;
}): Promise<{ courierId: string; reason: string } | null> {
  const couriers = await queryDocuments<Courier>(COLLECTION_USERS, [
    { field: 'role', op: '==', value: UserRole.COURIER },
    { field: 'isAvailable', op: '==', value: true },
    { field: 'isOnDuty', op: '==', value: true },
  ]);

  if (couriers.length === 0) return null;

  const pickupPoint = { latitude: params.pickupLat, longitude: params.pickupLng };

  let bestCourier: Courier | null = null;
  let bestScore = -1;
  let bestReason = '';

  for (const courier of couriers) {
    if (params.requiresCar && courier.vehicleType !== VehicleType.CAR) continue;
    if (!courier.currentLocation) continue;

    const distance = haversineDistance(courier.currentLocation, pickupPoint);
    if (distance > 15) continue; // too far

    const distanceScore = Math.max(0, 1 - distance / 15);
    const ratingScore = (courier.rating ?? 0) / 5;
    const loadScore = Math.max(0, 1 - (courier.activeDeliveries?.length ?? 0) / 5);
    const completedScore = Math.min(1, (courier.completedDeliveries ?? 0) / 100);

    const score = distanceScore * 0.35 + ratingScore * 0.35 + loadScore * 0.2 + completedScore * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestCourier = courier;
      bestReason = `מרחק: ${distance.toFixed(1)} ק"מ, דירוג: ${courier.rating?.toFixed(1)}, ניסיון: ${courier.completedDeliveries} משלוחים`;
    }
  }

  if (!bestCourier) return null;
  return { courierId: bestCourier.id, reason: bestReason };
}

// ─────────────────────────────────────────
// Demand Forecasting
// ─────────────────────────────────────────

export async function forecastDemand(targetHour: number): Promise<DemandForecast> {
  const cacheKey = `forecast_${targetHour}`;
  const cached = aiCache.get<DemandForecast>(cacheKey);
  if (cached) return cached;

  // Fetch deliveries from past 4 weeks for same hour
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  let recentDeliveries: Delivery[] = [];
  try {
    recentDeliveries = await queryDocuments<Delivery>(COLLECTION_DELIVERIES, [
      { field: 'createdAt', op: '>=', value: fourWeeksAgo },
    ], { field: 'createdAt', direction: 'desc' }, 500);
  } catch (err) {
    logger.warn('Could not fetch deliveries for forecast:', err);
  }

  // Filter by similar hour (±1 hour)
  const samePeriod = recentDeliveries.filter((d) => {
    const h = new Date(d.createdAt).getHours();
    return Math.abs(h - targetHour) <= 1;
  });

  const avgPerHour = samePeriod.length > 0 ? Math.round(samePeriod.length / 28) : 5;

  // Zone breakdown
  const zoneMap: Record<string, number> = {};
  for (const d of samePeriod) {
    zoneMap[d.pricingZone] = (zoneMap[d.pricingZone] ?? 0) + 1;
  }
  const zones = Object.entries(zoneMap)
    .map(([zone, count]) => ({ zone, demand: Math.round(count / 28) }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 10);

  // Peak hours need more couriers
  const isPeak = (targetHour >= 12 && targetHour < 14) || (targetHour >= 19 && targetHour < 21);
  const recommendedCouriers = Math.max(2, Math.ceil(avgPerHour * (isPeak ? 1.5 : 1.0)));

  const forecast: DemandForecast = {
    hour: targetHour,
    expectedDeliveries: avgPerHour,
    recommendedCouriers,
    zones,
  };

  aiCache.set(cacheKey, forecast, 1800); // cache 30 min
  return forecast;
}

// ─────────────────────────────────────────
// Anomaly Detection
// ─────────────────────────────────────────

export async function detectAnomalies(): Promise<AnomalyReport[]> {
  const reports: AnomalyReport[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let deliveries: Delivery[] = [];
  try {
    deliveries = await queryDocuments<Delivery>(COLLECTION_DELIVERIES, [
      { field: 'createdAt', op: '>=', value: thirtyDaysAgo },
    ], undefined, 2000);
  } catch (err) {
    logger.error('Anomaly detection: failed to fetch deliveries:', err);
    return reports;
  }

  // Group by courier
  const courierStats: Record<string, { total: number; cancelled: number }> = {};
  const businessStats: Record<string, { total: number; cancelled: number }> = {};

  for (const delivery of deliveries) {
    // Courier stats
    if (delivery.courierId) {
      if (!courierStats[delivery.courierId]) {
        courierStats[delivery.courierId] = { total: 0, cancelled: 0 };
      }
      courierStats[delivery.courierId].total++;
      if (delivery.status === DeliveryStatus.CANCELLED) {
        courierStats[delivery.courierId].cancelled++;
      }
    }

    // Business stats
    if (!businessStats[delivery.businessId]) {
      businessStats[delivery.businessId] = { total: 0, cancelled: 0 };
    }
    businessStats[delivery.businessId].total++;
    if (delivery.status === DeliveryStatus.CANCELLED) {
      businessStats[delivery.businessId].cancelled++;
    }
  }

  // Check couriers
  for (const [courierId, stats] of Object.entries(courierStats)) {
    if (stats.total < 5) continue;
    const cancelRate = stats.cancelled / stats.total;
    if (cancelRate > 0.3) {
      reports.push({
        userId: courierId,
        userRole: UserRole.COURIER,
        anomalyType: AnomalyType.HIGH_CANCELLATION_RATE,
        severity: cancelRate > 0.5 ? 'high' : 'medium',
        description: `שיעור ביטול גבוה: ${(cancelRate * 100).toFixed(0)}% (${stats.cancelled}/${stats.total})`,
        detectedAt: now,
      });
    }
  }

  // Check businesses
  for (const [businessId, stats] of Object.entries(businessStats)) {
    if (stats.total < 5) continue;
    const cancelRate = stats.cancelled / stats.total;
    if (cancelRate > 0.4) {
      reports.push({
        userId: businessId,
        userRole: UserRole.BUSINESS,
        anomalyType: AnomalyType.HIGH_CANCELLATION_RATE,
        severity: cancelRate > 0.6 ? 'high' : 'medium',
        description: `עסק עם שיעור ביטול גבוה: ${(cancelRate * 100).toFixed(0)}% (${stats.cancelled}/${stats.total})`,
        detectedAt: now,
      });
    }
  }

  // Check low-rated couriers from ratings collection
  try {
    const couriers = await queryDocuments<Courier>(COLLECTION_USERS, [
      { field: 'role', op: '==', value: UserRole.COURIER },
      { field: 'rating', op: '<', value: 3 },
      { field: 'ratingCount', op: '>=', value: 10 },
    ]);

    for (const courier of couriers) {
      reports.push({
        userId: courier.id,
        userRole: UserRole.COURIER,
        anomalyType: AnomalyType.LOW_RATING,
        severity: courier.rating < 2 ? 'high' : 'medium',
        description: `דירוג נמוך: ${courier.rating?.toFixed(1)} (מתוך ${courier.ratingCount} דירוגים)`,
        detectedAt: now,
      });
    }
  } catch (err) {
    logger.warn('Could not check courier ratings for anomalies:', err);
  }

  logger.info(`Anomaly detection complete: found ${reports.length} anomalies`);
  return reports;
}

// ─────────────────────────────────────────
// Delivery Route Optimization (simple greedy)
// ─────────────────────────────────────────

export function optimizeDeliveryOrder(
  courierLocation: { latitude: number; longitude: number },
  deliveries: Array<{ id: string; pickupLocation: { latitude: number; longitude: number } }>
): string[] {
  // Greedy nearest-neighbour
  const remaining = [...deliveries];
  const order: string[] = [];
  let current = courierLocation;

  while (remaining.length > 0) {
    let nearest = 0;
    let minDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(current, remaining[i].pickupLocation);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    const picked = remaining.splice(nearest, 1)[0];
    order.push(picked.id);
    current = picked.pickupLocation;
  }

  return order;
}
