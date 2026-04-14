// ============================================================
// Core Types for אשדוד-שליח Admin Panel
// ============================================================

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type UserRole = 'admin' | 'courier' | 'business' | 'customer';

export type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'scooter';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  city: string;
  zone?: string;
  coordinates?: GeoPoint;
}

// ============================================================
// User / Auth
// ============================================================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  avatar?: string;
  createdAt: string;
}

// ============================================================
// Courier
// ============================================================

export interface Courier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle: VehicleType;
  vehiclePlate?: string;
  rating: number;
  totalDeliveries: number;
  activeDeliveries: number;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  currentLocation?: GeoPoint;
  joinedAt: string;
  lastActiveAt: string;
  earnings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  avatar?: string;
}

// ============================================================
// Business
// ============================================================

export interface Business {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: Address;
  category: string;
  rating: number;
  totalDeliveries: number;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  joinedAt: string;
  lastOrderAt: string;
  balance: number;
  contactPerson?: string;
}

// ============================================================
// Delivery
// ============================================================

export interface Delivery {
  id: string;
  trackingNumber: string;
  status: DeliveryStatus;
  business: {
    id: string;
    name: string;
  };
  courier?: {
    id: string;
    name: string;
    phone: string;
  };
  customer: {
    name: string;
    phone: string;
  };
  pickupAddress: Address;
  deliveryAddress: Address;
  zone: string;
  price: number;
  courierFee: number;
  notes?: string;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  estimatedDelivery?: string;
  distanceKm?: number;
}

// ============================================================
// Pricing
// ============================================================

export interface PricingZone {
  id: string;
  name: string;
  basePrice: number;
  courierShare: number; // percentage
  description?: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface PriceHistory {
  id: string;
  zoneId: string;
  zoneName: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

// ============================================================
// Bonus
// ============================================================

export interface BonusRule {
  id: string;
  name: string;
  description: string;
  type: 'deliveries_count' | 'revenue' | 'rating' | 'time_based' | 'zone_based';
  isActive: boolean;
  conditions: {
    minDeliveries?: number;
    minRevenue?: number;
    minRating?: number;
    startTime?: string;
    endTime?: string;
    zones?: string[];
  };
  reward: {
    type: 'fixed' | 'percentage' | 'multiplier';
    value: number;
  };
  validFrom?: string;
  validTo?: string;
  createdAt: string;
}

// ============================================================
// Stats / Dashboard
// ============================================================

export interface DashboardStats {
  deliveries: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    active: number;
    pending: number;
  };
  couriers: {
    total: number;
    active: number;
    blocked: number;
  };
  businesses: {
    total: number;
    active: number;
    blocked: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export interface HourlyDeliveryData {
  hour: string;
  deliveries: number;
  revenue: number;
}

export interface DailyRevenueData {
  date: string;
  revenue: number;
  deliveries: number;
}

// ============================================================
// Alert / Issue
// ============================================================

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: 'delivery' | 'courier' | 'business';
}

// ============================================================
// Settings
// ============================================================

export interface SystemSettings {
  platformName: string;
  supportPhone: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultLanguage: string;
  maxDeliveriesPerCourier: number;
  autoAssignEnabled: boolean;
  notificationsEnabled: boolean;
  smsEnabled: boolean;
  firebaseConfig?: Record<string, string>;
  apiKeys: {
    mapsApiKey?: string;
    smsApiKey?: string;
    paymentApiKey?: string;
  };
  notificationTemplates: {
    orderConfirmed: string;
    orderAssigned: string;
    orderPickedUp: string;
    orderDelivered: string;
    orderFailed: string;
  };
}

// ============================================================
// Redux State Types
// ============================================================

export interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface DeliveryState {
  deliveries: Delivery[];
  activeDeliveries: Delivery[];
  selectedDelivery: Delivery | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: DeliveryStatus | 'all';
    courierId: string;
    businessId: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface UserState {
  couriers: Courier[];
  businesses: Business[];
  selectedCourier: Courier | null;
  selectedBusiness: Business | null;
  isLoading: boolean;
  error: string | null;
}

export interface PricingState {
  zones: PricingZone[];
  priceHistory: PriceHistory[];
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

// ============================================================
// API Response
// ============================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
