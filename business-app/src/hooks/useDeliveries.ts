import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchActiveDeliveries,
  fetchDeliveryHistory,
  fetchDeliveryById,
  createDelivery,
  cancelDelivery,
  rateDelivery,
  fetchDashboardStats,
  setCurrentDelivery,
  clearError,
} from '../store/deliverySlice';
import { Delivery } from '../types';

export const useDeliveries = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeDeliveries, historyDeliveries, currentDelivery, stats, isLoading, error } =
    useSelector((state: RootState) => state.delivery);

  const loadActive = useCallback(async () => {
    return dispatch(fetchActiveDeliveries()).unwrap();
  }, [dispatch]);

  const loadHistory = useCallback(
    async (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
      return dispatch(fetchDeliveryHistory(params || {})).unwrap();
    },
    [dispatch]
  );

  const loadDeliveryById = useCallback(
    async (id: string) => {
      return dispatch(fetchDeliveryById(id)).unwrap();
    },
    [dispatch]
  );

  const create = useCallback(
    async (data: Partial<Delivery>) => {
      return dispatch(createDelivery(data)).unwrap();
    },
    [dispatch]
  );

  const cancel = useCallback(
    async (id: string, reason?: string) => {
      return dispatch(cancelDelivery({ id, reason })).unwrap();
    },
    [dispatch]
  );

  const rate = useCallback(
    async (id: string, rating: number, comment?: string) => {
      return dispatch(rateDelivery({ id, rating, comment })).unwrap();
    },
    [dispatch]
  );

  const loadStats = useCallback(async () => {
    return dispatch(fetchDashboardStats()).unwrap();
  }, [dispatch]);

  const selectDelivery = useCallback(
    (delivery: Delivery | null) => {
      dispatch(setCurrentDelivery(delivery));
    },
    [dispatch]
  );

  const clearDeliveryError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    activeDeliveries,
    historyDeliveries,
    currentDelivery,
    stats,
    isLoading,
    error,
    loadActive,
    loadHistory,
    loadDeliveryById,
    create,
    cancel,
    rate,
    loadStats,
    selectDelivery,
    clearDeliveryError,
  };
};
