import api from './api';
import type { Delivery, DeliveryStatus, PaginatedResponse, ApiResponse } from '../types';

export interface DeliveryFilters {
  status?: DeliveryStatus | 'all';
  courierId?: string;
  businessId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const fetchDeliveries = async (
  filters: DeliveryFilters = {}
): Promise<PaginatedResponse<Delivery>> => {
  const { data } = await api.get<PaginatedResponse<Delivery>>('/deliveries', { params: filters });
  return data;
};

export const fetchDeliveryById = async (id: string): Promise<Delivery> => {
  const { data } = await api.get<ApiResponse<Delivery>>(`/deliveries/${id}`);
  return data.data;
};

export const updateDeliveryStatus = async (
  id: string,
  status: DeliveryStatus
): Promise<Delivery> => {
  const { data } = await api.patch<ApiResponse<Delivery>>(`/deliveries/${id}/status`, { status });
  return data.data;
};

export const assignCourier = async (deliveryId: string, courierId: string): Promise<Delivery> => {
  const { data } = await api.patch<ApiResponse<Delivery>>(`/deliveries/${deliveryId}/assign`, {
    courierId,
  });
  return data.data;
};

export const fetchActiveDeliveries = async (): Promise<Delivery[]> => {
  const { data } = await api.get<ApiResponse<Delivery[]>>('/deliveries/active');
  return data.data;
};

export const exportDeliveriesToCsv = async (filters: DeliveryFilters = {}): Promise<Blob> => {
  const { data } = await api.get('/deliveries/export', {
    params: { ...filters, format: 'csv' },
    responseType: 'blob',
  });
  return data;
};
