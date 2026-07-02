import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import teamRoutes from './team.routes';
import invitationRoutes from './invitation.routes';
import notificationRoutes from './notification.routes';
import auditRoutes from './audit.routes';
import joinRequestRoutes from './joinRequest.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/invitations', invitationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit', auditRoutes);
router.use('/join-requests', joinRequestRoutes);

export default router;
