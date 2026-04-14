import api from './api';
import type { Courier, Business, ApiResponse, PaginatedResponse } from '../types';

// ---- Couriers ----

export const fetchCouriers = async (params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Courier>> => {
  const { data } = await api.get<PaginatedResponse<Courier>>('/couriers', { params });
  return data;
};

export const fetchCourierById = async (id: string): Promise<Courier> => {
  const { data } = await api.get<ApiResponse<Courier>>(`/couriers/${id}`);
  return data.data;
};

export const blockCourier = async (id: string, reason: string): Promise<Courier> => {
  const { data } = await api.patch<ApiResponse<Courier>>(`/couriers/${id}/block`, { reason });
  return data.data;
};

export const unblockCourier = async (id: string): Promise<Courier> => {
  const { data } = await api.patch<ApiResponse<Courier>>(`/couriers/${id}/unblock`);
  return data.data;
};

// ---- Businesses ----

export const fetchBusinesses = async (params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Business>> => {
  const { data } = await api.get<PaginatedResponse<Business>>('/businesses', { params });
  return data;
};

export const fetchBusinessById = async (id: string): Promise<Business> => {
  const { data } = await api.get<ApiResponse<Business>>(`/businesses/${id}`);
  return data.data;
};

export const blockBusiness = async (id: string, reason: string): Promise<Business> => {
  const { data } = await api.patch<ApiResponse<Business>>(`/businesses/${id}/block`, { reason });
  return data.data;
};

export const unblockBusiness = async (id: string): Promise<Business> => {
  const { data } = await api.patch<ApiResponse<Business>>(`/businesses/${id}/unblock`);
  return data.data;
};
