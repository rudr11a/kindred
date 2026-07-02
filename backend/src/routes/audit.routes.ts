import { Router } from 'express';
import { getMyActivity, getSecurityMetrics } from '../controllers/audit.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/my-activity', protect, getMyActivity);
router.get('/metrics', protect, getSecurityMetrics);

export default router;
