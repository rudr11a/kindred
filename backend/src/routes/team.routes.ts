import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamDetails,
  updateTeamStatus,
  toggleDiscussion,
  getTeamMessages,
  leaveTeam,
  removeMember,
  getTeamActivity,
  deleteTeam,
  editTeamDetails,
  getMyLedTeams,
  sendTeamMessage,
  toggleMessageReaction,
} from '../controllers/team.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requireTeamLead, requireTeamAccess } from '../middleware/rbac';
import {
  createTeamSchema,
  searchQuerySchema,
  mongoIdParamSchema,
  teamStatusSchema,
  teamToggleChatSchema,
  removeMemberParamSchema,
  editTeamSchema,
} from '../validators/team.validator';

const router = Router();

router.post('/', protect, validate(createTeamSchema), createTeam);
router.get('/', protect, validate({ query: searchQuerySchema }), getTeams);
router.get('/led', protect, getMyLedTeams);
router.get('/:id', protect, getTeamDetails);
router.get('/:id/activity', protect, requireTeamAccess, getTeamActivity);
router.post('/:id/leave', protect, requireTeamAccess, leaveTeam);
router.delete('/:id/members/:userId', protect, requireTeamLead, validate({ params: removeMemberParamSchema }), removeMember);
router.put('/:id/status', protect, requireTeamLead, validate({ params: mongoIdParamSchema, body: teamStatusSchema }), updateTeamStatus);
router.put('/:id/toggle-chat', protect, requireTeamLead, validate({ params: mongoIdParamSchema, body: teamToggleChatSchema }), toggleDiscussion);
router.get('/:id/messages', protect, requireTeamAccess, getTeamMessages);
router.post('/:id/messages', protect, requireTeamAccess, sendTeamMessage);
router.put('/:id/messages/:messageId/react', protect, requireTeamAccess, toggleMessageReaction);
router.delete('/:id', protect, requireTeamLead, deleteTeam);
router.put('/:id', protect, requireTeamLead, validate({ params: mongoIdParamSchema, body: editTeamSchema }), editTeamDetails);

export default router;
