// ============================================================
// useDeliveries HOOK - אשדוד-שליח Courier App
// ============================================================

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchActiveDeliveries,
  acceptDelivery,
  declineDelivery,
  updateDeliveryStatus,
  submitProofOfDelivery,
  fetchDeliveryHistory,
  setPendingOffer,
  clearPendingOffer,
} from '../store/deliverySlice';
import { DeliveryStatus, Delivery, ProofOfDelivery } from '../types';

export function useDeliveries() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeDeliveries, pendingOffer, history, isLoading, error } = useSelector(
    (state: RootState) => state.delivery
  );

  const loadActiveDeliveries = useCallback(
    () => dispatch(fetchActiveDeliveries()),
    [dispatch]
  );

  const accept = useCallback(
    (deliveryId: string) => dispatch(acceptDelivery(deliveryId)),
    [dispatch]
  );

  const decline = useCallback(
    (deliveryId: string) => dispatch(declineDelivery(deliveryId)),
    [dispatch]
  );

  const updateStatus = useCallback(
    (deliveryId: string, status: DeliveryStatus) =>
      dispatch(updateDeliveryStatus({ deliveryId, status })),
    [dispatch]
  );

  const submitProof = useCallback(
    (deliveryId: string, proof: ProofOfDelivery) =>
      dispatch(submitProofOfDelivery({ deliveryId, proof })),
    [dispatch]
  );

  const loadHistory = useCallback(
    (page?: number, limit?: number) => dispatch(fetchDeliveryHistory({ page, limit })),
    [dispatch]
  );

  const setOffer = useCallback(
    (delivery: Delivery | null) => dispatch(setPendingOffer(delivery)),
    [dispatch]
  );

  const clearOffer = useCallback(() => dispatch(clearPendingOffer()), [dispatch]);

  // Get specific active delivery by ID
  const getActiveDelivery = useCallback(
    (id: string) => activeDeliveries.find((d) => d.id === id) || null,
    [activeDeliveries]
  );

  // Get primary (first) active delivery
  const primaryDelivery = activeDeliveries.length > 0 ? activeDeliveries[0] : null;

  return {
    activeDeliveries,
    primaryDelivery,
    pendingOffer,
    history,
    isLoading,
    error,
    loadActiveDeliveries,
    accept,
    decline,
    updateStatus,
    submitProof,
    loadHistory,
    setOffer,
    clearOffer,
    getActiveDelivery,
  };
}

export default useDeliveries;
