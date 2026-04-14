// ============================================================
// useAuth HOOK - אשדוד-שליח Courier App
// ============================================================

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  loginCourier,
  registerCourier,
  logoutCourier,
  updateCourierStatus,
  clearError,
  updateCourier,
} from '../store/authSlice';
import { Courier } from '../types';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { courier, token, isLoading, isAuthenticated, error } = useSelector(
    (state: RootState) => state.auth
  );

  const login = useCallback(
    (phone: string, password: string) => dispatch(loginCourier({ phone, password })),
    [dispatch]
  );

  const register = useCallback(
    (data: {
      name: string;
      phone: string;
      email: string;
      password: string;
      vehicleType: string;
      vehiclePlate?: string;
    }) => dispatch(registerCourier(data)),
    [dispatch]
  );

  const logout = useCallback(() => dispatch(logoutCourier()), [dispatch]);

  const setStatus = useCallback(
    (status: 'available' | 'busy' | 'offline') => dispatch(updateCourierStatus(status)),
    [dispatch]
  );

  const updateProfile = useCallback(
    (data: Partial<Courier>) => dispatch(updateCourier(data)),
    [dispatch]
  );

  const dismissError = useCallback(() => dispatch(clearError()), [dispatch]);

  return {
    courier,
    token,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    setStatus,
    updateProfile,
    dismissError,
  };
}

export default useAuth;
