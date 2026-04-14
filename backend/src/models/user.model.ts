// ============================================================
// אשדוד-שליח – User Model helpers
// ============================================================

import {
  User,
  Business,
  Courier,
  UserRole,
  VehicleType,
  CourierEarnings,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export function createUserBase(params: {
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  fcmToken?: string;
}): User {
  const now = new Date();
  return {
    id: uuidv4(),
    firebaseUid: params.firebaseUid,
    role: params.role,
    name: params.name,
    email: params.email,
    phone: params.phone,
    isActive: true,
    fcmToken: params.fcmToken,
    createdAt: now,
    updatedAt: now,
  };
}

export function createBusinessUser(params: {
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessAddress: Business['businessAddress'];
  contactPerson: string;
  fcmToken?: string;
}): Business {
  const base = createUserBase({ ...params, role: UserRole.BUSINESS });
  return {
    ...base,
    role: UserRole.BUSINESS,
    businessName: params.businessName,
    businessAddress: params.businessAddress,
    contactPerson: params.contactPerson,
    deliveryCount: 0,
    totalSpent: 0,
    isVerified: false,
    creditBalance: 0,
  };
}

export function createCourierUser(params: {
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehiclePlate?: string;
  fcmToken?: string;
}): Courier {
  const base = createUserBase({ ...params, role: UserRole.COURIER });
  const earnings: CourierEarnings = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    bonusTotal: 0,
  };
  return {
    ...base,
    role: UserRole.COURIER,
    vehicleType: params.vehicleType,
    vehiclePlate: params.vehiclePlate,
    isAvailable: false,
    isOnDuty: false,
    rating: 0,
    ratingCount: 0,
    activeDeliveries: [],
    completedDeliveries: 0,
    earnings,
    dangerousAreaCertified: false,
  };
}

export function sanitizeUser(user: User): Omit<User, 'firebaseUid'> & { firebaseUid?: undefined } {
  const { firebaseUid: _uid, ...safe } = user as User & { firebaseUid: string };
  void _uid;
  return safe;
}

export function sanitizeCourier(courier: Courier): Omit<Courier, 'firebaseUid'> {
  const { firebaseUid: _uid, ...safe } = courier;
  void _uid;
  return safe;
}
