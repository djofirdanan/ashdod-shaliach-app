// ============================================================
// אשדוד-שליח – Chat Routes
// ============================================================

import { Router, RequestHandler } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const auth = authMiddleware as RequestHandler;

router.post('/:deliveryId/messages', auth, chatController.sendMessage as RequestHandler);
router.get('/:deliveryId/messages', auth, chatController.getConversation as RequestHandler);
router.put('/:deliveryId/read', auth, chatController.markAsRead as RequestHandler);

export default router;
