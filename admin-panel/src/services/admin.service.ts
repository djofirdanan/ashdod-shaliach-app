import api from './api';

export interface DashboardStats {
  deliveriesToday: number;
  deliveriesThisWeek: number;
  deliveriesThisMonth: number;
  activeCouriers: number;
  totalCouriers: number;
  activeBusinesses: number;
  totalBusinesses: number;
  revenueToday: number;
  revenueThisWeek: number;
  activeDeliveries: number;
  pendingDeliveries: number;
  trends: {
    deliveries: number; // % change vs yesterday
    couriers: number;
    businesses: number;
    revenue: number;
  };
}

export interface BonusRule {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  amount: number;
  isActive: boolean;
  condition: string;
  icon: string;
}

export interface SystemSettings {
  dispatchTimeout: number;
  maxSearchRadius: number;
  maxCouriersPerDispatch: number;
  platformName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface RevenueReport {
  totalRevenue: number;
  dailyRevenue: { date: string; amount: number }[];
  byZone: { zone: string; count: number; revenue: number }[];
  topCouriers: { name: string; deliveries: number; earnings: number; rating: number }[];
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get('/admin/dashboard');
  return data.data;
};

export const fetchBonusRules = async (): Promise<BonusRule[]> => {
  const { data } = await api.get('/admin/bonus-rules');
  return data.data;
};

export const updateBonusRule = async (
  id: string,
  updates: Partial<BonusRule>
): Promise<BonusRule> => {
  const { data } = await api.patch(`/admin/bonus-rules/${id}`, updates);
  return data.data;
};

export const fetchSystemSettings = async (): Promise<SystemSettings> => {
  const { data } = await api.get('/admin/settings');
  return data.data;
};

export const updateSystemSettings = async (
  settings: Partial<SystemSettings>
): Promise<SystemSettings> => {
  const { data } = await api.patch('/admin/settings', settings);
  return data.data;
};

export const fetchRevenueReport = async (
  from: string,
  to: string
): Promise<RevenueReport> => {
  const { data } = await api.get('/admin/reports/revenue', { params: { from, to } });
  return data.data;
};

export const blockUser = async (userId: string, reason: string) => {
  const { data } = await api.post(`/admin/block/${userId}`, { reason });
  return data.data;
};

export const unblockUser = async (userId: string) => {
  const { data } = await api.post(`/admin/unblock/${userId}`);
  return data.data;
};
