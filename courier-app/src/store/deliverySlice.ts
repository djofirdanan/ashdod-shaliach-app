// ============================================================
// DELIVERY SLICE - אשדוד-שליח Courier App
// ============================================================

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DeliveryState, Delivery, DeliveryStatus, ProofOfDelivery } from '../types';
import { deliveryService } from '../services/delivery.service';

const initialState: DeliveryState = {
  activeDeliveries: [],
  pendingOffer: null,
  history: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchActiveDeliveries = createAsyncThunk(
  'delivery/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      return await deliveryService.getActiveDeliveries();
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה');
    }
  }
);

export const acceptDelivery = createAsyncThunk(
  'delivery/accept',
  async (deliveryId: string, { rejectWithValue }) => {
    try {
      return await deliveryService.acceptDelivery(deliveryId);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בקבלת משלוח');
    }
  }
);

export const declineDelivery = createAsyncThunk(
  'delivery/decline',
  async (deliveryId: string, { rejectWithValue }) => {
    try {
      await deliveryService.declineDelivery(deliveryId);
      return deliveryId;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בדחיית משלוח');
    }
  }
);

export const updateDeliveryStatus = createAsyncThunk(
  'delivery/updateStatus',
  async (
    { deliveryId, status }: { deliveryId: string; status: DeliveryStatus },
    { rejectWithValue }
  ) => {
    try {
      return await deliveryService.updateStatus(deliveryId, status);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בעדכון סטטוס');
    }
  }
);

export const submitProofOfDelivery = createAsyncThunk(
  'delivery/submitProof',
  async (
    { deliveryId, proof }: { deliveryId: string; proof: ProofOfDelivery },
    { rejectWithValue }
  ) => {
    try {
      return await deliveryService.submitProof(deliveryId, proof);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בשליחת אישור');
    }
  }
);

export const fetchDeliveryHistory = createAsyncThunk(
  'delivery/fetchHistory',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      return await deliveryService.getHistory(page, limit);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה');
    }
  }
);

const deliverySlice = createSlice({
  name: 'delivery',
  initialState,
  reducers: {
    setPendingOffer(state, action: PayloadAction<Delivery | null>) {
      state.pendingOffer = action.payload;
    },
    clearPendingOffer(state) {
      state.pendingOffer = null;
    },
    addActiveDelivery(state, action: PayloadAction<Delivery>) {
      const exists = state.activeDeliveries.find((d) => d.id === action.payload.id);
      if (!exists) {
        state.activeDeliveries.push(action.payload);
      }
    },
    updateDeliveryInState(state, action: PayloadAction<Partial<Delivery> & { id: string }>) {
      const index = state.activeDeliveries.findIndex((d) => d.id === action.payload.id);
      if (index !== -1) {
        state.activeDeliveries[index] = {
          ...state.activeDeliveries[index],
          ...action.payload,
        };
      }
    },
    removeActiveDelivery(state, action: PayloadAction<string>) {
      state.activeDeliveries = state.activeDeliveries.filter((d) => d.id !== action.payload);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch active
    builder
      .addCase(fetchActiveDeliveries.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchActiveDeliveries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeDeliveries = action.payload;
      })
      .addCase(fetchActiveDeliveries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Accept delivery
    builder
      .addCase(acceptDelivery.fulfilled, (state, action) => {
        state.pendingOffer = null;
        const exists = state.activeDeliveries.find((d) => d.id === action.payload.id);
        if (!exists) {
          state.activeDeliveries.push(action.payload);
        }
      })
      .addCase(acceptDelivery.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Decline delivery
    builder.addCase(declineDelivery.fulfilled, (state) => {
      state.pendingOffer = null;
    });

    // Update status
    builder.addCase(updateDeliveryStatus.fulfilled, (state, action) => {
      const index = state.activeDeliveries.findIndex((d) => d.id === action.payload.id);
      if (index !== -1) {
        state.activeDeliveries[index] = action.payload;
      }
      // If delivered or cancelled, move to history
      if (
        action.payload.status === 'delivered' ||
        action.payload.status === 'cancelled' ||
        action.payload.status === 'failed'
      ) {
        state.activeDeliveries = state.activeDeliveries.filter(
          (d) => d.id !== action.payload.id
        );
        state.history.unshift(action.payload);
      }
    });

    // Submit proof
    builder.addCase(submitProofOfDelivery.fulfilled, (state, action) => {
      const index = state.activeDeliveries.findIndex((d) => d.id === action.payload.id);
      if (index !== -1) {
        state.activeDeliveries[index] = action.payload;
      }
    });

    // Fetch history
    builder
      .addCase(fetchDeliveryHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      });
  },
});

export const {
  setPendingOffer,
  clearPendingOffer,
  addActiveDelivery,
  updateDeliveryInState,
  removeActiveDelivery,
  clearError,
} = deliverySlice.actions;

export default deliverySlice.reducer;
