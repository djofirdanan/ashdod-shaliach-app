// ============================================================
// אשדוד-שליח – Pricing Service
// Full pricing logic with all zones & bonuses
// ============================================================

import {
  PricingZone,
  PriceCalculationInput,
  PriceCalculationResult,
  AppliedBonus,
  BonusType,
  DeliveryType,
  VehicleType,
  WeatherCondition,
} from '../types';
import {
  BONUS_RAIN,
  BONUS_STORM,
  BONUS_NIGHT,
  BONUS_PEAK_HOURS,
  BONUS_DANGEROUS_AREA,
  BONUS_URGENT,
  BONUS_HIGH_LOAD,
  HIGH_LOAD_THRESHOLD,
  COLLECTION_PRICING_ZONES,
} from '../config/constants';
import { isNightHour, isPeakHour } from '../utils/helpers';
import { queryDocuments } from './firebase.service';
import NodeCache from 'node-cache';
import logger from '../utils/logger';

// ─────────────────────────────────────────
// Zone data (hard-coded mirror of DB seed for fast in-process access)
// ─────────────────────────────────────────

const ZONE_MAP: Record<string, { basePrice: number; carOnlyPrice?: number; requiresCar: boolean }> = {
  'אשדוד (בעיר)':                    { basePrice: 25,  requiresCar: false },
  'משלוח לרכב בלבד':                 { basePrice: 30,  requiresCar: true  },
  'א.ת צפונית':                       { basePrice: 35,  carOnlyPrice: 45, requiresCar: false },
  'ניר גלים':                         { basePrice: 35,  requiresCar: false },
  'בני דרום':                         { basePrice: 40,  requiresCar: false },
  'שתולים':                           { basePrice: 40,  requiresCar: false },
  'שדה עוזיהו':                       { basePrice: 40,  requiresCar: false },
  'עד הלום':                          { basePrice: 40,  requiresCar: false },
  'עזריקים':                          { basePrice: 45,  requiresCar: false },
  'עזר':                              { basePrice: 45,  requiresCar: false },
  'אמונים':                           { basePrice: 45,  requiresCar: false },
  'בית עזרא':                         { basePrice: 45,  requiresCar: false },
  'גן יבנה':                          { basePrice: 45,  requiresCar: false },
  'גן הדרום':                         { basePrice: 45,  requiresCar: false },
  'גבעת ושינגטון':                    { basePrice: 70,  requiresCar: false },
  'באר גנים':                         { basePrice: 100, requiresCar: false },
  'חצור (כולל בסיס)':                 { basePrice: 60,  requiresCar: false },
  'חצב':                              { basePrice: 70,  requiresCar: false },
  'בני עי"ש':                         { basePrice: 80,  requiresCar: false },
  'יבנה':                             { basePrice: 100, requiresCar: false },
  'בן זכאי':                          { basePrice: 100, requiresCar: false },
  'ניצן':                             { basePrice: 100, requiresCar: false },
  'אשקלון':                           { basePrice: 120, requiresCar: false },
  'קריית מלאכי / באר טוביה':          { basePrice: 100, requiresCar: false },
  'שדרות':                            { basePrice: 170, requiresCar: false },
  'קריית גת':                         { basePrice: 180, requiresCar: false },
  'באר שבע':                          { basePrice: 350, requiresCar: false },
  'נתיבות':                           { basePrice: 260, requiresCar: false },
  'דימונה / ירוחם / עד ערד':          { basePrice: 400, requiresCar: false },
};

// ─────────────────────────────────────────
// Cache
// ─────────────────────────────────────────

const zoneCache = new NodeCache({ stdTTL: 300 }); // 5 min

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

/**
 * Calculate total delivery price including all applicable bonuses.
 */
