// ============================================================
// אשדוד-שליח – Database / Firestore helpers & seed logic
// ============================================================

import { getDb } from './firebase';
import {
  COLLECTION_PRICING_ZONES,
  COLLECTION_BONUS_RULES,
} from './constants';
import { BonusType, WeatherCondition } from '../types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────
// Pricing Zone seed data
// ─────────────────────────────────────────

const DEFAULT_PRICING_ZONES = [
  { name: 'אשדוד (בעיר)', basePrice: 25, requiresCar: false },
  { name: 'משלוח לרכב בלבד', basePrice: 30, requiresCar: true },
  { name: 'א.ת צפונית', basePrice: 35, carOnlyPrice: 45, requiresCar: false },
  { name: 'ניר גלים', basePrice: 35, requiresCar: false },
  { name: 'בני דרום', basePrice: 40, requiresCar: false },
  { name: 'שתולים', basePrice: 40, requiresCar: false },
  { name: 'שדה עוזיהו', basePrice: 40, requiresCar: false },
  { name: 'עד הלום', basePrice: 40, requiresCar: false },
  { name: 'עזריקים', basePrice: 45, requiresCar: false },
  { name: 'עזר', basePrice: 45, requiresCar: false },
  { name: 'אמונים', basePrice: 45, requiresCar: false },
  { name: 'בית עזרא', basePrice: 45, requiresCar: false },
  { name: 'גן יבנה', basePrice: 45, requiresCar: false },
  { name: 'גן הדרום', basePrice: 45, requiresCar: false },
  { name: 'גבעת ושינגטון', basePrice: 70, requiresCar: false },
  { name: 'באר גנים', basePrice: 100, requiresCar: false },
  { name: 'חצור (כולל בסיס)', basePrice: 60, requiresCar: false },
  { name: 'חצב', basePrice: 70, requiresCar: false },
  { name: 'בני עי"ש', basePrice: 80, requiresCar: false },
  { name: 'יבנה', basePrice: 100, requiresCar: false },
  { name: 'בן זכאי', basePrice: 100, requiresCar: false },
  { name: 'ניצן', basePrice: 100, requiresCar: false },
  { name: 'אשקלון', basePrice: 120, requiresCar: false },
  { name: 'קריית מלאכי / באר טוביה', basePrice: 100, requiresCar: false },
  { name: 'שדרות', basePrice: 170, requiresCar: false },
  { name: 'קריית גת', basePrice: 180, requiresCar: false },
  { name: 'באר שבע', basePrice: 350, requiresCar: false },
  { name: 'נתיבות', basePrice: 260, requiresCar: false },
  { name: 'דימונה / ירוחם / עד ערד', basePrice: 400, requiresCar: false },
];

const DEFAULT_BONUS_RULES = [
  {
    type: BonusType.WEATHER_RAIN,
    name: 'בונוס גשם',
    description: 'תוספת בגין מזג אוויר גשום',
    amount: 15,
    conditions: { weatherCondition: WeatherCondition.RAIN },
  },
  {
    type: BonusType.WEATHER_STORM,
    name: 'בונוס סערה',
    description: 'תוספת בגין סערה',
    amount: 30,
    conditions: { weatherCondition: WeatherCondition.STORM },
  },
  {
    type: BonusType.NIGHT,
    name: 'בונוס לילה',
    description: 'תוספת בגין עבודה בשעות הלילה (22:00–06:00)',
    amount: 20,
    conditions: { startHour: 22, endHour: 6 },
  },
  {
    type: BonusType.PEAK_HOURS,
    name: 'בונוס שעות עומס',
    description: 'תוספת בגין שעות עומס (12:00–14:00, 19:00–21:00)',
    amount: 10,
    conditions: { startHour: 12, endHour: 21 },
  },
  {
    type: BonusType.DANGEROUS_AREA,
    name: 'בונוס אזור מסוכן',
    description: 'תוספת בגין משלוח לאזור מסוכן',
    amount: 25,
    conditions: {},
  },
  {
    type: BonusType.URGENT,
    name: 'בונוס דחוף',
    description: 'תוספת בגין משלוח דחוף',
    amount: 20,
    conditions: {},
  },
  {
    type: BonusType.HIGH_LOAD,
    name: 'בונוס עומס גבוה',
    description: 'תוספת כאשר יש יותר מ-10 משלוחים פעילים באזור',
    amount: 15,
    conditions: { minActiveDeliveries: 10 },
  },
];

// ─────────────────────────────────────────
// Seed functions
// ─────────────────────────────────────────

export async function seedPricingZones(): Promise<void> {
  const db = getDb();
  const collection = db.collection(COLLECTION_PRICING_ZONES);
  const snapshot = await collection.limit(1).get();

  if (!snapshot.empty) {
    logger.info('Pricing zones already seeded – skipping.');
    return;
  }

  const batch = db.batch();
  const now = new Date();

  for (const zone of DEFAULT_PRICING_ZONES) {
    const ref = collection.doc(uuidv4());
    batch.set(ref, {
      id: ref.id,
      ...zone,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  logger.info(`Seeded ${DEFAULT_PRICING_ZONES.length} pricing zones.`);
}

export async function seedBonusRules(): Promise<void> {
  const db = getDb();
  const collection = db.collection(COLLECTION_BONUS_RULES);
  const snapshot = await collection.limit(1).get();

  if (!snapshot.empty) {
    logger.info('Bonus rules already seeded – skipping.');
    return;
  }

  const batch = db.batch();
  const now = new Date();

  for (const rule of DEFAULT_BONUS_RULES) {
    const ref = collection.doc(uuidv4());
    batch.set(ref, {
      id: ref.id,
      ...rule,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  logger.info(`Seeded ${DEFAULT_BONUS_RULES.length} bonus rules.`);
}

export async function runDatabaseSetup(): Promise<void> {
  try {
    await seedPricingZones();
    await seedBonusRules();
    logger.info('Database setup complete.');
  } catch (err) {
    logger.error('Database setup failed:', err);
    throw err;
  }
}
