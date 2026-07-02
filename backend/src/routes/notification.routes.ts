import { Router } from 'express';
import { getNotifications, getUnreadCount, markAsRead, getBadgeCounts } from '../controllers/notification.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { mongoIdParamSchema } from '../validators/team.validator';

const router = Router();

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.get('/badge-counts', protect, getBadgeCounts);
router.put('/read', protect, markAsRead);
router.put('/read/:id', protect, validate({ params: mongoIdParamSchema }), markAsRead);

export default router;
