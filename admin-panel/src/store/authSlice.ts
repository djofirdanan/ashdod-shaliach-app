import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AdminUser } from '../types';
import * as storageService from '../services/storage.service';

// Extended auth state with currentPortalUser
interface ExtendedAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentPortalUser: { id: string; type: 'business' | 'courier'; name: string } | null;
}

const initialState: ExtendedAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  currentPortalUser: null,
};

// Hardcoded admin credentials
const ADMIN_EMAIL = 'djofirdanan@gmail.com';
const ADMIN_PASSWORD = '339529Aa!@';
const ADMIN_USER: AdminUser = {
  id: 'admin-main',
  name: 'דניאל פירדנן',
  email: 'djofirdanan@gmail.com',
  role: 'super_admin',
  createdAt: new Date().toISOString(),
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // 1. Check hardcoded admin
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
        localStorage.setItem('admin_token', 'admin-token');
        return { user: ADMIN_USER, role: 'admin' as const };
      }

      // 2. Check localStorage businesses
      const business = storageService.getBusinessByEmail(email);
      if (business) {
        if (!storageService.verifyPassword(password, business.password)) {
          return rejectWithValue('סיסמה שגויה');
        }
        if (business.isBlocked) {
          return rejectWithValue('החשבון חסום. פנה למנהל המערכת');
        }
        if (!business.isActive) {
          return rejectWithValue('החשבון ממתין לאישור המנהל. תקבל מייל כשיאושר ✉️');
        }
        localStorage.setItem('admin_token', `business-${business.id}`);
        const user: AdminUser = {
          id: business.id,
          name: business.businessName,
          email: business.email,
          role: 'admin',
          createdAt: business.createdAt,
        };
        return { user, role: 'business' as const };
      }

      // 3. Check localStorage couriers
      const courier = storageService.getCourierByEmail(email);
      if (courier) {
        if (!storageService.verifyPassword(password, courier.password)) {
          return rejectWithValue('סיסמה שגויה');
        }
        if (courier.isBlocked) {
          return rejectWithValue('החשבון חסום. פנה למנהל המערכת');
        }
        if (!courier.isActive) {
          return rejectWithValue('החשבון ממתין לאישור המנהל. תקבל מייל כשיאושר ✉️');
        }
        localStorage.setItem('admin_token', `courier-${courier.id}`);
        const user: AdminUser = {
          id: courier.id,
          name: courier.name,
          email: courier.email,
          role: 'admin',
          createdAt: courier.createdAt,
        };
        return { user, role: 'courier' as const };
      }

      // No match found
      return rejectWithValue('אימייל או סיסמה שגויים');
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בהתחברות');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('admin_token');
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
    setPortalUser(
      state,
      action: PayloadAction<{ id: string; type: 'business' | 'courier'; name: string } | null>
    ) {
      state.currentPortalUser = action.payload;
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
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.currentPortalUser = null;
      });
  },
});

export const { setUser, clearError, setPortalUser } = authSlice.actions;
export default authSlice.reducer;
