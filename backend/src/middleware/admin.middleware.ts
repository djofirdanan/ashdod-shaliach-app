// ============================================================
// אשדוד-שליח – Admin Middleware
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { errorResponse } from '../utils/helpers';

export function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json(errorResponse('Unauthorized', 'Not authenticated'));
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json(errorResponse('Forbidden', 'Admin access required'));
    return;
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('Unauthorized', 'Not authenticated'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(
        errorResponse('Forbidden', `Access restricted to: ${roles.join(', ')}`)
      );
      return;
    }

    next();
  };
}
