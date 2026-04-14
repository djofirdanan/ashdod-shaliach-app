import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import type { RootState, AppDispatch } from '../store';
import {
  fetchDeliveries,
  fetchActiveDeliveries,
  updateStatus,
  setFilters,
  setPage,
  setSelectedDelivery,
} from '../store/deliverySlice';
import type { Delivery, DeliveryStatus } from '../types';

export const useDeliveries = () => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((state: RootState) => state.deliveries);

  const loadDeliveries = useCallback(() => {
    dispatch(fetchDeliveries());
  }, [dispatch]);

  const loadActiveDeliveries = useCallback(() => {
    dispatch(fetchActiveDeliveries());
  }, [dispatch]);

  const changeStatus = useCallback(
    (id: string, status: DeliveryStatus) => {
      return dispatch(updateStatus({ id, status }));
    },
    [dispatch]
  );

  const updateFilters = useCallback(
    (filters: Partial<RootState['deliveries']['filters']>) => {
      dispatch(setFilters(filters));
    },
    [dispatch]
  );

  const changePage = useCallback(
    (page: number) => {
      dispatch(setPage(page));
    },
    [dispatch]
  );

  const selectDelivery = useCallback(
    (delivery: Delivery | null) => {
      dispatch(setSelectedDelivery(delivery));
    },
    [dispatch]
  );

  return {
    ...state,
    loadDeliveries,
    loadActiveDeliveries,
    changeStatus,
    updateFilters,
    changePage,
    selectDelivery,
  };
};
