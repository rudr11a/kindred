import { Router } from 'express';
import {
  updateProfile,
  addProject,
  updateProject,
  deleteProject,
  searchUsers,
  getUserProfile,
  getMutualConnections,
  getCollaboratorSuggestions,
  deleteAccount,
} from '../controllers/user.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  updateProfileSchema,
  addProjectSchema,
  mongoIdParamSchema,
  usnParamSchema,
  searchQuerySchema,
} from '../validators/team.validator';

const router = Router();

router.put('/profile', protect, validate(updateProfileSchema), updateProfile);
router.post('/projects', protect, validate(addProjectSchema), addProject);
router.put('/projects/:id', protect, validate({ params: mongoIdParamSchema, body: addProjectSchema }), updateProject);
router.delete('/projects/:id', protect, validate({ params: mongoIdParamSchema }), deleteProject);
router.get('/search', protect, validate({ query: searchQuerySchema }), searchUsers);
router.get('/suggestions', protect, getCollaboratorSuggestions);
router.get('/profile/:usn', protect, validate({ params: usnParamSchema }), getUserProfile);
router.get('/profile/:usn/mutual', protect, validate({ params: usnParamSchema }), getMutualConnections);
router.delete('/me', protect, deleteAccount);

export default router;
