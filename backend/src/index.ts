// ============================================================
// אשדוד-שליח – Main Application Entry Point
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import logger from './utils/logger';
import { initializeFirebase } from './config/firebase';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import deliveryRoutes from './routes/delivery.routes';
import courierRoutes from './routes/courier.routes';
import businessRoutes from './routes/business.routes';
import pricingRoutes from './routes/pricing.routes';
import adminRoutes from './routes/admin.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import aiRoutes from './routes/ai.routes';

// Services that need the socket server
import { setSocketServer } from './services/dispatch.service';
import { setChatSocketServer } from './services/chat.service';
import { setNotificationSocketServer } from './services/notification.service';

// ─────────────────────────────────────────
// Firebase init
// ─────────────────────────────────────────

initializeFirebase();

// ─────────────────────────────────────────
// Express app
// ─────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

// ─────────────────────────────────────────
// Socket.io
// ─────────────────────────────────────────

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new SocketServer(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Register socket server with services
setSocketServer(io);
setChatSocketServer(io);
setNotificationSocketServer(io);

// ─────────────────────────────────────────
// Socket.io event handlers
// ─────────────────────────────────────────

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Client identifies itself (user or courier)
  socket.on('join:user', (userId: string) => {
    if (typeof userId === 'string' && userId.length > 0) {
      socket.join(`user:${userId}`);
      logger.debug(`Socket ${socket.id} joined room user:${userId}`);
    }
  });

  socket.on('join:courier', (courierId: string) => {
    if (typeof courierId === 'string' && courierId.length > 0) {
      socket.join(`courier:${courierId}`);
      logger.debug(`Socket ${socket.id} joined room courier:${courierId}`);
    }
  });

  socket.on('join:delivery', (deliveryId: string) => {
    if (typeof deliveryId === 'string' && deliveryId.length > 0) {
      socket.join(`delivery:${deliveryId}`);
      logger.debug(`Socket ${socket.id} joined room delivery:${deliveryId}`);
    }
  });

  socket.on('leave:delivery', (deliveryId: string) => {
    if (typeof deliveryId === 'string') {
      socket.leave(`delivery:${deliveryId}`);
    }
  });

  // Real-time courier location update via socket
  socket.on('courier:location', (data: { courierId: string; latitude: number; longitude: number }) => {
    if (data?.courierId && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      // Broadcast to admins and interested parties
      io.emit('location:update', data);
    }
  });

  // Delivery status updates via socket (backup to REST)
  socket.on('delivery:status', (data: { deliveryId: string; status: string; courierId?: string }) => {
    if (data?.deliveryId && data?.status) {
      io.to(`delivery:${data.deliveryId}`).emit('delivery:update', data);
    }
  });

  // Chat message via socket
  socket.on('chat:message', (data: { deliveryId: string; message: unknown }) => {
    if (data?.deliveryId) {
      io.to(`delivery:${data.deliveryId}`).emit('chat:message', data.message);
    }
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────
// Express middleware
// ─────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // Disabled for mobile app compatibility
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.path === '/health',
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─────────────────────────────────────────
// Health check
// ─────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'אשדוד-שליח API',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

// ─────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/deliveries`, deliveryRoutes);
app.use(`${API_PREFIX}/couriers`, courierRoutes);
app.use(`${API_PREFIX}/businesses`, businessRoutes);
app.use(`${API_PREFIX}/pricing`, pricingRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);

// ─────────────────────────────────────────
// 404 & error handlers
// ─────────────────────────────────────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─────────────────────────────────────────
// Start server
// ─────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

const server = httpServer.listen(PORT, HOST, () => {
  logger.info(`🚀 אשדוד-שליח API server running on http://${HOST}:${PORT}`);
  logger.info(`📡 Socket.io ready`);
  logger.info(`🌿 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  logger.info(`📋 API prefix: ${API_PREFIX}`);
});

// ─────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────

function gracefulShutdown(signal: string): void {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      logger.error('Error during server close:', err);
      process.exit(1);
    }

    io.close(() => {
      logger.info('Socket.io server closed');
    });

    logger.info('HTTP server closed. Exiting.');
    process.exit(0);
  });

  // Force exit after 30s
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 30000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

export { app, io };
export default app;
