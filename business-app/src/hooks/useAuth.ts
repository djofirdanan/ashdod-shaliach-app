import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  loginUser,
  registerUser,
  logoutUser,
  updateProfile,
  clearError,
  loadStoredAuth,
} from '../store/authSlice';
import { User } from '../types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const login = useCallback(
    async (email: string, password: string) => {
      return dispatch(loginUser({ email, password })).unwrap();
    },
    [dispatch]
  );

  const register = useCallback(
    async (data: { email: string; password: string; name: string; businessName: string; phone: string }) => {
      return dispatch(registerUser(data)).unwrap();
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    return dispatch(logoutUser()).unwrap();
  }, [dispatch]);

  const update = useCallback(
    async (data: Partial<User>) => {
      return dispatch(updateProfile(data)).unwrap();
    },
    [dispatch]
  );

  const loadStored = useCallback(async () => {
    return dispatch(loadStoredAuth()).unwrap();
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    update,
    loadStored,
    clearAuthError,
  };
};
