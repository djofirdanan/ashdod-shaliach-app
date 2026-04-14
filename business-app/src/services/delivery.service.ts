import { Delivery, PriceEstimate, DashboardStats, DeliveryZone, PackageType } from '../types';

const mockDeliveries: Delivery[] = [
  {
    id: 'del_001',
    businessId: 'user_1',
    businessName: 'עסק לדוגמה בע"מ',
    courierId: 'courier_1',
    courier: {
      id: 'courier_1',
      name: 'אחמד ח׳ליל',
      phone: '052-9876543',
      photo: undefined,
      rating: 4.9,
      totalDeliveries: 523,
      vehicleType: 'motorcycle',
      currentLocation: { lat: 31.8014, lng: 34.6553 },
      isOnline: true,
    },
    status: 'in_transit',
    packageType: 'express',
    package: {
      type: 'express',
      weight: 1.5,
      description: 'מסמכים דחופים',
      fragile: false,
      requiresSignature: true,
    },
    pickupAddress: {
      street: 'רחוב הרצל 15',
      city: 'אשדוד',
      floor: '3',
      apartment: '12',
      lat: 31.7993,
      lng: 34.6406,
    },
    deliveryAddress: {
      street: 'שדרות בן גוריון 45',
      city: 'אשדוד',
      floor: '1',
      lat: 31.8057,
      lng: 34.6631,
    },
    zone: 'ashdod_center',
    price: 45,
    estimatedDuration: 25,
    estimatedArrival: new Date(Date.now() + 20 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    statusHistory: [
      { status: 'pending', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
      { status: 'searching_courier', timestamp: new Date(Date.now() - 28 * 60000).toISOString() },
      { status: 'courier_accepted', timestamp: new Date(Date.now() - 20 * 60000).toISOString() },
      { status: 'picked_up', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
      { status: 'in_transit', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
    notes: 'צלצל בדלת',
  },
  {
    id: 'del_002',
    businessId: 'user_1',
    businessName: 'עסק לדוגמה בע"מ',
    status: 'searching_courier',
    packageType: 'regular',
    package: {
      type: 'regular',
      weight: 3,
      description: 'חבילה רגילה',
    },
    pickupAddress: {
      street: 'רחוב יהודה הלוי 8',
      city: 'אשדוד',
      lat: 31.8020,
      lng: 34.6510,
    },
    deliveryAddress: {
      street: 'רחוב הגפן 22',
      city: 'אשדוד',
      lat: 31.7950,
      lng: 34.6490,
    },
    zone: 'ashdod_south',
    price: 35,
    estimatedDuration: 30,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    statusHistory: [
      { status: 'pending', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
      { status: 'searching_courier', timestamp: new Date(Date.now() - 3 * 60000).toISOString() },
    ],
  },
  {
    id: 'del_003',
    businessId: 'user_1',
    businessName: 'עסק לדוגמה בע"מ',
    courierId: 'courier_2',
    courier: {
      id: 'courier_2',
      name: 'מוחמד עלי',
      phone: '053-5556789',
      rating: 4.7,
      totalDeliveries: 312,
      vehicleType: 'car',
      currentLocation: { lat: 31.8100, lng: 34.6580 },
      isOnline: true,
    },
    status: 'courier_accepted',
    packageType: 'fragile',
    package: {
      type: 'fragile',
      weight: 2,
      description: 'כלי זכוכית',
      fragile: true,
      requiresSignature: true,
    },
    pickupAddress: {
      street: 'רחוב המסגר 5',
      city: 'אשדוד',
      lat: 31.8100,
      lng: 34.6590,
    },
    deliveryAddress: {
      street: 'רחוב הנביאים 33',
      city: 'אשדוד',
      lat: 31.8150,
      lng: 34.6510,
    },
    zone: 'ashdod_north',
    price: 60,
    estimatedDuration: 40,
    estimatedArrival: new Date(Date.now() + 35 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    statusHistory: [
      { status: 'pending', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
      { status: 'searching_courier', timestamp: new Date(Date.now() - 13 * 60000).toISOString() },
      { status: 'courier_accepted', timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
    ],
  },
];

const mockHistory: Delivery[] = [
  {
    id: 'del_h001',
    businessId: 'user_1',
    businessName: 'עסק לדוגמה בע"מ',
    courierId: 'courier_3',
    courier: {
      id: 'courier_3',
      name: 'יוסי כהן',
      phone: '054-1112233',
      rating: 4.6,
      totalDeliveries: 891,
      vehicleType: 'motorcycle',
      isOnline: false,
    },
    status: 'delivered',
    packageType: 'regular',
    package: { type: 'regular', weight: 1 },
    pickupAddress: { street: 'רחוב הרצל 15', city: 'אשדוד' },
    deliveryAddress: { street: 'רחוב ויצמן 10', city: 'אשדוד' },
    zone: 'ashdod_center',
    price: 35,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    deliveredAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    statusHistory: [],
    rating: 5,
    ratingComment: 'מצוין! מהיר ומקצועי',
  },
  {
    id: 'del_h002',
    businessId: 'user_1',
    businessName: 'עסק לדוגמה בע"מ',
    courierId: 'courier_1',
    courier: {
      id: 'courier_1',
      name: 'אחמד ח׳ליל',
      phone: '052-9876543',
      rating: 4.9,
      totalDeliveries: 523,
      vehicleType: 'motorcycle',
      isOnline: true,
    },
    status: 'delivered',
    packageType: 'express',
    package: { type: 'express', weight: 0.5 },
    pickupAddress: { street: 'שדרות ירושלים 50', city: 'אשדוד' },
    deliveryAddress: { street: 'רחוב הגבורה 7', city: 'אשדוד' },
    zone: 'ashdod_north',
    price: 55,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    deliveredAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    statusHistory: [],
    rating: 4,
  },
  {
    id: 'del_h003',
    businessId: 'user_1',
    businessName: 'עסק לדוגמה בע"מ',
    status: 'cancelled',
    packageType: 'regular',
    package: { type: 'regular', weight: 2 },
    pickupAddress: { street: 'רחוב הזית 3', city: 'אשדוד' },
    deliveryAddress: { street: 'רחוב הרימון 14', city: 'אשדוד' },
    zone: 'ashdod_south',
    price: 30,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 47 * 3600000).toISOString(),
    statusHistory: [],
  },
];

class DeliveryService {
  async getActiveDeliveries(): Promise<Delivery[]> {
    await new Promise((r) => setTimeout(r, 800));
    return [...mockDeliveries];
  }

  async getDeliveryHistory(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Delivery[]> {
    await new Promise((r) => setTimeout(r, 800));
    return [...mockHistory];
  }

  async getDeliveryById(id: string): Promise<Delivery> {
    await new Promise((r) => setTimeout(r, 400));
    const all = [...mockDeliveries, ...mockHistory];
    const delivery = all.find((d) => d.id === id);
    if (!delivery) throw new Error('משלוח לא נמצא');
    return delivery;
  }

  async createDelivery(data: Partial<Delivery>): Promise<Delivery> {
    await new Promise((r) => setTimeout(r, 1200));
    const newDelivery: Delivery = {
      id: `del_${Date.now()}`,
      businessId: 'user_1',
      businessName: 'עסק לדוגמה בע"מ',
      status: 'searching_courier',
      packageType: data.packageType || 'regular',
      package: data.package || { type: 'regular' },
      pickupAddress: data.pickupAddress!,
      deliveryAddress: data.deliveryAddress!,
      zone: data.zone || 'ashdod_center',
      price: data.price || 35,
      estimatedDuration: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        { status: 'pending', timestamp: new Date().toISOString() },
        { status: 'searching_courier', timestamp: new Date().toISOString() },
      ],
      notes: data.notes,
    };
    mockDeliveries.unshift(newDelivery);
    return newDelivery;
  }

  async cancelDelivery(id: string, reason?: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
    const idx = mockDeliveries.findIndex((d) => d.id === id);
    if (idx !== -1) {
      mockDeliveries[idx].status = 'cancelled';
    }
  }

  async rateDelivery(
    id: string,
    rating: number,
    comment?: string
  ): Promise<{ id: string; rating: number; ratingComment?: string }> {
    await new Promise((r) => setTimeout(r, 600));
    return { id, rating, ratingComment: comment };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    await new Promise((r) => setTimeout(r, 400));
    return {
      todayTotal: 8,
      todayDelivered: 5,
      todayPending: 1,
      todayActive: 3,
      monthTotal: 147,
      monthSpent: 5292,
      averageRating: 4.8,
    };
  }

  async estimatePrice(params: {
    pickupLat?: number;
    pickupLng?: number;
    deliveryLat?: number;
    deliveryLng?: number;
    zone: DeliveryZone;
    packageType: PackageType;
    weight?: number;
  }): Promise<PriceEstimate> {
    await new Promise((r) => setTimeout(r, 400));

    const base = 25;
    const zoneFees: Record<DeliveryZone, number> = {
      ashdod_north: 5,
      ashdod_center: 5,
      ashdod_south: 5,
      nearby_cities: 25,
    };
    const typeFees: Record<PackageType, number> = {
      regular: 0,
      express: 15,
      fragile: 10,
      vip: 30,
    };

    const distanceFee = 5;
    const zoneFee = zoneFees[params.zone];
    const packageTypeFee = typeFees[params.packageType];

    const total = base + distanceFee + zoneFee + packageTypeFee;

    return {
      base,
      distanceFee,
      packageTypeFee,
      zoneFee,
      total,
      estimatedDuration: params.zone === 'nearby_cities' ? 60 : 25,
      currency: 'ILS',
    };
  }
}

export const deliveryService = new DeliveryService();