export function calculatePrice(input: PriceCalculationInput): PriceCalculationResult {
  const {
    zoneName,
    deliveryType,
    vehicleType,
    isUrgent = false,
    isDangerousArea = false,
    hour = new Date().getHours(),
    weatherCondition = WeatherCondition.CLEAR,
    activeDeliveriesInArea = 0,
  } = input;

  const zoneData = ZONE_MAP[zoneName];
  if (!zoneData) {
    throw new Error(`Unknown pricing zone: "${zoneName}"`);
  }

  // Base price: use carOnlyPrice when vehicle is car and carOnlyPrice exists
  let basePrice = zoneData.basePrice;
  const breakdown: string[] = [`אזור: ${zoneName} – ₪${basePrice}`];

  if (
    zoneData.carOnlyPrice &&
    (vehicleType === VehicleType.CAR)
  ) {
    basePrice = zoneData.carOnlyPrice;
    breakdown[0] = `אזור: ${zoneName} (רכב) – ₪${basePrice}`;
  }

  // Delivery type multipliers
  let typeMultiplier = 1;
  if (deliveryType === DeliveryType.EXPRESS) {
    typeMultiplier = 1.3;
    breakdown.push(`משלוח אקספרס ×1.3`);
  } else if (deliveryType === DeliveryType.FRAGILE) {
    typeMultiplier = 1.2;
    breakdown.push(`משלוח שביר ×1.2`);
  } else if (deliveryType === DeliveryType.VIP) {
    typeMultiplier = 1.5;
    breakdown.push(`משלוח VIP ×1.5`);
  }

  const adjustedBase = Math.round(basePrice * typeMultiplier);
  if (typeMultiplier !== 1) {
    breakdown.push(`מחיר לאחר תוספת סוג: ₪${adjustedBase}`);
  }

  // Bonuses
  const bonuses: AppliedBonus[] = [];

  // Weather bonuses
  if (weatherCondition === WeatherCondition.STORM) {
    bonuses.push({ type: BonusType.WEATHER_STORM, amount: BONUS_STORM, reason: 'מזג אוויר: סערה' });
    breakdown.push(`בונוס סערה: +₪${BONUS_STORM}`);
  } else if (weatherCondition === WeatherCondition.RAIN) {
    bonuses.push({ type: BonusType.WEATHER_RAIN, amount: BONUS_RAIN, reason: 'מזג אוויר: גשם' });
    breakdown.push(`בונוס גשם: +₪${BONUS_RAIN}`);
  }

  // Night bonus
  if (isNightHour(hour)) {
    bonuses.push({ type: BonusType.NIGHT, amount: BONUS_NIGHT, reason: 'שעות לילה (22:00–06:00)' });
    breakdown.push(`בונוס לילה: +₪${BONUS_NIGHT}`);
  }

  // Peak hours bonus
  if (isPeakHour(hour)) {
    bonuses.push({ type: BonusType.PEAK_HOURS, amount: BONUS_PEAK_HOURS, reason: 'שעות עומס' });
    breakdown.push(`בונוס שעות עומס: +₪${BONUS_PEAK_HOURS}`);
  }

  // Dangerous area bonus
  if (isDangerousArea) {
    bonuses.push({ type: BonusType.DANGEROUS_AREA, amount: BONUS_DANGEROUS_AREA, reason: 'אזור מסוכן' });
    breakdown.push(`בונוס אזור מסוכן: +₪${BONUS_DANGEROUS_AREA}`);
  }

  // Urgent bonus
  if (isUrgent || deliveryType === DeliveryType.EXPRESS) {
    bonuses.push({ type: BonusType.URGENT, amount: BONUS_URGENT, reason: 'משלוח דחוף' });
    breakdown.push(`בונוס דחיפות: +₪${BONUS_URGENT}`);
  }

  // High load bonus
  if (activeDeliveriesInArea >= HIGH_LOAD_THRESHOLD) {
    bonuses.push({ type: BonusType.HIGH_LOAD, amount: BONUS_HIGH_LOAD, reason: 'עומס גבוה באזור' });
    breakdown.push(`בונוס עומס: +₪${BONUS_HIGH_LOAD}`);
  }

  const bonusTotal = bonuses.reduce((sum, b) => sum + b.amount, 0);
  const totalPrice = adjustedBase + bonusTotal;
  breakdown.push(`סה"כ: ₪${totalPrice}`);

  return {
    basePrice: adjustedBase,
    bonuses,
    totalPrice,
    zoneName,
    breakdown,
  };
}

/**
 * Get the base price for a zone without bonuses.
 */
export function getZoneBasePrice(
  zoneName: string,
  vehicleType?: VehicleType
): number {
  const zoneData = ZONE_MAP[zoneName];
  if (!zoneData) throw new Error(`Unknown pricing zone: "${zoneName}"`);

  if (zoneData.carOnlyPrice && vehicleType === VehicleType.CAR) {
    return zoneData.carOnlyPrice;
  }
  return zoneData.basePrice;
}

/**
 * List all available zones (from in-memory map).
 */
export function listAllZones(): Array<{
  name: string;
  basePrice: number;
  carOnlyPrice?: number;
  requiresCar: boolean;
}> {
  return Object.entries(ZONE_MAP).map(([name, data]) => ({
    name,
    ...data,
  }));
}

/**
 * Load zones from Firestore (with cache).
 */
export async function getZonesFromDb(): Promise<PricingZone[]> {
  const cached = zoneCache.get<PricingZone[]>('all_zones');
  if (cached) return cached;

  try {
    const zones = await queryDocuments<PricingZone>(
      COLLECTION_PRICING_ZONES,
      [{ field: 'isActive', op: '==', value: true }],
      { field: 'basePrice', direction: 'asc' }
    );
    zoneCache.set('all_zones', zones);
    return zones;
  } catch (err) {
    logger.error('Failed to load zones from DB, using in-memory map:', err);
    return listAllZones().map((z, i) => ({
      id: String(i),
      name: z.name,
      basePrice: z.basePrice,
      carOnlyPrice: z.carOnlyPrice,
      requiresCar: z.requiresCar,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}

/**
 * Dynamic pricing suggestion: suggest a price multiplier based on demand.
 */
export function suggestDynamicMultiplier(activeDeliveries: number, availableCouriers: number): number {
  if (availableCouriers === 0) return 1.5; // no couriers – premium
  const ratio = activeDeliveries / availableCouriers;
  if (ratio > 3) return 1.4;
  if (ratio > 2) return 1.25;
  if (ratio > 1.5) return 1.15;
  return 1.0;
}

/**
 * Validate that a zone name exists.
 */
export function isValidZone(zoneName: string): boolean {
  return zoneName in ZONE_MAP;
}
