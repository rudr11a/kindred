import { Router } from 'express';
import { sendInvitation, getInvitations, respondInvitation } from '../controllers/invitation.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requireTeamLead } from '../middleware/rbac';
import { sendInvitationSchema, respondInvitationSchema, mongoIdParamSchema } from '../validators/team.validator';

const router = Router();

router.post('/', protect, requireTeamLead, validate(sendInvitationSchema), sendInvitation);
router.get('/', protect, getInvitations);
router.put('/:id/respond', protect, validate({ params: mongoIdParamSchema, body: respondInvitationSchema }), respondInvitation);

export default router;
