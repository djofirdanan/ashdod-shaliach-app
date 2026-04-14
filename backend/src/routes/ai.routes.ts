// ============================================================
// אשדוד-שליח – AI Routes
// ============================================================

import { Router, RequestHandler } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;
const admin = adminMiddleware as RequestHandler;

// Public / authenticated AI endpoints
router.post('/estimate', aiController.getDeliveryEstimate as RequestHandler);
router.get('/price-suggestion', aiController.getPriceSuggestion as RequestHandler);
router.post('/courier-recommendation', aiController.getCourierRecommendation as RequestHandler);
router.get('/demand-forecast', aiController.getDemandForecast as RequestHandler);

// Admin only
router.get('/anomalies', auth, admin, aiController.getAnomalyReport as RequestHandler);

export default router;
