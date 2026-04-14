// ============================================================
// אשדוד-שליח – Auth Controller
// ============================================================

import { Response } from 'express';
import { AuthRequest, UserRole, User, Business, Courier } from '../types';
import {
  verifyIdToken,
  createDocument,
  updateDocument,
  queryDocuments,
} from '../services/firebase.service';
import { createBusinessUser, createCourierUser, createUserBase } from '../models/user.model';
import { COLLECTION_USERS } from '../config/constants';
import { successResponse, errorResponse } from '../utils/helpers';
import logger from '../utils/logger';

export const authController = {
  /**
   * POST /auth/register
   * Body: { idToken, role, name, phone, email, [businessName, businessAddress, contactPerson], [vehicleType, vehiclePlate] }
   */
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { idToken, role, name, phone, email, fcmToken } = req.body;

      if (!idToken || !role || !name || !phone || !email) {
        res.status(400).json(errorResponse('Bad Request', 'idToken, role, name, phone, email are required'));
        return;
      }

      if (!Object.values(UserRole).includes(role)) {
        res.status(400).json(errorResponse('Bad Request', `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`));
        return;
      }

      // Verify Firebase token
      let decoded: { uid: string; email?: string };
      try {
        decoded = await verifyIdToken(idToken);
      } catch {
        res.status(401).json(errorResponse('Unauthorized', 'Invalid Firebase ID token'));
        return;
      }

      // Check if user already exists
      const existing = await queryDocuments<User>(COLLECTION_USERS, [
        { field: 'firebaseUid', op: '==', value: decoded.uid },
      ]);

      if (existing.length > 0) {
        res.status(409).json(errorResponse('Conflict', 'User already registered'));
        return;
      }

      let newUser: User | Business | Courier;

      if (role === UserRole.BUSINESS) {
        const { businessName, businessAddress, contactPerson } = req.body;
        if (!businessName || !businessAddress || !contactPerson) {
          res.status(400).json(errorResponse('Bad Request', 'businessName, businessAddress, contactPerson are required for business accounts'));
          return;
        }
        newUser = createBusinessUser({
          firebaseUid: decoded.uid,
          name,
          email,
          phone,
          businessName,
          businessAddress,
          contactPerson,
          fcmToken,
        });
      } else if (role === UserRole.COURIER) {
        const { vehicleType, vehiclePlate } = req.body;
        if (!vehicleType) {
          res.status(400).json(errorResponse('Bad Request', 'vehicleType is required for courier accounts'));
          return;
        }
        newUser = createCourierUser({
          firebaseUid: decoded.uid,
          name,
          email,
          phone,
          vehicleType,
          vehiclePlate,
          fcmToken,
        });
      } else {
        // Admin registration (role = admin)
        newUser = createUserBase({ firebaseUid: decoded.uid, name, email, phone, role, fcmToken });
      }

      await createDocument(COLLECTION_USERS, newUser);

      logger.info(`New user registered: ${newUser.id} (${role})`);
      res.status(201).json(successResponse(newUser, 'Registration successful'));
    } catch (err) {
      logger.error('Register error:', err);
      res.status(500).json(errorResponse('Internal Server Error', 'Registration failed'));
    }
  },

  /**
   * POST /auth/login
   * Body: { idToken, fcmToken? }
   */
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { idToken, fcmToken } = req.body;
      if (!idToken) {
        res.status(400).json(errorResponse('Bad Request', 'idToken is required'));
        return;
      }

      let decoded: { uid: string; email?: string };
      try {
        decoded = await verifyIdToken(idToken);
      } catch {
        res.status(401).json(errorResponse('Unauthorized', 'Invalid Firebase ID token'));
        return;
      }

      const users = await queryDocuments<User>(COLLECTION_USERS, [
        { field: 'firebaseUid', op: '==', value: decoded.uid },
      ]);

      if (users.length === 0) {
        res.status(404).json(errorResponse('Not Found', 'User not registered. Please register first.'));
        return;
      }

      const user = users[0];

      if (!user.isActive) {
        res.status(403).json(errorResponse('Forbidden', 'Account is blocked or inactive'));
        return;
      }

      // Update FCM token and last login
      const updateData: Partial<User> = { updatedAt: new Date() };
      if (fcmToken && fcmToken !== user.fcmToken) {
        updateData.fcmToken = fcmToken;
      }
      await updateDocument(COLLECTION_USERS, user.id, updateData);

      logger.info(`User logged in: ${user.id} (${user.role})`);
      res.json(successResponse({ user, token: idToken }, 'Login successful'));
    } catch (err) {
      logger.error('Login error:', err);
      res.status(500).json(errorResponse('Internal Server Error', 'Login failed'));
    }
  },

  /**
   * POST /auth/logout
   * Clears FCM token so user stops receiving push notifications.
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized', 'Not authenticated'));
        return;
      }

      await updateDocument(COLLECTION_USERS, user.id, { fcmToken: null, updatedAt: new Date() });

      logger.info(`User logged out: ${user.id}`);
      res.json(successResponse(null, 'Logged out successfully'));
    } catch (err) {
      logger.error('Logout error:', err);
      res.status(500).json(errorResponse('Internal Server Error', 'Logout failed'));
    }
  },

  /**
   * GET /auth/profile
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }
      res.json(successResponse(user));
    } catch (err) {
      logger.error('getProfile error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PUT /auth/profile
   * Allowed fields: name, phone, fcmToken + role-specific fields
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json(errorResponse('Unauthorized'));
        return;
      }

      const allowedBase = ['name', 'phone', 'fcmToken'];
      const allowedBusiness = ['businessName', 'businessAddress', 'contactPerson'];
      const allowedCourier = ['vehicleType', 'vehiclePlate'];

      const updates: Record<string, unknown> = { updatedAt: new Date() };

      for (const field of allowedBase) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      if (user.role === UserRole.BUSINESS) {
        for (const field of allowedBusiness) {
          if (req.body[field] !== undefined) updates[field] = req.body[field];
        }
      }

      if (user.role === UserRole.COURIER) {
        for (const field of allowedCourier) {
          if (req.body[field] !== undefined) updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 1) {
        res.status(400).json(errorResponse('Bad Request', 'No valid fields to update'));
        return;
      }

      await updateDocument(COLLECTION_USERS, user.id, updates);

      const updatedUser = { ...user, ...updates };
      res.json(successResponse(updatedUser, 'Profile updated'));
    } catch (err) {
      logger.error('updateProfile error:', err);
      res.status(500).json(errorResponse('Internal Server Error', 'Update failed'));
    }
  },

  /**
   * POST /auth/verify
   * Verifies a Firebase ID token and returns user info.
   */
  async verifyToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        res.status(400).json(errorResponse('Bad Request', 'idToken is required'));
        return;
      }

      let decoded: { uid: string; email?: string };
      try {
        decoded = await verifyIdToken(idToken);
      } catch {
        res.status(401).json(errorResponse('Unauthorized', 'Invalid or expired token'));
        return;
      }

      const users = await queryDocuments<User>(COLLECTION_USERS, [
        { field: 'firebaseUid', op: '==', value: decoded.uid },
      ]);

      if (users.length === 0) {
        res.json(successResponse({ valid: true, registered: false, uid: decoded.uid }));
        return;
      }

      const user = users[0];
      res.json(successResponse({ valid: true, registered: true, user }));
    } catch (err) {
      logger.error('verifyToken error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
