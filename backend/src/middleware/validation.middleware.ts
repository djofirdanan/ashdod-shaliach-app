// ============================================================
// אשדוד-שליח – Validation Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/helpers';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('; ');
    res.status(422).json({
      ...errorResponse('Validation Error', messages),
      errors: errors.array(),
    });
    return;
  }
  next();
}
