// ============================================================
// אשדוד-שליח – Dispatch Service
// Smart courier assignment with scoring algorithm
// ============================================================

import { Server as SocketServer } from 'socket.io';
import {
  Courier,
  Delivery,
  DeliveryStatus,
  VehicleType,
  CourierScore,
  DispatchResult,
  GeoPoint,
} from '../types';
import {
  DISPATCH_TIMEOUT_SECONDS,
  MAX_DISPATCH_COURIERS,
  DISPATCH_RADIUS_KM,
  DISPATCH_WEIGHT_DISTANCE,
  DISPATCH_WEIGHT_RATING,
  DISPATCH_WEIGHT_LOAD,
  DISPATCH_WEIGHT_VEHICLE,
  SOCKET_EVENT_DELIVERY_OFFER,
  SOCKET_EVENT_DISPATCH_EXPIRED,
  COLLECTION_DELIVERIES,
  COLLECTION_USERS,
} from '../config/constants';
import { queryDocuments, updateDocument, getCourierLocation } from './firebase.service';
import { haversineDistance } from '../utils/helpers';
import { UserRole } from '../types';
import logger from '../utils/logger';

// Map: deliveryId → timeout handle (for auto-reassign)
const dispatchTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Socket.io instance (set via setSocketServer)
let io: SocketServer | null = null;

export function setSocketServer(socketServer: SocketServer): void {
  io = socketServer;
}

// ─────────────────────────────────────────
// Vehicle type scoring
// ─────────────────────────────────────────

/**
 * Returns a 0-1 score based on vehicle suitability for the delivery.
 * Higher = better.
 */
function vehicleScore(vehicleType: VehicleType, deliveryRequiresCar: boolean): number {
  if (deliveryRequiresCar) {
    return vehicleType === VehicleType.CAR ? 1.0 : 0.2;
  }
  // For non-car-required deliveries, all vehicles are ok, but cars get slight penalty
  // (they're less maneuverable in city)
  const scores: Record<VehicleType, number> = {
    [VehicleType.MOTORCYCLE]: 1.0,
    [VehicleType.SCOOTER]: 0.95,
    [VehicleType.BIKE]: 0.85,
    [VehicleType.CAR]: 0.9,
  };
  return scores[vehicleType] ?? 0.5;
}

// ─────────────────────────────────────────
// Courier scoring
// ─────────────────────────────────────────

/**
 * Score a single courier for a given delivery.
 * Returns 0-100 (higher = better).
 */
function scoreCourier(
  courier: Courier,
  courierLocation: GeoPoint,
  pickupLocation: GeoPoint,
  requiresCar: boolean
): CourierScore {
  const distanceKm = haversineDistance(courierLocation, pickupLocation);

  // Normalize distance: full score at 0 km, 0 at DISPATCH_RADIUS_KM+
  const normalizedDistance = Math.max(0, 1 - distanceKm / DISPATCH_RADIUS_KM);

  // Rating: courier.rating is 0-5, normalize to 0-1
  const normalizedRating = (courier.rating ?? 0) / 5;

  // Load penalty: fewer active deliveries = better; normalize max at 5
  const normalizedLoad = Math.max(0, 1 - (courier.activeDeliveries?.length ?? 0) / 5);

  // Vehicle suitability
  const vScore = vehicleScore(courier.vehicleType, requiresCar);

  const totalScore =
    normalizedDistance * DISPATCH_WEIGHT_DISTANCE +
    normalizedRating * DISPATCH_WEIGHT_RATING +
    normalizedLoad * DISPATCH_WEIGHT_LOAD +
    vScore * DISPATCH_WEIGHT_VEHICLE;

  return {
    courierId: courier.id,
    score: Math.round(totalScore * 100) / 100,
    distanceKm: Math.round(distanceKm * 100) / 100,
    rating: courier.rating ?? 0,
    activeDeliveries: courier.activeDeliveries?.length ?? 0,
    vehicleScore: vScore,
  };
}

// ─────────────────────────────────────────
// Find eligible couriers
// ─────────────────────────────────────────

async function findEligibleCouriers(
  pickupLocation: GeoPoint,
  requiresCar: boolean,
  excludeIds: string[] = []
): Promise<Array<{ courier: Courier; score: CourierScore }>> {
  // Get available couriers
  const availableCouriers = await queryDocuments<Courier>(COLLECTION_USERS, [
    { field: 'role', op: '==', value: UserRole.COURIER },
    { field: 'isAvailable', op: '==', value: true },
    { field: 'isOnDuty', op: '==', value: true },
    { field: 'isActive', op: '==', value: true },
  ]);

  const results: Array<{ courier: Courier; score: CourierScore }> = [];

  for (const courier of availableCouriers) {
    if (excludeIds.includes(courier.id)) continue;

    // requiresCar filter
    if (requiresCar && courier.vehicleType !== VehicleType.CAR) continue;

    // Get courier's current location
    const location = await getCourierLocation(courier.id);
    if (!location) continue;

    // Within radius check
    const distance = haversineDistance(location, pickupLocation);
    if (distance > DISPATCH_RADIUS_KM) continue;

    const score = scoreCourier(courier, location, pickupLocation, requiresCar);
    results.push({ courier, score });
  }

  // Sort by score descending
  results.sort((a, b) => b.score.score - a.score.score);

  return results.slice(0, MAX_DISPATCH_COURIERS);
}

