// ============================================================
// אשדוד-שליח – Delivery Routes
// ============================================================

import { Router, RequestHandler } from 'express';
import { deliveryController } from '../controllers/delivery.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;

// All delivery routes require auth
router.post('/', auth, deliveryController.createDelivery as RequestHandler);
router.get('/active', auth, deliveryController.getActiveDeliveries as RequestHandler);
router.get('/', auth, deliveryController.listDeliveries as RequestHandler);
router.get('/:id', auth, deliveryController.getDelivery as RequestHandler);
router.put('/:id', auth, deliveryController.updateDelivery as RequestHandler);
router.post('/:id/cancel', auth, deliveryController.cancelDelivery as RequestHandler);
router.post('/:id/confirm', auth, deliveryController.confirmDelivery as RequestHandler);

export default router;
