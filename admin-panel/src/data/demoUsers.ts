import type { Courier, Business } from '../types';

export const demoCouriers: Courier[] = [
  {
    id: 'courier-001',
    name: 'יוסי כהן',
    phone: '050-1234567',
    email: 'yossi@shaliach-test.co.il',
    vehicle: 'motorcycle',
    vehiclePlate: '12-345-67',
    rating: 4.8,
    totalDeliveries: 312,
    activeDeliveries: 2,
    isActive: true,
    isBlocked: false,
    joinedAt: '2024-03-15T09:00:00.000Z',
    lastActiveAt: new Date().toISOString(),
    earnings: {
      today: 185,
      thisWeek: 920,
      thisMonth: 3840,
      total: 28600,
    },
    currentLocation: { lat: 31.8014, lng: 34.6433 },
  },
  {
    id: 'courier-002',
    name: 'דוד לוי',
    phone: '052-9876543',
    email: 'david@shaliach-test.co.il',
    vehicle: 'bicycle',
    vehiclePlate: undefined,
    rating: 4.5,
    totalDeliveries: 147,
    activeDeliveries: 1,
    isActive: true,
    isBlocked: false,
    joinedAt: '2024-08-20T10:30:00.000Z',
    lastActiveAt: new Date().toISOString(),
    earnings: {
      today: 95,
      thisWeek: 480,
      thisMonth: 1920,
      total: 9400,
    },
    currentLocation: { lat: 31.7957, lng: 34.6482 },
  },
];

export const demoBusinesses: Business[] = [
  {
    id: 'biz-001',
    name: 'פיצה טעמי',
    phone: '08-8881111',
    email: 'pizza@shaliach-test.co.il',
    address: {
      street: 'רחוב הרצל 22',
      city: 'אשדוד',
      zone: 'גימל',
    },
    category: 'מסעדות',
    rating: 4.7,
    totalDeliveries: 890,
    isActive: true,
    isBlocked: false,
    joinedAt: '2023-11-01T08:00:00.000Z',
    lastOrderAt: new Date().toISOString(),
    balance: 1240,
    contactPerson: 'מוטי כהן',
  },
  {
    id: 'biz-002',
    name: 'סופר הרשת',
    phone: '08-8552200',
    email: 'super@shaliach-test.co.il',
    address: {
      street: 'שדרות בן גוריון 5',
      city: 'אשדוד',
      zone: 'ד׳',
    },
    category: 'מכולת וסופר',
    rating: 4.3,
    totalDeliveries: 430,
    isActive: true,
    isBlocked: false,
    joinedAt: '2024-01-10T09:00:00.000Z',
    lastOrderAt: new Date().toISOString(),
    balance: 560,
    contactPerson: 'שרה אברהם',
  },
];

// Credentials card for reference
export const demoCredentials = {
  couriers: [
    { name: 'יוסי כהן',  email: 'yossi@shaliach-test.co.il',  password: 'Shaliach123!', role: 'שליח' },
    { name: 'דוד לוי',   email: 'david@shaliach-test.co.il',   password: 'Shaliach123!', role: 'שליח' },
  ],
  businesses: [
    { name: 'פיצה טעמי', email: 'pizza@shaliach-test.co.il',   password: 'Business123!', role: 'עסק' },
    { name: 'סופר הרשת', email: 'super@shaliach-test.co.il',   password: 'Business123!', role: 'עסק' },
  ],
};
