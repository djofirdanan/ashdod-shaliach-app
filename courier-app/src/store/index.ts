// ============================================================
// REDUX STORE - אשדוד-שליח Courier App
// ============================================================

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import deliveryReducer from './deliverySlice';
import earningsReducer from './earningsSlice';
import locationReducer from './locationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    delivery: deliveryReducer,
    earnings: earningsReducer,
    location: locationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
