// ============================================================
// אשדוד-שליח – Delivery Model helpers
// ============================================================

import {
  Delivery,
  DeliveryStatus,
  DeliveryType,
  Address,
  AppliedBonus,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export function createDelivery(params: {
  businessId: string;
  type: DeliveryType;
  pickupAddress: Address;
  dropoffAddress: Address;
  recipientName: string;
  recipientPhone: string;
  pricingZone: string;
  basePrice: number;
  bonuses: AppliedBonus[];
  totalPrice: number;
  isFragile?: boolean;
  requiresSignature?: boolean;
  packageDescription?: string;
  packageWeight?: number;
  notes?: string;
  estimatedDuration?: number;
}): Delivery {
  const now = new Date();
  return {
    id: uuidv4(),
    status: DeliveryStatus.PENDING,
    type: params.type,
    businessId: params.businessId,
    pickupAddress: params.pickupAddress,
    dropoffAddress: params.dropoffAddress,
    recipientName: params.recipientName,
    recipientPhone: params.recipientPhone,
    packageDescription: params.packageDescription,
    packageWeight: params.packageWeight,
    isFragile: params.isFragile ?? false,
    requiresSignature: params.requiresSignature ?? false,
    pricingZone: params.pricingZone,
    basePrice: params.basePrice,
    bonuses: params.bonuses,
    totalPrice: params.totalPrice,
    notes: params.notes,
    estimatedDuration: params.estimatedDuration,
    dispatchedTo: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Returns the allowed next statuses for a given current status.
 */
export function getAllowedNextStatuses(current: DeliveryStatus): DeliveryStatus[] {
  const transitions: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
    [DeliveryStatus.PENDING]: [DeliveryStatus.DISPATCHED, DeliveryStatus.CANCELLED],
    [DeliveryStatus.DISPATCHED]: [DeliveryStatus.ACCEPTED, DeliveryStatus.PENDING, DeliveryStatus.CANCELLED],
    [DeliveryStatus.ACCEPTED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
    [DeliveryStatus.PICKED_UP]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED],
    [DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
    [DeliveryStatus.DELIVERED]: [DeliveryStatus.CONFIRMED, DeliveryStatus.CANCELLED],
    [DeliveryStatus.CONFIRMED]: [],
    [DeliveryStatus.CANCELLED]: [],
  };
  return transitions[current] ?? [];
}

export function isValidStatusTransition(
  from: DeliveryStatus,
  to: DeliveryStatus
): boolean {
  return getAllowedNextStatuses(from).includes(to);
}

/**
 * Get timestamp field name for a given status.
 */
export function getStatusTimestampField(
  status: DeliveryStatus
): keyof Delivery | null {
  const map: Partial<Record<DeliveryStatus, keyof Delivery>> = {
    [DeliveryStatus.ACCEPTED]: 'acceptedAt',
    [DeliveryStatus.PICKED_UP]: 'pickedUpAt',
    [DeliveryStatus.DELIVERED]: 'deliveredAt',
    [DeliveryStatus.CONFIRMED]: 'confirmedAt',
    [DeliveryStatus.CANCELLED]: 'cancelledAt',
  };
  return map[status] ?? null;
}
