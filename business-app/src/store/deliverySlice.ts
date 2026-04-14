import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DeliveryState, Delivery, DashboardStats } from '../types';
import { deliveryService } from '../services/delivery.service';

const initialState: DeliveryState = {
  activeDeliveries: [],
  historyDeliveries: [],
  currentDelivery: null,
  stats: null,
  isLoading: false,
  error: null,
};

export const fetchActiveDeliveries = createAsyncThunk(
  'delivery/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      return await deliveryService.getActiveDeliveries();
    } catch (error: any) {
      return rejectWithValue(error.message || 'שגיאה בטעינת משלוחים פעילים');
    }
  }
);

export const fetchDeliveryHistory = createAsyncThunk(
  'delivery/fetchHistory',
  async (
    params: { page?: number; limit?: number; startDate?: string; endDate?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      return await deliveryService.getDeliveryHistory(params);
    } catch (error: any) {
      return rejectWithValue(error.message || 'שגיאה בטעינת היסטוריה');
    }
  }
);

export const fetchDeliveryById = createAsyncThunk(
  'delivery/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await deliveryService.getDeliveryById(id);
    } catch (error: any) {
      return rejectWithValue(error.message || 'שגיאה בטעינת פרטי משלוח');
    }
  }
);

export const createDelivery = createAsyncThunk(
  'delivery/create',
  async (data: Partial<Delivery>, { rejectWithValue }) => {
    try {
      return await deliveryService.createDelivery(data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'שגיאה ביצירת משלוח');
    }
  }
);

export const cancelDelivery = createAsyncThunk(
  'delivery/cancel',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await deliveryService.cancelDelivery(id, reason);
    } catch (error: any) {
      return rejectWithValue(error.message || 'שגיאה בביטול משלוח');
    }
  }
);

export const rateDelivery = createAsyncThunk(
  'delivery/rate',
  async (
    { id, rating, comment }: { id: string; rating: number; comment?: string },
    { rejectWithValue }
  ) => {
    try {
      return await deliveryService.rateDelivery(id, rating, comment);
    } catch (error: any) {
      return rejectWithValue(error.message || 'שגיאה בדירוג משלוח');
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'delivery/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await deliveryService.getDashboardStats();
    } catch (error: any) {
      return rejectWithValue(error.message || 'שגיאה בטעינת סטטיסטיקות');
    }
  }
);

const deliverySlice = createSlice({
  name: 'delivery',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentDelivery: (state, action: PayloadAction<Delivery | null>) => {
      state.currentDelivery = action.payload;
    },
    updateDeliveryStatus: (
      state,
      action: PayloadAction<{ id: string; status: Delivery['status']; timestamp: string }>
    ) => {
      const { id, status, timestamp } = action.payload;
      const activeIdx = state.activeDeliveries.findIndex((d) => d.id === id);
      if (activeIdx !== -1) {
        state.activeDeliveries[activeIdx].status = status;
        state.activeDeliveries[activeIdx].updatedAt = timestamp;
        if (status === 'delivered' || status === 'cancelled' || status === 'failed') {
          const delivery = state.activeDeliveries.splice(activeIdx, 1)[0];
          state.historyDeliveries.unshift(delivery);
        }
      }
      if (state.currentDelivery?.id === id) {
        state.currentDelivery.status = status;
        state.currentDelivery.updatedAt = timestamp;
      }
    },
    updateCourierLocation: (
      state,
      action: PayloadAction<{ deliveryId: string; lat: number; lng: number }>
    ) => {
      const { deliveryId, lat, lng } = action.payload;
      const delivery = state.activeDeliveries.find((d) => d.id === deliveryId);
      if (delivery?.courier) {
        delivery.courier.currentLocation = { lat, lng };
      }
      if (state.currentDelivery?.id === deliveryId && state.currentDelivery.courier) {
        state.currentDelivery.courier.currentLocation = { lat, lng };
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch active
    builder.addCase(fetchActiveDeliveries.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchActiveDeliveries.fulfilled, (state, action) => {
      state.isLoading = false;
      state.activeDeliveries = action.payload;
    });
    builder.addCase(fetchActiveDeliveries.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch history
    builder.addCase(fetchDeliveryHistory.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchDeliveryHistory.fulfilled, (state, action) => {
      state.isLoading = false;
      state.historyDeliveries = action.payload;
    });
    builder.addCase(fetchDeliveryHistory.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch by id
    builder.addCase(fetchDeliveryById.fulfilled, (state, action) => {
      state.currentDelivery = action.payload;
    });

    // Create
    builder.addCase(createDelivery.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createDelivery.fulfilled, (state, action) => {
      state.isLoading = false;
      state.activeDeliveries.unshift(action.payload);
      state.currentDelivery = action.payload;
    });
    builder.addCase(createDelivery.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Cancel
    builder.addCase(cancelDelivery.fulfilled, (state, action) => {
      const id = action.meta.arg.id;
      state.activeDeliveries = state.activeDeliveries.filter((d) => d.id !== id);
      if (state.currentDelivery?.id === id) {
        state.currentDelivery.status = 'cancelled';
      }
    });

    // Rate
    builder.addCase(rateDelivery.fulfilled, (state, action) => {
      const delivery = state.historyDeliveries.find((d) => d.id === action.payload.id);
      if (delivery) {
        delivery.rating = action.payload.rating;
        delivery.ratingComment = action.payload.ratingComment;
      }
    });

    // Stats
    builder.addCase(fetchDashboardStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });
  },
});

export const { clearError, setCurrentDelivery, updateDeliveryStatus, updateCourierLocation } =
  deliverySlice.actions;
export default deliverySlice.reducer;
