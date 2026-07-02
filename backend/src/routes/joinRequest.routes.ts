import { Router } from 'express';
import { sendJoinRequest, getTeamJoinRequests, respondJoinRequest } from '../controllers/joinRequest.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendJoinRequestSchema, respondInvitationSchema, mongoIdParamSchema } from '../validators/team.validator';

const router = Router();

// Student requests to join a team
router.post('/', protect, validate({ body: sendJoinRequestSchema }), sendJoinRequest);

// Team Lead fetches requests for their team
router.get('/team/:teamId', protect, getTeamJoinRequests);

// Team Lead responds to a join request
router.put('/:id/respond', protect, validate({ params: mongoIdParamSchema, body: respondInvitationSchema }), respondJoinRequest);

export default router;
