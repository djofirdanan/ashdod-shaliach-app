import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { loginUser, logoutUser, demoLogin } from '../store/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const login = (email: string, password: string) => {
    return dispatch(loginUser({ email, password }));
  };

  const loginDemo = () => {
    dispatch(demoLogin());
  };

  const logout = () => {
    return dispatch(logoutUser());
  };

  return { user, isAuthenticated, isLoading, error, login, loginDemo, logout };
};
