import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';
import Team from '../models/Team';
import Invitation from '../models/Invitation';

/**
 * Returns paginated list of activity logs for the logged-in user
 */
export const getMyActivity = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({ actorId: req.user._id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({ actorId: req.user._id });

    return res.status(200).json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[getMyActivity error]', error);
    return res.status(500).json({ message: 'Server error retrieving audit logs' });
  }
};

/**
 * Computes and returns admin-ready metrics
 */
export const getSecurityMetrics = async (req: AuthRequest, res: Response) => {
  try {
    // Basic verification check
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const totalRegistrations = await User.countDocuments({ isVerified: true });
    
    // Count failed logins and failed OTP attempts from ActivityLog
    const failedLogins = await ActivityLog.countDocuments({ action: 'Failed Login' });
    const failedOtpAttempts = await ActivityLog.countDocuments({ action: 'Failed OTP Attempt' });
    
    const invitationsSent = await Invitation.countDocuments();
    
    // Active teams are those that are Recruiting or In Progress
    const activeTeams = await Team.countDocuments({ status: { $ne: 'Completed' } });

    return res.status(200).json({
      metrics: {
        totalRegistrations,
        failedLogins,
        failedOtpAttempts,
        invitationsSent,
        activeTeams,
      },
    });
  } catch (error) {
    console.error('[getSecurityMetrics error]', error);
    return res.status(500).json({ message: 'Server error retrieving security metrics' });
  }
};
