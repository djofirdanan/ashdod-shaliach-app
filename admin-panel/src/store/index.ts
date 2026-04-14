import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import deliveryReducer from './deliverySlice';
import userReducer from './userSlice';
import pricingReducer from './pricingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    deliveries: deliveryReducer,
    users: userReducer,
    pricing: pricingReducer,
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
