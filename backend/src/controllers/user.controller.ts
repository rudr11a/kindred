import { Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import ProjectHistory from '../models/ProjectHistory';
import Team from '../models/Team';
import DiscussionMessage from '../models/DiscussionMessage';
import Invitation from '../models/Invitation';
import Notification from '../models/Notification';
import RefreshToken from '../models/RefreshToken';
import ActivityLog from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { escapeRegex } from '../utils/security';
import { logActivity } from '../services/activity.service';
import { getIO } from '../sockets/socket.handler';

// Update profile details (skills, availability, github, openToInvitations)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { skills, availability, githubProfile, openToInvitations } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.skills = skills;
    user.availability = availability;
    user.githubProfile = githubProfile;
    user.openToInvitations = openToInvitations;

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        usn: user.usn,
        email: user.email,
        branch: user.branch,
        year: user.year,
        skills: user.skills,
        domains: user.domains,
        availability: user.availability,
        openToInvitations: user.openToInvitations,
        githubProfile: user.githubProfile,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

// Add a project to project history
export const addProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { projectName, description, domains, role, skillsUsed, completionStatus } = req.body;

    const project = await ProjectHistory.create({
      userId: req.user._id,
      projectName,
      description,
      domains,
      role,
      skillsUsed,
      completionStatus,
    });

    // Retrieve updated user to fetch newly compiled domains list
    const updatedUser = await User.findById(req.user._id).select('domains');

    return res.status(201).json({
      message: 'Project added to history',
      project,
      domains: updatedUser?.domains || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding project' });
  }
};

// Update project in history
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { projectName, description, domains, role, skillsUsed, completionStatus } = req.body;

    const project = await ProjectHistory.findOne({ _id: id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    project.projectName = projectName;
    project.description = description;
    project.domains = domains;
    project.role = role;
    project.skillsUsed = skillsUsed;
    project.completionStatus = completionStatus;

    await project.save();

    const updatedUser = await User.findById(req.user._id).select('domains');

    return res.status(200).json({
      message: 'Project updated successfully',
      project,
      domains: updatedUser?.domains || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating project' });
  }
};

// Delete project from history
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const project = await ProjectHistory.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    const updatedUser = await User.findById(req.user._id).select('domains');

    return res.status(200).json({
      message: 'Project deleted successfully',
      domains: updatedUser?.domains || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting project' });
  }
};

// Search users by Name, USN, Skills, Domain Experience, Branch, Year, Availability
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { query, branch, year, availability } = req.query;

    const filter: any = { isVerified: true, isDeleted: { $ne: true } };

    // Search query can be Name or USN (escaped to prevent NoSQL injection/regex abuse)
    if (query && typeof query === 'string') {
      const escapedQuery = escapeRegex(query);
      filter.$or = [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { usn: { $regex: escapedQuery, $options: 'i' } },
      ];
    }

    const skillParam = req.query.skill || req.query['skill[]'] || req.query.skills || req.query['skills[]'];
    if (skillParam) {
      if (Array.isArray(skillParam)) {
        filter.skills = { $all: skillParam.map(s => new RegExp(escapeRegex(String(s)), 'i')) };
      } else {
        filter.skills = { $in: [new RegExp(escapeRegex(String(skillParam)), 'i')] };
      }
    }

    const domainParam = req.query.domain || req.query['domain[]'] || req.query.domains || req.query['domains[]'];
    if (domainParam) {
      if (Array.isArray(domainParam)) {
        filter.domains = { $all: domainParam.map(d => new RegExp(escapeRegex(String(d)), 'i')) };
      } else {
        filter.domains = { $in: [new RegExp(escapeRegex(String(domainParam)), 'i')] };
      }
    }

    if (branch && typeof branch === 'string') {
      filter.branch = { $regex: escapeRegex(branch), $options: 'i' };
    }

    if (year) {
      filter.year = parseInt(year as string);
    }

    if (availability) {
      filter.availability = availability as string;
    }

    // Exclude password and verification data
    const users = await User.find(filter)
      .select('-passwordHash -otp -otpExpires')
      .sort({ name: 1 });

    // Calculate workedTogether metadata
    const myCompleted = await ProjectHistory.find({
      userId: req.user._id,
      completionStatus: 'Completed',
      teamId: { $exists: true },
    });
    const myCompletedTeamIds = myCompleted.map((p) => p.teamId?.toString()).filter(Boolean);

    const usersWithCollaboration = await Promise.all(
      users.map(async (u) => {
        const userObj = u.toObject();
        if (myCompletedTeamIds.length === 0 || u._id.toString() === req.user?._id.toString()) {
          return { ...userObj, workedTogether: false, connectionScore: 0 };
        }

        const shared = await ProjectHistory.find({
          userId: u._id,
          completionStatus: 'Completed',
          teamId: { $in: myCompletedTeamIds },
        });

        return {
          ...userObj,
          workedTogether: shared.length > 0,
          connectionScore: shared.length,
        };
      })
    );

    return res.status(200).json({ users: usersWithCollaboration });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during student search' });
  }
};

// Fetch student profile by USN
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { usn } = req.params;

    const user = await User.findOne({ usn: usn.toUpperCase(), isVerified: true, isDeleted: { $ne: true } })
      .select('-passwordHash -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Fetch student project history
    const projects = await ProjectHistory.find({ userId: user._id }).sort({ createdAt: -1 });

    // Active project count (teams that are not Completed)
    const activeProjectsCount = await Team.countDocuments({
      'members.userId': user._id,
      status: { $ne: 'Completed' },
    });

    return res.status(200).json({
      user,
      projects,
      activeProjectsCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

// Fetch mutual projects and connection score between logged-in user and target student profile
export const getMutualConnections = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { usn } = req.params;
    const targetUser = await User.findOne({ usn: usn.toUpperCase(), isVerified: true, isDeleted: { $ne: true } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Target profile not found' });
    }

    // Find logged-in user's completed team projects
    const myCompleted = await ProjectHistory.find({
      userId: req.user._id,
      completionStatus: 'Completed',
      teamId: { $exists: true },
    });
    const myCompletedTeamIds = myCompleted.map((p) => p.teamId?.toString()).filter(Boolean);

    if (myCompletedTeamIds.length === 0) {
      return res.status(200).json({ connectionScore: 0, sharedProjects: [] });
    }

    // Find shared completed projects where the target user also has a ProjectHistory
    const sharedCompleted = await ProjectHistory.find({
      userId: targetUser._id,
      completionStatus: 'Completed',
      teamId: { $in: myCompletedTeamIds },
    });

    const sharedProjects = sharedCompleted.map((p) => {
      // Find what my role was in this project
      const myProj = myCompleted.find((myP) => myP.teamId?.toString() === p.teamId?.toString());
      return {
        projectName: p.projectName,
        teamId: p.teamId,
        myRole: myProj ? myProj.role : 'Member',
        theirRole: p.role,
        completedAt: p.updatedAt,
      };
    });

    return res.status(200).json({
      connectionScore: sharedProjects.length,
      sharedProjects,
    });
  } catch (error) {
    console.error('[getMutualConnections error]', error);
    return res.status(500).json({ message: 'Server error retrieving mutual connections' });
  }
};

// Fetch suggestions based on collaboration intelligence scoring
export const getCollaboratorSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const currentUserId = req.user._id;

    // 1. Fetch current user's completed project team IDs and skills
    const myCompleted = await ProjectHistory.find({
      userId: currentUserId,
      completionStatus: 'Completed',
      teamId: { $exists: true },
    });
    const myTeamIds = myCompleted.map((p) => p.teamId?.toString()).filter(Boolean);
    const mySkills = req.user.skills || [];

    // Construct set of user IDs I have worked with
    let myTeammatesList: string[] = [];
    if (myTeamIds.length > 0) {
      const teammates = await ProjectHistory.find({
        teamId: { $in: myTeamIds },
        userId: { $ne: currentUserId },
      });
      myTeammatesList = Array.from(new Set(teammates.map((t) => t.userId.toString())));
    }
    const myTeammatesSet = new Set(myTeammatesList);

    // 2. Fetch all other verified students
    const candidates = await User.find({
      _id: { $ne: currentUserId },
      isVerified: true,
      openToInvitations: true,
      isDeleted: { $ne: true },
    }).select('name usn branch year skills availability');

    const scoredSuggestions = await Promise.all(
      candidates.map(async (cand) => {
        // Metric A: Shared projects history
        let sharedCount = 0;
        if (myTeamIds.length > 0) {
          sharedCount = await ProjectHistory.countDocuments({
            userId: cand._id,
            completionStatus: 'Completed',
            teamId: { $in: myTeamIds },
          });
        }
        const sharedProjectsScore = sharedCount * 10;

        // Metric B: Mutual teammates (friends of friends)
        let mutualTeammatesCount = 0;
        if (myTeammatesSet.size > 0) {
          // Find candidates' teammates
          const candCompleted = await ProjectHistory.find({
            userId: cand._id,
            completionStatus: 'Completed',
            teamId: { $exists: true },
          });
          const candTeamIds = candCompleted.map((p) => p.teamId?.toString()).filter(Boolean);
          
          if (candTeamIds.length > 0) {
            const candTeammates = await ProjectHistory.find({
              teamId: { $in: candTeamIds },
              userId: { $ne: cand._id },
            });
            const candTeammatesSet = new Set(candTeammates.map((t) => t.userId.toString()));
            
            // Count intersection
            for (const tId of myTeammatesSet) {
              if (candTeammatesSet.has(tId)) {
                mutualTeammatesCount++;
              }
            }
          }
        }
        const mutualTeammatesScore = mutualTeammatesCount * 5;

        // Metric C: Skills overlap
        const candSkills = cand.skills || [];
        let skillsOverlapCount = 0;
        candSkills.forEach((skill) => {
          if (mySkills.includes(skill)) {
            skillsOverlapCount++;
          }
        });
        const skillsOverlapScore = skillsOverlapCount * 2;

        const totalScore = sharedProjectsScore + mutualTeammatesScore + skillsOverlapScore;

        return {
          user: cand,
          score: totalScore,
          reasons: {
            sharedProjects: sharedCount,
            mutualTeammates: mutualTeammatesCount,
            sharedSkills: skillsOverlapCount,
          },
        };
      })
    );

    // Filter out users with score = 0, sort desc, take top 5
    const suggestions = scoredSuggestions
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error('[getCollaboratorSuggestions error]', error);
    return res.status(500).json({ message: 'Server error generating suggestions' });
  }
};

// DELETE /users/me - Delete user account (anonymize & soft delete)
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required to confirm deletion.' });
    }

    const userId = req.user._id;

    // Fetch user with passwordHash
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }

    // Check if Team Lead of any team
    const ledTeams = await Team.find({ creatorId: userId, isDeleted: { $ne: true } });
    for (const team of ledTeams) {
      if (team.members.length > 1) {
        // Block deletion if team has other members
        return res.status(400).json({
          message: 'You must transfer team ownership or delete the team before deleting your account.',
        });
      }
    }

    // Clear / Delete owned sole-member teams
    for (const team of ledTeams) {
      // Sole member case: Delete team automatically
      await Team.findByIdAndDelete(team._id);
      await DiscussionMessage.deleteMany({ teamId: team._id });
      await Invitation.deleteMany({ teamId: team._id });
    }

    // Remove from other teams where user is a regular member
    const memberTeams = await Team.find({ 'members.userId': userId, isDeleted: { $ne: true } });
    for (const team of memberTeams) {
      const idx = team.members.findIndex((m) => m.userId.toString() === userId.toString());
      if (idx !== -1) {
        const memberEntry = team.members[idx];
        // Remove from array
        team.members.splice(idx, 1);
        await team.save();

        // Log member exit activity
        await logActivity(userId, 'Member Left', 'Team', team._id.toString(), {
          name: req.user.name,
          roleName: memberEntry.roleName,
          reason: 'Account Deleted',
        });
      }
    }

    // Delete all invitations associated with this user
    await Invitation.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    // Delete all notifications belonging to the user
    await Notification.deleteMany({ userId });

    // Delete all refresh tokens
    await RefreshToken.deleteMany({ userId });

    // Log ACCOUNT_DELETED event
    await logActivity(userId, 'ACCOUNT_DELETED', 'User', userId.toString(), {
      name: 'Deleted User',
    });

    // Anonymize Activity Logs involving this user
    const originalName = req.user.name;
    await ActivityLog.updateMany(
      { actorId: userId },
      {
        $set: {
          'metadata.name': 'Deleted User',
          'metadata.removedBy': 'Deleted User',
        },
      }
    );
    await ActivityLog.updateMany(
      { 'metadata.name': originalName },
      { $set: { 'metadata.name': 'Deleted User' } }
    );
    await ActivityLog.updateMany(
      { 'metadata.removedBy': originalName },
      { $set: { 'metadata.removedBy': 'Deleted User' } }
    );

    // Disconnect active socket connections for the user
    const io = getIO();
    if (io) {
      try {
        const activeSockets = await io.fetchSockets();
        for (const s of activeSockets) {
          if (s.data.userId === userId.toString()) {
            s.emit('force_disconnect', { message: 'Your account has been deleted.' });
            s.disconnect(true);
          }
        }
      } catch (socketErr) {
        console.error('Socket disconnect error:', socketErr);
      }
    }

    // Soft Delete: Anonymize and mark user as deleted
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.name = 'Deleted User';
    user.passwordHash = 'DELETED';
    user.githubProfile = '';
    user.skills = [];
    user.domains = [];
    user.availability = 'Busy';
    user.openToInvitations = false;
    user.isVerified = false; // block active sessions/checks
    await user.save();

    return res.status(200).json({ message: 'Your account has been deleted successfully.' });
  } catch (error) {
    console.error('[deleteAccount error]', error);
    return res.status(500).json({ message: 'Server error during account deletion.' });
  }
};
