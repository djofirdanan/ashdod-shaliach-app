import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { DeliveryState, Delivery, DeliveryStatus } from '../types';
import * as deliveryService from '../services/delivery.service';

const initialState: DeliveryState = {
  deliveries: [],
  activeDeliveries: [],
  selectedDelivery: null,
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    courierId: '',
    businessId: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

export const fetchDeliveries = createAsyncThunk(
  'deliveries/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { deliveries: DeliveryState };
      const { filters, pagination } = state.deliveries;
      return await deliveryService.fetchDeliveries({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בטעינת משלוחים');
    }
  }
);

export const fetchActiveDeliveries = createAsyncThunk(
  'deliveries/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      return await deliveryService.fetchActiveDeliveries();
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בטעינת משלוחים פעילים');
    }
  }
);

export const updateStatus = createAsyncThunk(
  'deliveries/updateStatus',
  async ({ id, status }: { id: string; status: DeliveryStatus }, { rejectWithValue }) => {
    try {
      return await deliveryService.updateDeliveryStatus(id, status);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בעדכון סטטוס');
    }
  }
);

const deliverySlice = createSlice({
  name: 'deliveries',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<DeliveryState['filters']>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },
    setSelectedDelivery(state, action: PayloadAction<Delivery | null>) {
      state.selectedDelivery = action.payload;
    },
    addRealtimeDelivery(state, action: PayloadAction<Delivery>) {
      const exists = state.deliveries.find((d) => d.id === action.payload.id);
      if (!exists) {
        state.deliveries.unshift(action.payload);
        state.pagination.total += 1;
      }
    },
    updateRealtimeDelivery(state, action: PayloadAction<Delivery>) {
      const idx = state.deliveries.findIndex((d) => d.id === action.payload.id);
      if (idx !== -1) state.deliveries[idx] = action.payload;
      const activeIdx = state.activeDeliveries.findIndex((d) => d.id === action.payload.id);
      if (activeIdx !== -1) state.activeDeliveries[activeIdx] = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDeliveries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.deliveries = action.payload.data;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchDeliveries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchActiveDeliveries.fulfilled, (state, action) => {
        state.activeDeliveries = action.payload;
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        const idx = state.deliveries.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.deliveries[idx] = action.payload;
      });
  },
});

export const {
  setFilters,
  setPage,
  setSelectedDelivery,
  addRealtimeDelivery,
  updateRealtimeDelivery,
} = deliverySlice.actions;
export default deliverySlice.reducer;
