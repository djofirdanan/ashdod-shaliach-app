// ============================================================
// LOCATION SLICE - אשדוד-שליח Courier App
// ============================================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LocationState, Coordinates } from '../types';

const initialState: LocationState = {
  currentLocation: null,
  isTracking: false,
  lastUpdated: null,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCurrentLocation(state, action: PayloadAction<Coordinates>) {
      state.currentLocation = action.payload;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    setTracking(state, action: PayloadAction<boolean>) {
      state.isTracking = action.payload;
    },
    setLocationError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isTracking = false;
    },
    clearLocation(state) {
      state.currentLocation = null;
      state.isTracking = false;
      state.lastUpdated = null;
      state.error = null;
    },
  },
});

export const { setCurrentLocation, setTracking, setLocationError, clearLocation } =
  locationSlice.actions;
export default locationSlice.reducer;
