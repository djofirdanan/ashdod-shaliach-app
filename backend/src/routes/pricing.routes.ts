// ============================================================
// אשדוד-שליח – Pricing Routes
// ============================================================

import { Router, RequestHandler } from 'express';
import { pricingController } from '../controllers/pricing.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;
const admin = adminMiddleware as RequestHandler;

// Public GET routes
router.get('/zones', pricingController.getAllZones as RequestHandler);
router.get('/zones/by-name', pricingController.getZoneByName as RequestHandler);
router.post('/calculate', pricingController.calculatePrice as RequestHandler);

// Admin-protected PUT routes
router.put('/zones/:id', auth, admin, pricingController.updateZone as RequestHandler);

export default router;
