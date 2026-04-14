import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { UserState, Courier, Business } from '../types';
import * as userService from '../services/user.service';

const initialState: UserState = {
  couriers: [],
  businesses: [],
  selectedCourier: null,
  selectedBusiness: null,
  isLoading: false,
  error: null,
};

export const fetchCouriers = createAsyncThunk(
  'users/fetchCouriers',
  async (params: Parameters<typeof userService.fetchCouriers>[0] = {}, { rejectWithValue }) => {
    try {
      return await userService.fetchCouriers(params);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בטעינת שליחים');
    }
  }
);

export const fetchBusinesses = createAsyncThunk(
  'users/fetchBusinesses',
  async (params: Parameters<typeof userService.fetchBusinesses>[0] = {}, { rejectWithValue }) => {
    try {
      return await userService.fetchBusinesses(params);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בטעינת עסקים');
    }
  }
);

export const blockCourierAction = createAsyncThunk(
  'users/blockCourier',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      return await userService.blockCourier(id, reason);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בחסימת שליח');
    }
  }
);

export const unblockCourierAction = createAsyncThunk(
  'users/unblockCourier',
  async (id: string, { rejectWithValue }) => {
    try {
      return await userService.unblockCourier(id);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בביטול חסימת שליח');
    }
  }
);

export const blockBusinessAction = createAsyncThunk(
  'users/blockBusiness',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      return await userService.blockBusiness(id, reason);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בחסימת עסק');
    }
  }
);

export const unblockBusinessAction = createAsyncThunk(
  'users/unblockBusiness',
  async (id: string, { rejectWithValue }) => {
    try {
      return await userService.unblockBusiness(id);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בביטול חסימת עסק');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setSelectedCourier(state, action: PayloadAction<Courier | null>) {
      state.selectedCourier = action.payload;
    },
    setSelectedBusiness(state, action: PayloadAction<Business | null>) {
      state.selectedBusiness = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCouriers.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCouriers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.couriers = action.payload.data;
      })
      .addCase(fetchCouriers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBusinesses.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchBusinesses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.businesses = action.payload.data;
      })
      .addCase(fetchBusinesses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(blockCourierAction.fulfilled, (state, action) => {
        const idx = state.couriers.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.couriers[idx] = action.payload;
      })
      .addCase(unblockCourierAction.fulfilled, (state, action) => {
        const idx = state.couriers.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.couriers[idx] = action.payload;
      })
      .addCase(blockBusinessAction.fulfilled, (state, action) => {
        const idx = state.businesses.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) state.businesses[idx] = action.payload;
      })
      .addCase(unblockBusinessAction.fulfilled, (state, action) => {
        const idx = state.businesses.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) state.businesses[idx] = action.payload;
      });
  },
});

export const { setSelectedCourier, setSelectedBusiness } = userSlice.actions;
export default userSlice.reducer;
