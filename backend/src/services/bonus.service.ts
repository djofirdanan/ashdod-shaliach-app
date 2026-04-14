// ============================================================
// אשדוד-שליח – Bonus Service
// ============================================================

import {
  BonusRule,
  BonusType,
  AppliedBonus,
  WeatherCondition,
  CourierEarnings,
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
  NIGHT_BONUS_START,
  NIGHT_BONUS_END,
  PEAK_MORNING_START,
  PEAK_MORNING_END,
  PEAK_EVENING_START,
  PEAK_EVENING_END,
  COLLECTION_BONUS_RULES,
  COLLECTION_DELIVERIES,
} from '../config/constants';
import { queryDocuments, updateDocument } from './firebase.service';
import { isNightHour, isPeakHour } from '../utils/helpers';
import NodeCache from 'node-cache';
import logger from '../utils/logger';

const rulesCache = new NodeCache({ stdTTL: 300 });

// ─────────────────────────────────────────
// Core bonus calculation
// ─────────────────────────────────────────

export interface BonusCalculationInput {
  hour?: number;
  weatherCondition?: WeatherCondition;
  isDangerousArea?: boolean;
  isUrgent?: boolean;
  activeDeliveriesInArea?: number;
  zone?: string;
}

export function calculateBonuses(input: BonusCalculationInput): AppliedBonus[] {
  const {
    hour = new Date().getHours(),
    weatherCondition = WeatherCondition.CLEAR,
    isDangerousArea = false,
    isUrgent = false,
    activeDeliveriesInArea = 0,
  } = input;

  const bonuses: AppliedBonus[] = [];

  // Weather bonuses (mutually exclusive – storm > rain)
  if (weatherCondition === WeatherCondition.STORM || weatherCondition === WeatherCondition.EXTREME) {
    bonuses.push({
      type: BonusType.WEATHER_STORM,
      amount: BONUS_STORM,
      reason: `בונוס סערה (+₪${BONUS_STORM})`,
    });
  } else if (weatherCondition === WeatherCondition.RAIN) {
    bonuses.push({
      type: BonusType.WEATHER_RAIN,
      amount: BONUS_RAIN,
      reason: `בונוס גשם (+₪${BONUS_RAIN})`,
    });
  }

  // Night bonus (22:00-06:00)
  if (isNightHour(hour)) {
    bonuses.push({
      type: BonusType.NIGHT,
      amount: BONUS_NIGHT,
      reason: `בונוס לילה ${NIGHT_BONUS_START}:00-0${NIGHT_BONUS_END}:00 (+₪${BONUS_NIGHT})`,
    });
  }

  // Peak hours bonus
  if (isPeakHour(hour)) {
    const window =
      hour >= PEAK_MORNING_START && hour < PEAK_MORNING_END
        ? `${PEAK_MORNING_START}:00-${PEAK_MORNING_END}:00`
        : `${PEAK_EVENING_START}:00-${PEAK_EVENING_END}:00`;
    bonuses.push({
      type: BonusType.PEAK_HOURS,
      amount: BONUS_PEAK_HOURS,
      reason: `בונוס שעות עומס ${window} (+₪${BONUS_PEAK_HOURS})`,
    });
  }

  // Dangerous area
  if (isDangerousArea) {
    bonuses.push({
      type: BonusType.DANGEROUS_AREA,
      amount: BONUS_DANGEROUS_AREA,
      reason: `בונוס אזור מסוכן (+₪${BONUS_DANGEROUS_AREA})`,
    });
  }

  // Urgent delivery
  if (isUrgent) {
    bonuses.push({
      type: BonusType.URGENT,
      amount: BONUS_URGENT,
      reason: `בונוס משלוח דחוף (+₪${BONUS_URGENT})`,
    });
  }

  // High load
  if (activeDeliveriesInArea >= HIGH_LOAD_THRESHOLD) {
    bonuses.push({
      type: BonusType.HIGH_LOAD,
      amount: BONUS_HIGH_LOAD,
      reason: `בונוס עומס גבוה (${activeDeliveriesInArea} משלוחים פעילים) (+₪${BONUS_HIGH_LOAD})`,
    });
  }

  return bonuses;
}

export function sumBonuses(bonuses: AppliedBonus[]): number {
  return bonuses.reduce((sum, b) => sum + b.amount, 0);
}

// ─────────────────────────────────────────
// Load rules from Firestore
// ─────────────────────────────────────────

export async function getActiveBonusRules(): Promise<BonusRule[]> {
  const cached = rulesCache.get<BonusRule[]>('active_rules');
  if (cached) return cached;

  try {
    const rules = await queryDocuments<BonusRule>(
      COLLECTION_BONUS_RULES,
      [{ field: 'isActive', op: '==', value: true }]
    );
    rulesCache.set('active_rules', rules);
    return rules;
  } catch (err) {
    logger.error('Failed to load bonus rules:', err);
    return [];
  }
}

// ─────────────────────────────────────────
// Courier earnings update
// ─────────────────────────────────────────

export async function creditCourierEarnings(
  courierId: string,
  amount: number,
  bonusAmount: number,
  currentEarnings: CourierEarnings
): Promise<CourierEarnings> {
  const updated: CourierEarnings = {
    today: currentEarnings.today + amount,
    thisWeek: currentEarnings.thisWeek + amount,
    thisMonth: currentEarnings.thisMonth + amount,
    total: currentEarnings.total + amount,
    bonusTotal: currentEarnings.bonusTotal + bonusAmount,
  };

  await updateDocument('users', courierId, { earnings: updated });
  return updated;
}

/**
 * Reset daily/weekly/monthly earnings according to period.
 * Call this from a scheduled job.
 */
export function resetEarningsPeriod(
  earnings: CourierEarnings,
  period: 'day' | 'week' | 'month'
): CourierEarnings {
  const copy = { ...earnings };
  if (period === 'day') copy.today = 0;
  if (period === 'week') { copy.today = 0; copy.thisWeek = 0; }
  if (period === 'month') { copy.today = 0; copy.thisWeek = 0; copy.thisMonth = 0; }
  return copy;
}

// ─────────────────────────────────────────
// Summary helper
// ─────────────────────────────────────────

export function buildBonusSummary(bonuses: AppliedBonus[]): string {
  if (bonuses.length === 0) return 'ללא בונוסים';
  return bonuses.map((b) => b.reason).join(' | ');
}
