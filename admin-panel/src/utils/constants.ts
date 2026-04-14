import type { PricingZone } from '../types';

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  assigned: 'שובץ',
  picked_up: 'נאסף',
  in_transit: 'בדרך',
  delivered: 'נמסר',
  failed: 'נכשל',
  cancelled: 'בוטל',
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  motorcycle: 'אופנוע',
  bicycle: 'אופניים',
  car: 'רכב',
  scooter: 'קטנוע',
};

export const DEFAULT_PRICING_ZONES: Omit<PricingZone, 'updatedAt' | 'updatedBy'>[] = [
  { id: '1', name: 'אשדוד (בעיר)', basePrice: 25, courierShare: 70, isActive: true },
  { id: '2', name: 'משלוח לרכב בלבד', basePrice: 30, courierShare: 70, isActive: true },
  { id: '3', name: 'א.ת צפונית', basePrice: 35, courierShare: 70, isActive: true },
  { id: '4', name: 'ניר גלים', basePrice: 35, courierShare: 70, isActive: true },
  { id: '5', name: 'בני דרום', basePrice: 40, courierShare: 70, isActive: true },
  { id: '6', name: 'שתולים', basePrice: 40, courierShare: 70, isActive: true },
  { id: '7', name: 'שדה עוזיהו', basePrice: 40, courierShare: 70, isActive: true },
  { id: '8', name: 'עד הלום', basePrice: 40, courierShare: 70, isActive: true },
  { id: '9', name: 'עזריקים', basePrice: 45, courierShare: 70, isActive: true },
  { id: '10', name: 'עזר', basePrice: 45, courierShare: 70, isActive: true },
  { id: '11', name: 'אמונים', basePrice: 45, courierShare: 70, isActive: true },
  { id: '12', name: 'בית עזרא', basePrice: 45, courierShare: 70, isActive: true },
  { id: '13', name: 'גן יבנה', basePrice: 45, courierShare: 70, isActive: true },
  { id: '14', name: 'גן הדרום', basePrice: 45, courierShare: 70, isActive: true },
  { id: '15', name: 'גבעת ושינגטון', basePrice: 70, courierShare: 70, isActive: true },
  { id: '16', name: 'באר גנים', basePrice: 100, courierShare: 70, isActive: true },
  { id: '17', name: 'חצור (כולל בסיס)', basePrice: 60, courierShare: 70, isActive: true },
  { id: '18', name: 'חצב', basePrice: 70, courierShare: 70, isActive: true },
  { id: '19', name: 'בני עי"ש', basePrice: 80, courierShare: 70, isActive: true },
  { id: '20', name: 'יבנה', basePrice: 100, courierShare: 70, isActive: true },
  { id: '21', name: 'בן זכאי', basePrice: 100, courierShare: 70, isActive: true },
  { id: '22', name: 'ניצן', basePrice: 100, courierShare: 70, isActive: true },
  { id: '23', name: 'אשקלון', basePrice: 120, courierShare: 70, isActive: true },
  { id: '24', name: 'קריית מלאכי / באר טוביה', basePrice: 100, courierShare: 70, isActive: true },
  { id: '25', name: 'שדרות', basePrice: 170, courierShare: 70, isActive: true },
  { id: '26', name: 'קריית גת', basePrice: 180, courierShare: 70, isActive: true },
  { id: '27', name: 'באר שבע', basePrice: 350, courierShare: 70, isActive: true },
  { id: '28', name: 'נתיבות', basePrice: 260, courierShare: 70, isActive: true },
  { id: '29', name: 'דימונה / ירוחם / עד ערד', basePrice: 400, courierShare: 70, isActive: true },
];

export const NAV_ITEMS = [
  { path: '/', label: 'דשבורד', icon: 'HomeIcon' },
  { path: '/deliveries', label: 'משלוחים', icon: 'TruckIcon' },
  { path: '/live-map', label: 'מפה חיה', icon: 'MapIcon' },
  { path: '/couriers', label: 'שליחים', icon: 'UserGroupIcon' },
  { path: '/businesses', label: 'עסקים', icon: 'BuildingStorefrontIcon' },
  { path: '/pricing', label: 'תמחור', icon: 'CurrencyDollarIcon' },
  { path: '/bonuses', label: 'בונוסים', icon: 'GiftIcon' },
  { path: '/reports', label: 'דוחות', icon: 'ChartBarIcon' },
  { path: '/settings', label: 'הגדרות', icon: 'Cog6ToothIcon' },
];
