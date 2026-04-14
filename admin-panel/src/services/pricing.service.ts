import api from './api';
import type { PricingZone, PriceHistory, ApiResponse } from '../types';

export const fetchPricingZones = async (): Promise<PricingZone[]> => {
  const { data } = await api.get<ApiResponse<PricingZone[]>>('/pricing/zones');
  return data.data;
};

export const updatePricingZone = async (
  id: string,
  updates: Partial<Pick<PricingZone, 'basePrice' | 'courierShare' | 'isActive'>>
): Promise<PricingZone> => {
  const { data } = await api.patch<ApiResponse<PricingZone>>(`/pricing/zones/${id}`, updates);
  return data.data;
};

export const bulkUpdatePricing = async (
  zones: { id: string; basePrice: number }[]
): Promise<PricingZone[]> => {
  const { data } = await api.put<ApiResponse<PricingZone[]>>('/pricing/zones/bulk', { zones });
  return data.data;
};

export const fetchPriceHistory = async (): Promise<PriceHistory[]> => {
  const { data } = await api.get<ApiResponse<PriceHistory[]>>('/pricing/history');
  return data.data;
};
