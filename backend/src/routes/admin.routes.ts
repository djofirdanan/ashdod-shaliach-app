// ============================================================
// אשדוד-שליח – Admin Routes (all protected by adminMiddleware)
// ============================================================

import { Router, RequestHandler } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;
const admin = adminMiddleware as RequestHandler;

// All admin routes require auth + admin role
router.use(auth, admin);

router.get('/dashboard', adminController.getDashboardStats as RequestHandler);
router.get('/deliveries', adminController.getAllDeliveries as RequestHandler);
router.get('/users/problematic', adminController.getProblematicUsers as RequestHandler);
router.post('/block/:id', adminController.blockUser as RequestHandler);
router.post('/unblock/:id', adminController.unblockUser as RequestHandler);
router.post('/users/:id/block', adminController.blockUser as RequestHandler);
router.post('/users/:id/unblock', adminController.unblockUser as RequestHandler);
router.get('/settings', adminController.getSystemSettings as RequestHandler);
router.put('/settings', adminController.updateSystemSettings as RequestHandler);
router.patch('/settings', adminController.updateSystemSettings as RequestHandler);
router.get('/revenue', adminController.getRevenueReport as RequestHandler);
router.get('/reports/revenue', adminController.getRevenueReport as RequestHandler);
router.get('/bonus-rules', adminController.getBonusRules as RequestHandler);
router.patch('/bonus-rules/:id', adminController.updateBonusRule as RequestHandler);

export default router;
