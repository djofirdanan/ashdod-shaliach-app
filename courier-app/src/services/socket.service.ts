// ============================================================
// SOCKET SERVICE - Real-time updates - אשדוד-שליח
// ============================================================

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Delivery, Coordinates } from '../types';

const SOCKET_URL = 'https://api.ashdod-shaliach.co.il';

type EventCallback<T = unknown> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private listeners: Map<string, EventCallback[]> = new Map();

  /**
   * Connect to socket server
   */
  async connect(): Promise<void> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      console.warn('No auth token for socket connection');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupListeners();
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Setup base socket event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.emit('courier:online', {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    // Delivery events
    this.socket.on('delivery:new_offer', (delivery: Delivery) => {
      this.notifyListeners('delivery:new_offer', delivery);
    });

    this.socket.on('delivery:offer_expired', (deliveryId: string) => {
      this.notifyListeners('delivery:offer_expired', deliveryId);
    });

    this.socket.on('delivery:cancelled', (deliveryId: string) => {
      this.notifyListeners('delivery:cancelled', deliveryId);
    });

    this.socket.on('delivery:updated', (delivery: Delivery) => {
      this.notifyListeners('delivery:updated', delivery);
    });

    // Chat events
    this.socket.on('chat:message', (message: unknown) => {
      this.notifyListeners('chat:message', message);
    });

    // System events
    this.socket.on('system:alert', (alert: unknown) => {
      this.notifyListeners('system:alert', alert);
    });

    this.socket.on('zone:update', (zones: unknown) => {
      this.notifyListeners('zone:update', zones);
    });
  }

  /**
   * Emit event to server
   */
  emit(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Subscribe to a socket event
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback as EventCallback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event) || [];
      const index = eventListeners.indexOf(callback as EventCallback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: unknown): void {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach((callback) => callback(data));
  }

  /**
   * Send current courier location
   */
  updateLocation(location: Coordinates): void {
    this.emit('courier:location', {
      ...location,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Join a delivery room for real-time updates
   */
  joinDeliveryRoom(deliveryId: string): void {
    this.emit('delivery:join', { deliveryId });
  }

  /**
   * Leave a delivery room
   */
  leaveDeliveryRoom(deliveryId: string): void {
    this.emit('delivery:leave', { deliveryId });
  }

  /**
   * Send a chat message
   */
  sendMessage(deliveryId: string, content: string, recipientId: string): void {
    this.emit('chat:send', {
      deliveryId,
      content,
      recipientId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
