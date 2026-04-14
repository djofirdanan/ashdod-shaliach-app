// ============================================================
// אשדוד-שליח – Application Constants
// ============================================================

export const APP_NAME = 'אשדוד-שליח';
export const APP_VERSION = '1.0.0';

// Server
export const DEFAULT_PORT = 3000;
export const DEFAULT_HOST = '0.0.0.0';

// JWT / Auth
export const TOKEN_EXPIRY = '7d';

// Dispatch
export const DISPATCH_TIMEOUT_SECONDS = 60;
export const MAX_DISPATCH_COURIERS = 5;
export const DISPATCH_RADIUS_KM = 10;

// Scoring weights for dispatch algorithm
export const DISPATCH_WEIGHT_DISTANCE = 0.4;
export const DISPATCH_WEIGHT_RATING = 0.3;
export const DISPATCH_WEIGHT_LOAD = 0.2;
export const DISPATCH_WEIGHT_VEHICLE = 0.1;

// Bonus amounts (ILS)
export const BONUS_RAIN = 15;
export const BONUS_STORM = 30;
export const BONUS_NIGHT = 20;
export const BONUS_PEAK_HOURS = 10;
export const BONUS_DANGEROUS_AREA = 25;
export const BONUS_URGENT = 20;
export const BONUS_HIGH_LOAD = 15;

// Peak hour windows
export const PEAK_MORNING_START = 12;
export const PEAK_MORNING_END = 14;
export const PEAK_EVENING_START = 19;
export const PEAK_EVENING_END = 21;

// Night bonus window
export const NIGHT_BONUS_START = 22;
export const NIGHT_BONUS_END = 6;

// High-load threshold
export const HIGH_LOAD_THRESHOLD = 10;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Cache TTL (seconds)
export const CACHE_TTL_PRICING = 300;       // 5 min
export const CACHE_TTL_COURIERS = 30;       // 30 sec
export const CACHE_TTL_ANALYTICS = 600;     // 10 min

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;  // 15 min
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_AUTH_MAX = 10;

// Firestore collections
export const COLLECTION_USERS = 'users';
export const COLLECTION_DELIVERIES = 'deliveries';
export const COLLECTION_PRICING_ZONES = 'pricing_zones';
export const COLLECTION_BONUS_RULES = 'bonus_rules';
export const COLLECTION_CHAT_MESSAGES = 'chat_messages';
export const COLLECTION_RATINGS = 'ratings';
export const COLLECTION_NOTIFICATIONS = 'notifications';
export const COLLECTION_COURIER_LOCATIONS = 'courier_locations';

// Socket.io events
export const SOCKET_EVENT_DELIVERY_OFFER = 'delivery:offer';
export const SOCKET_EVENT_DELIVERY_UPDATE = 'delivery:update';
export const SOCKET_EVENT_LOCATION_UPDATE = 'location:update';
export const SOCKET_EVENT_CHAT_MESSAGE = 'chat:message';
export const SOCKET_EVENT_NOTIFICATION = 'notification';
export const SOCKET_EVENT_COURIER_AVAILABLE = 'courier:available';
export const SOCKET_EVENT_DISPATCH_EXPIRED = 'dispatch:expired';

// Dangerous zones (examples for Ashdod region)
export const DANGEROUS_ZONES: string[] = [];

// Earth radius for distance calculations
export const EARTH_RADIUS_KM = 6371;
