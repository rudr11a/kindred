import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import Team from '../models/Team';

/**
 * Middleware to restrict endpoints only to the Team Lead (creator) of the target team
 */
export const requireTeamLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, login required' });
    }

    const teamId = req.params.id || req.body.teamId || req.query.teamId;
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required to verify permissions' });
    }

    // Verify format
    if (!/^[0-9a-fA-F]{24}$/.test(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }

    const team = await Team.findOne({ _id: teamId, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if the current user is the creator (Team Lead)
    const isLead = team.creatorId.toString() === req.user._id.toString();
    if (!isLead) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can perform this action' });
    }

    next();
  } catch (error) {
    console.error('[rbac middleware error]', error);
    return res.status(500).json({ message: 'Server error checking team privileges' });
  }
};

/**
 * Middleware to restrict endpoints only to active members of the team (includes Team Lead)
 */
export const requireTeamAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, login required' });
    }

    const teamId = req.params.id || req.body.teamId || req.query.teamId;
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required to verify access' });
    }

    // Verify format
    if (!/^[0-9a-fA-F]{24}$/.test(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }

    const team = await Team.findOne({ _id: teamId, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isLead = team.creatorId.toString() === req.user._id.toString();
    const isMember = team.members.some(
      (m) => m.userId.toString() === req.user?._id.toString()
    );

    if (!isLead && !isMember) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this team' });
    }

    next();
  } catch (error) {
    console.error('[rbac middleware error]', error);
    return res.status(500).json({ message: 'Server error checking team access' });
  }
};
