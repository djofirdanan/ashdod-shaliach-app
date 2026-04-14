// ============================================================
// אשדוד-שליח – Auth Middleware
// Verifies Firebase ID token, loads user from Firestore
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthRequest, User } from '../types';
import { verifyIdToken, queryDocuments } from '../services/firebase.service';
import { COLLECTION_USERS } from '../config/constants';
import { errorResponse } from '../utils/helpers';
import logger from '../utils/logger';

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json(errorResponse('Unauthorized', 'Missing or invalid Authorization header'));
      return;
    }

    const idToken = authHeader.slice(7);
    const decoded = await verifyIdToken(idToken);
    req.firebaseUid = decoded.uid;

    // Load user from Firestore
    const users = await queryDocuments<User>(COLLECTION_USERS, [
      { field: 'firebaseUid', op: '==', value: decoded.uid },
      { field: 'isActive', op: '==', value: true },
    ]);

    if (users.length === 0) {
      res.status(401).json(errorResponse('Unauthorized', 'User not found or inactive'));
      return;
    }

    req.user = users[0];
    next();
  } catch (err: unknown) {
    logger.warn('Auth middleware error:', err);
    const message = err instanceof Error ? err.message : 'Authentication failed';
    res.status(401).json(errorResponse('Unauthorized', message));
  }
}

/**
 * Optional auth – attaches user if token present, but doesn't fail if missing.
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  await authMiddleware(req, res, next);
}
