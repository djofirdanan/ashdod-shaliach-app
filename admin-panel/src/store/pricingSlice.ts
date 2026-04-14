import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PricingState, PricingZone, PriceHistory } from '../types';
import { DEFAULT_PRICING_ZONES } from '../utils/constants';

const initialState: PricingState = {
  zones: DEFAULT_PRICING_ZONES.map((z) => ({
    ...z,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  })),
  priceHistory: [],
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
};

export const fetchPricingZones = createAsyncThunk(
  'pricing/fetchZones',
  async (_, { rejectWithValue }) => {
    try {
      // In production this would call the API. For now return defaults with timestamps.
      return DEFAULT_PRICING_ZONES.map((z) => ({
        ...z,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      }));
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בטעינת תמחור');
    }
  }
);

export const savePricingChanges = createAsyncThunk(
  'pricing/saveChanges',
  async (zones: PricingZone[], { rejectWithValue }) => {
    try {
      // In production: await pricingService.bulkUpdatePricing(...)
      return zones.map((z) => ({ ...z, updatedAt: new Date().toISOString() }));
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'שגיאה בשמירת תמחור');
    }
  }
);

const pricingSlice = createSlice({
  name: 'pricing',
  initialState,
  reducers: {
    updateZonePrice(
      state,
      action: PayloadAction<{ id: string; basePrice: number }>
    ) {
      const zone = state.zones.find((z) => z.id === action.payload.id);
      if (zone) {
        zone.basePrice = action.payload.basePrice;
        state.hasUnsavedChanges = true;
      }
    },
    toggleZoneActive(state, action: PayloadAction<string>) {
      const zone = state.zones.find((z) => z.id === action.payload);
      if (zone) {
        zone.isActive = !zone.isActive;
        state.hasUnsavedChanges = true;
      }
    },
    addPriceHistory(state, action: PayloadAction<PriceHistory>) {
      state.priceHistory.unshift(action.payload);
    },
    clearUnsavedChanges(state) {
      state.hasUnsavedChanges = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPricingZones.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchPricingZones.fulfilled, (state, action) => {
        state.isLoading = false;
        state.zones = action.payload;
      })
      .addCase(fetchPricingZones.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(savePricingChanges.pending, (state) => { state.isLoading = true; })
      .addCase(savePricingChanges.fulfilled, (state, action) => {
        state.isLoading = false;
        state.zones = action.payload;
        state.hasUnsavedChanges = false;
      })
      .addCase(savePricingChanges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { updateZonePrice, toggleZoneActive, addPriceHistory, clearUnsavedChanges } =
  pricingSlice.actions;
export default pricingSlice.reducer;
