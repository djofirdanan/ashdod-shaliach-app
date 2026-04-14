export type UserRole = 'business' | 'courier' | 'admin';

export type DeliveryStatus =
  | 'pending'
  | 'searching_courier'
  | 'courier_accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type PackageType = 'regular' | 'express' | 'fragile' | 'vip';

export type DeliveryZone = 'ashdod_north' | 'ashdod_south' | 'ashdod_center' | 'nearby_cities';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  businessName?: string;
  businessLogo?: string;
  rating?: number;
  totalDeliveries?: number;
  createdAt: string;
}

export interface Address {
  street: string;
  city: string;
  zipCode?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface Package {
  type: PackageType;
  weight?: number;
  description?: string;
  fragile?: boolean;
  requiresSignature?: boolean;
  notes?: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  rating: number;
  totalDeliveries: number;
  vehicleType: 'bicycle' | 'motorcycle' | 'car';
  currentLocation?: {
    lat: number;
    lng: number;
  };
  isOnline: boolean;
}

export interface DeliveryStatusEvent {
  status: DeliveryStatus;
  timestamp: string;
  note?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Message {
  id: string;
  deliveryId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Delivery {
  id: string;
  businessId: string;
  businessName: string;
  courierId?: string;
  courier?: Courier;
  status: DeliveryStatus;
  packageType: PackageType;
  package: Package;
  pickupAddress: Address;
  deliveryAddress: Address;
  zone: DeliveryZone;
  price: number;
  estimatedDuration?: number;
  estimatedArrival?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
  statusHistory: DeliveryStatusEvent[];
  proofOfDelivery?: string[];
  rating?: number;
  ratingComment?: string;
  notes?: string;
}

export interface PriceEstimate {
  base: number;
  distanceFee: number;
  packageTypeFee: number;
  zoneFee: number;
  total: number;
  estimatedDuration: number;
  currency: string;
}

export interface DashboardStats {
  todayTotal: number;
  todayDelivered: number;
  todayPending: number;
  todayActive: number;
  monthTotal: number;
  monthSpent: number;
  averageRating: number;
}

export interface Notification {
  id: string;
  type: 'delivery_update' | 'courier_assigned' | 'delivered' | 'message' | 'system';
  title: string;
  body: string;
  deliveryId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface DeliveryState {
  activeDeliveries: Delivery[];
  historyDeliveries: Delivery[];
  currentDelivery: Delivery | null;
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  isDarkMode: boolean;
  language: 'he' | 'en';
  notifications: Notification[];
  unreadCount: number;
}

export interface RootState {
  auth: AuthState;
  delivery: DeliveryState;
  ui: UIState;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  NewDelivery: undefined;
  ActiveDeliveries: undefined;
  DeliveryDetails: { deliveryId: string };
  History: undefined;
  Profile: undefined;
  Chat: { deliveryId: string; courierName: string };
};
