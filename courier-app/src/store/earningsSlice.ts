// ============================================================
// EARNINGS SLICE - אשדוד-שליח Courier App
// ============================================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { EarningsState } from '../types';
import { deliveryService } from '../services/delivery.service';

const initialState: EarningsState = {
  summary: null,
  isLoading: false,
  error: null,
};

export const fetchEarningsSummary = createAsyncThunk(
  'earnings/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      return await deliveryService.getEarningsSummary();
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בטעינת רווחים');
    }
  }
);

const earningsSlice = createSlice({
  name: 'earnings',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEarningsSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEarningsSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchEarningsSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = earningsSlice.actions;
export default earningsSlice.reducer;
