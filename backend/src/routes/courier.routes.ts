// ============================================================
// אשדוד-שליח – Courier Routes
// ============================================================

import { Router, RequestHandler } from 'express';
import { courierController } from '../controllers/courier.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;
const admin = adminMiddleware as RequestHandler;

// Courier self-service routes
router.put('/availability', auth, courierController.setAvailability as RequestHandler);
router.put('/location', auth, courierController.updateLocation as RequestHandler);
router.get('/stats', auth, courierController.getCourierStats as RequestHandler);

// Delivery action routes
router.post('/deliveries/:id/accept', auth, courierController.acceptDelivery as RequestHandler);
router.post('/deliveries/:id/reject', auth, courierController.rejectDelivery as RequestHandler);
router.post('/deliveries/:id/pickup', auth, courierController.pickupDelivery as RequestHandler);
router.post('/deliveries/:id/complete', auth, courierController.completeDelivery as RequestHandler);

// Admin only
router.get('/list', auth, admin, courierController.listCouriers as RequestHandler);

export default router;
