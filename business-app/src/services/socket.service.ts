import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { updateDeliveryStatus, updateCourierLocation } from '../store/deliverySlice';
import { addNotification } from '../store/uiSlice';

const SOCKET_URL = 'wss://api.ashdod-shaliach.co.il';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('delivery:status_update', (data: { deliveryId: string; status: any; timestamp: string }) => {
      store.dispatch(
        updateDeliveryStatus({
          id: data.deliveryId,
          status: data.status,
          timestamp: data.timestamp,
        })
      );
    });

    this.socket.on('courier:location_update', (data: { deliveryId: string; lat: number; lng: number }) => {
      store.dispatch(
        updateCourierLocation({
          deliveryId: data.deliveryId,
          lat: data.lat,
          lng: data.lng,
        })
      );
    });

    this.socket.on('notification', (data: { title: string; body: string; type: any; deliveryId?: string }) => {
      store.dispatch(
        addNotification({
          id: `notif_${Date.now()}`,
          type: data.type,
          title: data.title,
          body: data.body,
          deliveryId: data.deliveryId,
          read: false,
          createdAt: new Date().toISOString(),
        })
      );
    });

    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  }

  joinDeliveryRoom(deliveryId: string) {
    this.socket?.emit('join:delivery', { deliveryId });
  }

  leaveDeliveryRoom(deliveryId: string) {
    this.socket?.emit('leave:delivery', { deliveryId });
  }

  sendMessage(deliveryId: string, content: string) {
    this.socket?.emit('message:send', { deliveryId, content });
  }

  onMessage(callback: (message: any) => void) {
    this.socket?.on('message:received', callback);
  }

  offMessage() {
    this.socket?.off('message:received');
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
