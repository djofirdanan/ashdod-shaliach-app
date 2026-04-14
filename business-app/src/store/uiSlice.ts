import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, Notification } from '../types';

const initialState: UIState = {
  isDarkMode: false,
  language: 'he',
  notifications: [],
  unreadCount: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'he' | 'en'>) => {
      state.language = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach((n) => (n.read = true));
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  toggleDarkMode,
  setDarkMode,
  setLanguage,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
