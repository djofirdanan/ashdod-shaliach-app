// ============================================================
// אשדוד-שליח – Rate Limit Middleware
// ============================================================

import rateLimit from 'express-rate-limit';
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_AUTH_MAX,
} from '../config/constants';

export const generalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'יותר מדי בקשות. נסה שוב בעוד 15 דקות.',
    timestamp: new Date().toISOString(),
  },
});

export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'יותר מדי ניסיונות כניסה. נסה שוב בעוד 15 דקות.',
    timestamp: new Date().toISOString(),
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'הגעת לגבול הבקשות. נסה שוב בעוד דקה.',
    timestamp: new Date().toISOString(),
  },
});
