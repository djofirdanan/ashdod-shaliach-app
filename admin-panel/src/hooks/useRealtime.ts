import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import { addRealtimeDelivery, updateRealtimeDelivery } from '../store/deliverySlice';
import type { Delivery } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useRealtime = (enabled: boolean = true) => {
  const dispatch = useDispatch<AppDispatch>();
  const socketRef = useRef<ReturnType<typeof import('socket.io-client').io> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let socket: ReturnType<typeof import('socket.io-client').io> | null = null;

    const connect = async () => {
      try {
        const { io } = await import('socket.io-client');
        socket = io(SOCKET_URL, {
          auth: { token: localStorage.getItem('admin_token') },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('delivery:new', (delivery: Delivery) => {
          dispatch(addRealtimeDelivery(delivery));
        });

        socket.on('delivery:updated', (delivery: Delivery) => {
          dispatch(updateRealtimeDelivery(delivery));
        });

        socket.on('connect_error', (err: Error) => {
          console.warn('Socket connection error:', err.message);
        });
      } catch (err) {
        console.warn('Socket.io not available:', err);
      }
    };

    connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [enabled, dispatch]);

  return socketRef;
};
