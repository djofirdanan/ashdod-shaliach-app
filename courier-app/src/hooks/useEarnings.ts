// ============================================================
// useEarnings HOOK - אשדוד-שליח Courier App
// ============================================================

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchEarningsSummary, clearError } from '../store/earningsSlice';

export function useEarnings(autoLoad = false) {
  const dispatch = useDispatch<AppDispatch>();
  const { summary, isLoading, error } = useSelector((state: RootState) => state.earnings);

  const loadSummary = useCallback(() => dispatch(fetchEarningsSummary()), [dispatch]);

  const dismissError = useCallback(() => dispatch(clearError()), [dispatch]);

  useEffect(() => {
    if (autoLoad) {
      loadSummary();
    }
  }, [autoLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    summary,
    isLoading,
    error,
    loadSummary,
    dismissError,
    // Convenient accessors
    todayTotal: summary?.today.total ?? 0,
    todayDeliveries: summary?.today.deliveries ?? 0,
    weekTotal: summary?.thisWeek.total ?? 0,
    monthTotal: summary?.thisMonth.total ?? 0,
    pendingAmount: summary?.pending ?? 0,
  };
}

export default useEarnings;
