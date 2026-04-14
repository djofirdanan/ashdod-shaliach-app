// ============================================================
// אשדוד-שליח – Notification Routes
// ============================================================

import { Router, RequestHandler } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;
const admin = adminMiddleware as RequestHandler;

router.get('/', auth, notificationController.getNotifications as RequestHandler);
router.put('/:id/read', auth, notificationController.markAsRead as RequestHandler);
router.post('/push', auth, notificationController.sendPushNotification as RequestHandler);
router.post('/send', auth, notificationController.sendToUser as RequestHandler);

// Admin only
router.post('/bulk', auth, admin, notificationController.sendBulkNotification as RequestHandler);

export default router;
