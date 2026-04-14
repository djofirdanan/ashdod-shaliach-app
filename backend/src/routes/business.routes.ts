// ============================================================
// אשדוד-שליח – Business Routes
// ============================================================

import { Router, RequestHandler } from 'express';
import { businessController } from '../controllers/business.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;
const admin = adminMiddleware as RequestHandler;

router.get('/profile', auth, businessController.getBusinessProfile as RequestHandler);
router.put('/profile', auth, businessController.updateBusinessProfile as RequestHandler);
router.get('/stats', auth, businessController.getBusinessStats as RequestHandler);

// Admin only
router.get('/list', auth, admin, businessController.listBusinesses as RequestHandler);

export default router;
