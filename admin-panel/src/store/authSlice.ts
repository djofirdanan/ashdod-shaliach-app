import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, AdminUser } from '../types';
import * as authService from '../services/auth.service';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await authService.loginWithEmail(email, password);
      return result.user;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בהתחברות');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AdminUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearError(state) {
      state.error = null;
    },
    // Demo login without Firebase
    demoLogin(state) {
      state.user = {
        id: 'demo-admin',
        name: 'מנהל מערכת',
        email: 'admin@ashdod-shaliach.co.il',
        role: 'super_admin',
        createdAt: new Date().toISOString(),
      };
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      localStorage.setItem('admin_token', 'demo-token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser, clearError, demoLogin } = authSlice.actions;
export default authSlice.reducer;