// ─────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────

export async function dispatchDelivery(
  delivery: Delivery,
  pickupLocation: GeoPoint,
  requiresCar = false
): Promise<DispatchResult> {
  logger.info(`Dispatching delivery ${delivery.id}`);

  const eligible = await findEligibleCouriers(pickupLocation, requiresCar, delivery.dispatchedTo);

  if (eligible.length === 0) {
    logger.warn(`No eligible couriers found for delivery ${delivery.id}`);
    throw new Error('אין שליחים זמינים באזור כעת');
  }

  const courierIds = eligible.map((e) => e.courier.id);
  const expiresAt = new Date(Date.now() + DISPATCH_TIMEOUT_SECONDS * 1000);

  // Update delivery record
  await updateDocument(COLLECTION_DELIVERIES, delivery.id, {
    status: DeliveryStatus.DISPATCHED,
    dispatchedTo: [...(delivery.dispatchedTo ?? []), ...courierIds],
    dispatchExpiresAt: expiresAt,
  });

  // Emit Socket.io offer to each courier
  if (io) {
    for (const { courier, score } of eligible) {
      io.to(`courier:${courier.id}`).emit(SOCKET_EVENT_DELIVERY_OFFER, {
        deliveryId: delivery.id,
        delivery,
        score,
        expiresAt,
      });
    }
  }

  // Set auto-reassign timer
  clearDispatchTimer(delivery.id);
  const timer = setTimeout(() => {
    handleDispatchExpiry(delivery.id, pickupLocation, requiresCar, courierIds);
  }, DISPATCH_TIMEOUT_SECONDS * 1000);
  dispatchTimers.set(delivery.id, timer);

  logger.info(`Delivery ${delivery.id} dispatched to ${courierIds.length} couriers`);
  return { deliveryId: delivery.id, dispatchedTo: courierIds, expiresAt };
}

// ─────────────────────────────────────────
// Accept delivery
// ─────────────────────────────────────────

export async function acceptDelivery(deliveryId: string, courierId: string): Promise<void> {
  clearDispatchTimer(deliveryId);

  await updateDocument(COLLECTION_DELIVERIES, deliveryId, {
    status: DeliveryStatus.ACCEPTED,
    courierId,
    acceptedAt: new Date(),
  });

  // Notify other dispatched couriers that the delivery is taken
  if (io) {
    io.emit(`delivery:${deliveryId}:taken`, { courierId });
  }

  logger.info(`Delivery ${deliveryId} accepted by courier ${courierId}`);
}

// ─────────────────────────────────────────
// Auto-reassign on expiry
// ─────────────────────────────────────────

async function handleDispatchExpiry(
  deliveryId: string,
  pickupLocation: GeoPoint,
  requiresCar: boolean,
  alreadyDispatched: string[]
): Promise<void> {
  logger.info(`Dispatch expired for delivery ${deliveryId} – attempting reassign`);

  // Check if delivery was already accepted
  const deliveries = await queryDocuments<Delivery>(COLLECTION_DELIVERIES, [
    { field: 'id', op: '==', value: deliveryId },
  ]);

  const delivery = deliveries[0];
  if (!delivery || delivery.status !== DeliveryStatus.DISPATCHED) {
    // Already handled
    return;
  }

  if (io) {
    io.emit(SOCKET_EVENT_DISPATCH_EXPIRED, { deliveryId });
  }

  try {
    await dispatchDelivery(delivery, pickupLocation, requiresCar);
  } catch (err) {
    logger.error(`Reassign failed for delivery ${deliveryId}:`, err);
    // Mark as pending again so admin can handle
    await updateDocument(COLLECTION_DELIVERIES, deliveryId, {
      status: DeliveryStatus.PENDING,
      dispatchExpiresAt: null,
    });
  }
}

// ─────────────────────────────────────────
// Timer management
// ─────────────────────────────────────────

export function clearDispatchTimer(deliveryId: string): void {
  const timer = dispatchTimers.get(deliveryId);
  if (timer) {
    clearTimeout(timer);
    dispatchTimers.delete(deliveryId);
  }
}

export function getActiveDispatchCount(): number {
  return dispatchTimers.size;
}
