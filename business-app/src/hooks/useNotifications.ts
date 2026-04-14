import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
} from '../store/uiSlice';
import { notificationService } from '../services/notification.service';

export const useNotifications = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, unreadCount } = useSelector((state: RootState) => state.ui);

  useEffect(() => {
    notificationService.setBadgeCount(unreadCount);
  }, [unreadCount]);

  const markRead = useCallback(
    (id: string) => {
      dispatch(markNotificationRead(id));
    },
    [dispatch]
  );

  const markAllRead = useCallback(() => {
    dispatch(markAllNotificationsRead());
  }, [dispatch]);

  const clear = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);

  const sendLocal = useCallback(
    async (title: string, body: string, data?: Record<string, unknown>) => {
      await notificationService.scheduleLocalNotification(title, body, data);
    },
    []
  );

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    clear,
    sendLocal,
  };
};
