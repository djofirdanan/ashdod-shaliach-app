// ============================================================
// אשדוד-שליח – Error Handling Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { errorResponse } from '../utils/helpers';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(errorResponse('Not Found', `Route ${req.method} ${req.path} not found`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.details));
    return;
  }

  // Firestore / Firebase errors
  if ((err as { code?: string }).code?.startsWith('firestore/') ||
      (err as { code?: string }).code?.startsWith('auth/')) {
    logger.warn('Firebase error:', err.message);
    res.status(503).json(errorResponse('Service Unavailable', 'Database error'));
    return;
  }

  logger.error('Unhandled error:', err);

  res.status(500).json(
    errorResponse(
      'Internal Server Error',
      process.env.NODE_ENV === 'development' ? err.message : 'אירעה שגיאה פנימית'
    )
  );
}
