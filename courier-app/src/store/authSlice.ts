// ============================================================
// AUTH SLICE - אשדוד-שליח Courier App
// ============================================================

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState, Courier } from '../types';
import { authService } from '../services/auth.service';

const initialState: AuthState = {
  courier: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Async thunks
export const loginCourier = createAsyncThunk(
  'auth/login',
  async (
    { phone, password }: { phone: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.login(phone, password);
      await AsyncStorage.setItem('auth_token', response.token);
      await AsyncStorage.setItem('courier_data', JSON.stringify(response.courier));
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'שגיאת התחברות';
      return rejectWithValue(message);
    }
  }
);

export const registerCourier = createAsyncThunk(
  'auth/register',
  async (
    data: {
      name: string;
      phone: string;
      email: string;
      password: string;
      vehicleType: string;
      vehiclePlate?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.register(data);
      await AsyncStorage.setItem('auth_token', response.token);
      await AsyncStorage.setItem('courier_data', JSON.stringify(response.courier));
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'שגיאת הרשמה';
      return rejectWithValue(message);
    }
  }
);

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const courierData = await AsyncStorage.getItem('courier_data');
    if (token && courierData) {
      const courier = JSON.parse(courierData) as Courier;
      return { token, courier };
    }
    return null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'שגיאה';
    return rejectWithValue(message);
  }
});

export const logoutCourier = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('courier_data');
  await authService.logout();
});

export const updateCourierStatus = createAsyncThunk(
  'auth/updateStatus',
  async (status: 'available' | 'busy' | 'offline', { rejectWithValue }) => {
    try {
      await authService.updateStatus(status);
      return status;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'שגיאה בעדכון סטטוס';
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    updateCourier(state, action: PayloadAction<Partial<Courier>>) {
      if (state.courier) {
        state.courier = { ...state.courier, ...action.payload };
      }
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginCourier.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginCourier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.courier = action.payload.courier;
        state.token = action.payload.token;
      })
      .addCase(loginCourier.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(registerCourier.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerCourier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.courier = action.payload.courier;
        state.token = action.payload.token;
      })
      .addCase(registerCourier.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load stored
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.courier = action.payload.courier;
          state.token = action.payload.token;
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });

    // Logout
    builder.addCase(logoutCourier.fulfilled, (state) => {
      state.courier = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    // Update status
    builder.addCase(updateCourierStatus.fulfilled, (state, action) => {
      if (state.courier) {
        state.courier.status = action.payload;
      }
    });
  },
});

export const { clearError, updateCourier, setToken } = authSlice.actions;
export default authSlice.reducer;
