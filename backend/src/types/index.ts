// ============================================================
// אשדוד-שליח – Central TypeScript Type Definitions
// ============================================================

export enum DeliveryStatus {
  PENDING = 'pending',
  DISPATCHED = 'dispatched',
  ACCEPTED = 'accepted',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum VehicleType {
  BIKE = 'bike',
  SCOOTER = 'scooter',
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
}

export enum DeliveryType {
  REGULAR = 'regular',
  EXPRESS = 'express',
  FRAGILE = 'fragile',
  VIP = 'vip',
}

export enum UserRole {
  BUSINESS = 'business',
  COURIER = 'courier',
  ADMIN = 'admin',
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  zipCode?: string;
  notes?: string;
  geoPoint?: GeoPoint;
}

// ─────────────────────────────────────────
// User Models
// ─────────────────────────────────────────

export interface User {
  id: string;
  firebaseUid: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  fcmToken?: string;
}

export interface Business extends User {
  role: UserRole.BUSINESS;
  businessName: string;
  businessAddress: Address;
  contactPerson: string;
  deliveryCount: number;
  totalSpent: number;
  isVerified: boolean;
  creditBalance: number;
}

export interface Courier extends User {
  role: UserRole.COURIER;
  vehicleType: VehicleType;
  vehiclePlate?: string;
  currentLocation?: GeoPoint;
  isAvailable: boolean;
  isOnDuty: boolean;
  rating: number;
  ratingCount: number;
  activeDeliveries: string[];   // delivery IDs
  completedDeliveries: number;
  earnings: CourierEarnings;
  dangerousAreaCertified: boolean;
}

export interface CourierEarnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  bonusTotal: number;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
  permissions: AdminPermission[];
}

export enum AdminPermission {
  MANAGE_USERS = 'manage_users',
  MANAGE_PRICING = 'manage_pricing',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_BONUSES = 'manage_bonuses',
  MANAGE_DELIVERIES = 'manage_deliveries',
}

// ─────────────────────────────────────────
// Delivery
// ─────────────────────────────────────────

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  type: DeliveryType;
  businessId: string;
  courierId?: string;
  pickupAddress: Address;
  dropoffAddress: Address;
  recipientName: string;
  recipientPhone: string;
  packageDescription?: string;
  packageWeight?: number;     // kg
  isFragile: boolean;
  requiresSignature: boolean;
  pricingZone: string;
  basePrice: number;
  bonuses: AppliedBonus[];
  totalPrice: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  estimatedDuration?: number;  // minutes
  actualDuration?: number;     // minutes
  dispatchedTo: string[];      // courier IDs that received the offer
  dispatchExpiresAt?: Date;
  proofOfDeliveryUrl?: string;
}

export interface AppliedBonus {
  type: BonusType;
  amount: number;
  reason: string;
}

// ─────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────

export interface PricingZone {
  id: string;
  name: string;          // Hebrew zone name
  basePrice: number;     // ILS
  carOnlyPrice?: number; // price when only car is suitable
  requiresCar: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceCalculationInput {
  zoneName: string;
  deliveryType: DeliveryType;
  vehicleType: VehicleType;
  isUrgent?: boolean;
  isDangerousArea?: boolean;
  hour?: number;            // 0-23, for time-based bonuses
  weatherCondition?: WeatherCondition;
  activeDeliveriesInArea?: number;
}

export interface PriceCalculationResult {
  basePrice: number;
  bonuses: AppliedBonus[];
  totalPrice: number;
  zoneName: string;
  breakdown: string[];
}

export enum WeatherCondition {
  CLEAR = 'clear',
  RAIN = 'rain',
  STORM = 'storm',
  EXTREME = 'extreme',
}

// ─────────────────────────────────────────
// Bonus
// ─────────────────────────────────────────

export enum BonusType {
  WEATHER_RAIN = 'weather_rain',
  WEATHER_STORM = 'weather_storm',
  NIGHT = 'night',
  PEAK_HOURS = 'peak_hours',
  DANGEROUS_AREA = 'dangerous_area',
  URGENT = 'urgent',
  HIGH_LOAD = 'high_load',
  CUSTOM = 'custom',
}

export interface BonusRule {
  id: string;
  type: BonusType;
  name: string;
  description: string;
  amount: number;    // ILS
  isActive: boolean;
  conditions: BonusCondition;
  createdAt: Date;
  updatedAt: Date;
}

export interface BonusCondition {
  startHour?: number;
  endHour?: number;
  weatherCondition?: WeatherCondition;
  minActiveDeliveries?: number;
  zones?: string[];
}

// ─────────────────────────────────────────
// Chat
// ─────────────────────────────────────────

export interface ChatMessage {
  id: string;
  deliveryId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  content: string;
  messageType: ChatMessageType;
  mediaUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

export enum ChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  LOCATION = 'location',
  SYSTEM = 'system',
}

// ─────────────────────────────────────────
// Rating
// ─────────────────────────────────────────

export interface Rating {
  id: string;
  deliveryId: string;
  raterId: string;
  raterRole: UserRole;
  ratedId: string;        // courier or business ID
  score: number;          // 1-5
  comment?: string;
  tags?: RatingTag[];
  createdAt: Date;
}

export enum RatingTag {
  ON_TIME = 'on_time',
  PROFESSIONAL = 'professional',
  CAREFUL = 'careful',
  FRIENDLY = 'friendly',
  LATE = 'late',
  DAMAGED_PACKAGE = 'damaged_package',
  NO_SHOW = 'no_show',
}

// ─────────────────────────────────────────
// Notification
// ─────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  DELIVERY_OFFER = 'delivery_offer',
  DELIVERY_ACCEPTED = 'delivery_accepted',
  DELIVERY_PICKED_UP = 'delivery_picked_up',
  DELIVERY_IN_TRANSIT = 'delivery_in_transit',
  DELIVERY_DELIVERED = 'delivery_delivered',
  DELIVERY_CONFIRMED = 'delivery_confirmed',
  DELIVERY_CANCELLED = 'delivery_cancelled',
  PAYMENT_RECEIVED = 'payment_received',
  NEW_MESSAGE = 'new_message',
  BONUS_EARNED = 'bonus_earned',
  SYSTEM = 'system',
}

// ─────────────────────────────────────────
// AI / Analytics
// ─────────────────────────────────────────

export interface DeliveryTimeEstimate {
  deliveryId?: string;
  zone: string;
  estimatedMinutes: number;
  confidence: number;      // 0-1
  factors: string[];
}

export interface DemandForecast {
  hour: number;
  expectedDeliveries: number;
  recommendedCouriers: number;
  zones: Array<{ zone: string; demand: number }>;
}

export interface AnomalyReport {
  userId: string;
  userRole: UserRole;
  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
}

export enum AnomalyType {
  HIGH_CANCELLATION_RATE = 'high_cancellation_rate',
  LOW_RATING = 'low_rating',
  UNUSUAL_ROUTE = 'unusual_route',
  EXCESSIVE_COMPLAINTS = 'excessive_complaints',
  FRAUD_SUSPECTED = 'fraud_suspected',
}

// ─────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────

export interface CourierScore {
  courierId: string;
  score: number;
  distanceKm: number;
  rating: number;
  activeDeliveries: number;
  vehicleScore: number;
}

export interface DispatchResult {
  deliveryId: string;
  dispatchedTo: string[];
  expiresAt: Date;
}

// ─────────────────────────────────────────
// API Response wrappers
// ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────
// Request extensions
// ─────────────────────────────────────────

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: User | Business | Courier | Admin;
  firebaseUid?: string;
}
