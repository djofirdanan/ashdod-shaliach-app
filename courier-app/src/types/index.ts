// ============================================================
// TYPES - אשדוד-שליח Courier App
// ============================================================

export type DeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'going_to_pickup'
  | 'at_pickup'
  | 'picked_up'
  | 'going_to_delivery'
  | 'at_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'electric_scooter' | 'walking';

export type CourierStatus = 'available' | 'busy' | 'offline';

export type DeliveryType = 'food' | 'package' | 'document' | 'grocery' | 'pharmacy' | 'other';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  zipCode?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  coordinates: Coordinates;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
}

export interface Business {
  id: string;
  name: string;
  phone: string;
  address: Address;
  logo?: string;
  category: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  vehicleType: VehicleType;
  vehiclePlate?: string;
  status: CourierStatus;
  rating: number;
  totalDeliveries: number;
  isVerified: boolean;
  joinedAt: string;
  currentLocation?: Coordinates;
}

export interface DeliveryItem {
  name: string;
  quantity: number;
  specialInstructions?: string;
}

export interface Delivery {
  id: string;
  orderNumber: string;
  status: DeliveryStatus;
  type: DeliveryType;
  business: Business;
  customer: User;
  pickupAddress: Address;
  deliveryAddress: Address;
  items?: DeliveryItem[];
  distance: number; // in km
  estimatedDuration: number; // in minutes
  payment: {
    amount: number;
    bonus?: number;
    tip?: number;
    total: number;
    currency: string;
  };
  notes?: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  proofOfDelivery?: ProofOfDelivery;
}

export interface ProofOfDelivery {
  photoUri?: string;
  signature?: string;
  notes?: string;
  location: Coordinates;
  timestamp: string;
  qrCode?: string;
}

export interface Earnings {
  date: string;
  deliveries: number;
  baseAmount: number;
  bonuses: number;
  tips: number;
  total: number;
  paymentStatus: PaymentStatus;
}

export interface EarningsSummary {
  today: Earnings;
  thisWeek: {
    total: number;
    deliveries: number;
    bonuses: number;
    tips: number;
  };
  thisMonth: {
    total: number;
    deliveries: number;
    bonuses: number;
    tips: number;
  };
  pending: number;
  history: Earnings[];
}

export interface ZoneHeat {
  coordinates: Coordinates;
  intensity: number; // 0-1
  label?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'courier' | 'customer' | 'business' | 'support';
  content: string;
  timestamp: string;
  isRead: boolean;
  deliveryId?: string;
}

export interface Notification {
  id: string;
  type: 'new_delivery' | 'delivery_update' | 'earnings' | 'system' | 'safety';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: string;
  isRead: boolean;
}

export interface EmergencyAlert {
  id: string;
  courierId: string;
  location: Coordinates;
  timestamp: string;
  type: 'sos' | 'accident' | 'threat';
  resolved: boolean;
}

// Navigation param types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VehicleSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  ActiveDelivery: { deliveryId: string } | undefined;
  DeliveryQueue: undefined;
  Earnings: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  ActiveDelivery: { deliveryId: string };
  DeliveryQueue: undefined;
  History: undefined;
  Chat: { deliveryId: string; recipientName: string };
  Profile: undefined;
};

export interface AppState {
  auth: AuthState;
  delivery: DeliveryState;
  earnings: EarningsState;
  location: LocationState;
}

export interface AuthState {
  courier: Courier | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface DeliveryState {
  activeDeliveries: Delivery[];
  pendingOffer: Delivery | null;
  history: Delivery[];
  isLoading: boolean;
  error: string | null;
}

export interface EarningsState {
  summary: EarningsSummary | null;
  isLoading: boolean;
  error: string | null;
}

export interface LocationState {
  currentLocation: Coordinates | null;
  isTracking: boolean;
  lastUpdated: string | null;
  error: string | null;
}
