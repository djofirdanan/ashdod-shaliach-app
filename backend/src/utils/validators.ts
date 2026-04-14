// ============================================================
// אשדוד-שליח – Custom Validators
// ============================================================

import { body, param, query, ValidationChain } from 'express-validator';
import { VehicleType, DeliveryType, UserRole } from '../types';

// ─────────────────────────────────────────
// Phone validation (Israeli format)
// ─────────────────────────────────────────

export function isIsraeliPhone(value: string): boolean {
  return /^(05[0-9]|02|03|04|08|09)\d{7}$/.test(value.replace(/[-\s]/g, ''));
}

// ─────────────────────────────────────────
// Auth validators
// ─────────────────────────────────────────

export const validateRegister: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone')
    .notEmpty()
    .custom((val) => {
      if (!isIsraeliPhone(val)) throw new Error('Invalid Israeli phone number');
      return true;
    }),
  body('role')
    .isIn(Object.values(UserRole))
    .withMessage(`Role must be one of: ${Object.values(UserRole).join(', ')}`),
  body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
];

export const validateLogin: ValidationChain[] = [
  body('firebaseToken').notEmpty().withMessage('Firebase ID token is required'),
];

// ─────────────────────────────────────────
// Delivery validators
// ─────────────────────────────────────────

export const validateCreateDelivery: ValidationChain[] = [
  body('type')
    .isIn(Object.values(DeliveryType))
    .withMessage(`Delivery type must be one of: ${Object.values(DeliveryType).join(', ')}`),
  body('pickupAddress.street').notEmpty().withMessage('Pickup street is required'),
  body('pickupAddress.city').notEmpty().withMessage('Pickup city is required'),
  body('dropoffAddress.street').notEmpty().withMessage('Dropoff street is required'),
  body('dropoffAddress.city').notEmpty().withMessage('Dropoff city is required'),
  body('recipientName').notEmpty().withMessage('Recipient name is required'),
  body('recipientPhone')
    .notEmpty()
    .custom((val) => {
      if (!isIsraeliPhone(val)) throw new Error('Invalid recipient phone number');
      return true;
    }),
  body('pricingZone').notEmpty().withMessage('Pricing zone is required'),
  body('isFragile').isBoolean().withMessage('isFragile must be boolean'),
  body('requiresSignature').isBoolean().withMessage('requiresSignature must be boolean'),
  body('packageWeight').optional().isFloat({ min: 0.1, max: 100 }),
];

export const validateUpdateDeliveryStatus: ValidationChain[] = [
  param('id').notEmpty().withMessage('Delivery ID is required'),
  body('status').notEmpty().withMessage('Status is required'),
];

// ─────────────────────────────────────────
// Courier validators
// ─────────────────────────────────────────

export const validateUpdateLocation: ValidationChain[] = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
];

export const validateCourierProfile: ValidationChain[] = [
  body('vehicleType')
    .isIn(Object.values(VehicleType))
    .withMessage(`Vehicle type must be one of: ${Object.values(VehicleType).join(', ')}`),
  body('vehiclePlate').optional().isString().isLength({ max: 20 }),
];

// ─────────────────────────────────────────
// Rating validators
// ─────────────────────────────────────────

export const validateRating: ValidationChain[] = [
  param('deliveryId').notEmpty().withMessage('Delivery ID is required'),
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating score must be an integer between 1 and 5'),
  body('comment').optional().isString().isLength({ max: 500 }),
  body('tags').optional().isArray(),
];

// ─────────────────────────────────────────
// Chat validators
// ─────────────────────────────────────────

export const validateChatMessage: ValidationChain[] = [
  param('deliveryId').notEmpty().withMessage('Delivery ID is required'),
  body('content').notEmpty().withMessage('Message content is required').isLength({ max: 1000 }),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'location', 'system'])
    .withMessage('Invalid message type'),
];

// ─────────────────────────────────────────
// Pricing validators
// ─────────────────────────────────────────

export const validatePriceCalculation: ValidationChain[] = [
  body('zoneName').notEmpty().withMessage('Zone name is required'),
  body('deliveryType')
    .isIn(Object.values(DeliveryType))
    .withMessage('Valid delivery type required'),
  body('vehicleType')
    .isIn(Object.values(VehicleType))
    .withMessage('Valid vehicle type required'),
  body('hour').optional().isInt({ min: 0, max: 23 }),
];

export const validatePagination: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
