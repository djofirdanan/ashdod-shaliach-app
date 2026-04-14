// ============================================================
// אשדוד-שליח – Auth Routes
// ============================================================

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify', authController.verifyToken);

// Protected routes
router.post('/logout', authMiddleware as import('express').RequestHandler, authController.logout as import('express').RequestHandler);
router.get('/profile', authMiddleware as import('express').RequestHandler, authController.getProfile as import('express').RequestHandler);
router.put('/profile', authMiddleware as import('express').RequestHandler, authController.updateProfile as import('express').RequestHandler);

export default router;
