import { Response } from 'express';
import Team from '../models/Team';
import User from '../models/User';
import DiscussionMessage from '../models/DiscussionMessage';
import ProjectHistory from '../models/ProjectHistory';
import ActivityLog from '../models/ActivityLog';
import Invitation from '../models/Invitation';
import Notification from '../models/Notification';
import JoinRequest from '../models/JoinRequest';
import { AuthRequest } from '../middleware/auth';
import { escapeRegex } from '../utils/security';
import { logActivity } from '../services/activity.service';
import { getIO } from '../sockets/socket.handler';

// Create a new team collaboration hub
export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { title, description, domains, tags, skills, maxMembers } = req.body;

    // Create the team with creator as Team Lead member
    const team = await Team.create({
      title,
      description,
      domains,
      tags,
      skills,
      creatorId: req.user._id,
      maxMembers,
      members: [
        {
          userId: req.user._id,
          roleName: 'Team Lead',
        },
      ],
      status: 'Recruiting',
    });

    // Audit log
    await logActivity(req.user._id, 'Team Creation', 'Team', team._id.toString());

    return res.status(201).json({
      message: 'Team created successfully',
      team,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error creating team' });
  }
};

// List all teams with optional search query filters
export const getTeams = async (req: AuthRequest, res: Response) => {
  try {
    const { query, tag, status } = req.query;

    const filter: any = { isDeleted: { $ne: true } };

    if (query && typeof query === 'string') {
      const escapedQuery = escapeRegex(query);
      filter.$or = [
        { title: { $regex: escapedQuery, $options: 'i' } },
        { description: { $regex: escapedQuery, $options: 'i' } },
      ];
    }

    if (tag && typeof tag === 'string') {
      filter.tags = { $in: [escapeRegex(tag)] };
    }

    const skillParam = req.query.skill || req.query['skill[]'] || req.query.skills || req.query['skills[]'];
    if (skillParam) {
      if (Array.isArray(skillParam)) {
        filter.skills = { $in: skillParam.map(s => escapeRegex(String(s))) };
      } else {
        filter.skills = { $in: [escapeRegex(String(skillParam))] };
      }
    }

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const domainParam = req.query.domain || req.query['domain[]'] || req.query.domains || req.query['domains[]'];
    if (domainParam) {
      if (Array.isArray(domainParam)) {
        filter.domains = { $in: domainParam.map(d => new RegExp(escapeRegex(String(d)), 'i')) };
      } else {
        filter.domains = { $in: [new RegExp(escapeRegex(String(domainParam)), 'i')] };
      }
    }

    const teams = await Team.find(filter)
      .populate('creatorId', 'name usn email')
      .populate('members.userId', 'name usn email branch year skills')
      .sort({ createdAt: -1 });

    return res.status(200).json({ teams });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error listing teams' });
  }
};

// Retrieve specific team details (dashboard / network graph)
export const getTeamDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('creatorId', 'name usn email branch year skills domains availability')
      .populate('members.userId', 'name usn email branch year skills domains availability githubProfile');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    let hasPendingRequest = false;
    let pendingRequestRole = '';
    let hasPendingInvitation = false;

    if (req.user) {
      const pendingReq = await JoinRequest.findOne({
        teamId: team._id,
        studentId: req.user._id,
        status: 'Pending',
      });
      if (pendingReq) {
        hasPendingRequest = true;
      }

      const pendingInv = await Invitation.findOne({
        teamId: team._id,
        receiverId: req.user._id,
        status: 'Pending',
      });
      if (pendingInv) {
        hasPendingInvitation = true;
      }
    }

    const creatorIdStr = (typeof team.creatorId === 'object' && team.creatorId ? (team.creatorId as any)._id : team.creatorId).toString();
    const isTeamLead = req.user ? creatorIdStr === req.user._id.toString() : false;
    
    const isMember = req.user ? team.members.some((m) => {
      const memberIdStr = (typeof m.userId === 'object' && m.userId ? (m.userId as any)._id : m.userId).toString();
      return memberIdStr === req.user?._id.toString();
    }) : false;

    return res.status(200).json({
      team,
      isTeamLead,
      isMember,
      hasPendingRequest,
      pendingRequestRole,
      hasPendingInvitation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving team details' });
  }
};

// Update team status (Recruiting -> In Progress -> Completed)
export const updateTeamStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body; // 'Recruiting' | 'In Progress' | 'Completed'

    if (!['Recruiting', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only creator/Team Lead can change status
    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can update project status' });
    }

    team.status = status;
    
    // Add to statusTimeline if it doesn't already end with this status
    const lastTimeline = team.statusTimeline[team.statusTimeline.length - 1];
    if (!lastTimeline || lastTimeline.status !== status) {
      team.statusTimeline.push({
        status,
        timestamp: new Date(),
      });
    }

    await team.save();

    // If status is changed to Completed, automatically create permanent ProjectHistory records for members
    if (status === 'Completed') {
      for (const member of team.members) {
        const exists = await ProjectHistory.findOne({
          userId: member.userId,
          teamId: team._id,
        });

        if (!exists) {
          await ProjectHistory.create({
            userId: member.userId,
            teamId: team._id,
            projectName: team.title,
            description: team.description,
            domains: team.domains || [],
            role: member.roleName,
            skillsUsed: team.skills || [],
            completionStatus: 'Completed',
          });
        }
      }
    }

    // Audit log
    await logActivity(req.user._id, 'Status Changed', 'Team', team._id.toString(), { status });

    return res.status(200).json({
      message: `Status updated to ${status}`,
      team,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating team status' });
  }
};

// Removed updateTeamRoles function

// Toggle discussion forum status (Lead only)
export const toggleDiscussion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { discussionEnabled } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can toggle discussion status' });
    }

    team.discussionEnabled = discussionEnabled;
    await team.save();

    // Audit log
    await logActivity(
      req.user._id,
      discussionEnabled ? 'Chat Enabled' : 'Chat Disabled',
      'Team',
      team._id.toString()
    );

    return res.status(200).json({
      message: `Discussion chat ${discussionEnabled ? 'enabled' : 'disabled'}`,
      team,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error toggling discussion status' });
  }
};

// Retrieve chat history for a team
export const getTeamMessages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify if requester is a member of the team
    const isLead = team.creatorId.toString() === req.user._id.toString();
    const isMember = team.members.some((m) => m.userId.toString() === req.user?._id.toString());
    if (!isLead && !isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this team' });
    }

    const messages = await DiscussionMessage.find({ teamId: id })
      .populate('senderId', 'name usn branch year')
      .sort({ createdAt: 1 });

    return res.status(200).json({ messages });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving discussion chat' });
  }
};

// Leave team (member only)
export const leaveTeam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.creatorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Team Lead cannot leave the team. Transfer lead role or delete the team.' });
    }

    const memberIndex = team.members.findIndex((m) => m.userId.toString() === req.user?._id.toString());
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'You are not a member of this team' });
    }

    const member = team.members[memberIndex];

    // Remove from member array
    team.members.splice(memberIndex, 1);
    await team.save();

    // Log activity
    await logActivity(req.user._id, 'Member Left', 'Team', team._id.toString(), {
      name: req.user.name,
      roleName: member.roleName,
    });

    return res.status(200).json({ message: 'Successfully left the team', team });
  } catch (error) {
    console.error('[leaveTeam error]', error);
    return res.status(500).json({ message: 'Server error leaving team' });
  }
};

// Remove member (Team Lead only)
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id, userId } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can remove members' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Team Lead cannot remove themselves.' });
    }

    const memberIndex = team.members.findIndex((m) => m.userId.toString() === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'User is not a member of this team' });
    }

    const member = team.members[memberIndex];
    const removedUser = await User.findById(userId);

    // Remove from member array
    team.members.splice(memberIndex, 1);
    await team.save();

    // Log activity
    await logActivity(req.user._id, 'Member Left', 'Team', team._id.toString(), {
      name: removedUser ? removedUser.name : 'Unknown User',
      roleName: member.roleName,
      removedBy: req.user.name,
    });

    return res.status(200).json({ message: 'Member removed successfully', team });
  } catch (error) {
    console.error('[removeMember error]', error);
    return res.status(500).json({ message: 'Server error removing member' });
  }
};

// Fetch team activity logs (timeline events)
export const getTeamActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const logs = await ActivityLog.find({
      entityType: 'Team',
      entityId: id,
    })
      .populate('actorId', 'name usn')
      .sort({ timestamp: -1 });

    // Ensure all activity records include a valid ISO date on createdAt/updatedAt
    const formattedLogs = logs.map((log) => {
      const logObj = log.toObject();
      const isoDate = log.timestamp ? log.timestamp.toISOString() : new Date().toISOString();
      return {
        ...logObj,
        createdAt: isoDate,
        updatedAt: isoDate,
      };
    });

    return res.status(200).json({ logs: formattedLogs });
  } catch (error) {
    console.error('[getTeamActivity error]', error);
    return res.status(500).json({ message: 'Server error fetching team activities' });
  }
};

// Securely delete a team (Team Lead only)
export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify current user is the Team Lead
    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can delete this team' });
    }

    // Soft delete the team
    team.isDeleted = true;
    team.deletedAt = new Date();
    await team.save();

    // Delete all invitations related to the team
    await Invitation.deleteMany({ teamId: team._id });

    // Delete notifications related to the team (by matching team ID in link)
    await Notification.deleteMany({ link: { $regex: team._id.toString() } });

    // Remove the team reference from every member profile (unset teamId in ProjectHistory)
    await ProjectHistory.updateMany({ teamId: team._id }, { $unset: { teamId: "" } });

    // Clean up discussion messages
    await DiscussionMessage.deleteMany({ teamId: team._id });

    // Audit log
    await logActivity(req.user._id, 'Team Deletion', 'Team', team._id.toString(), {
      title: team.title,
    });

    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('[deleteTeam error]', error);
    return res.status(500).json({ message: 'Server error deleting team' });
  }
};

// Edit team metadata (Team Lead only)
export const editTeamDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { title, description, domains, tags, skills } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify current user is the Team Lead
    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can edit this team' });
    }

    team.title = title;
    team.description = description;
    team.domains = domains || [];
    team.tags = tags || [];
    team.skills = skills || [];
    await team.save();

    // Log Activity
    await logActivity(req.user._id, 'Team Edited', 'Team', team._id.toString(), {
      title: team.title,
    });

    return res.status(200).json({
      message: 'Team updated successfully',
      team,
    });
  } catch (error) {
    console.error('[editTeamDetails error]', error);
    return res.status(500).json({ message: 'Server error updating team details' });
  }
};

// Retrieve all teams the authenticated user leads
export const getMyLedTeams = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const teams = await Team.find({
      creatorId: req.user._id,
      isDeleted: { $ne: true },
    });

    const result = teams.map((team) => ({
      _id: team._id.toString(),
      teamId: team._id.toString(),
      title: team.title,
      teamName: team.title,
      status: team.status,
      isRecruiting: team.status === 'Recruiting',
      maxMembers: team.maxMembers,
      members: team.members,
    }));

    return res.status(200).json({ teams: result });
  } catch (error) {
    console.error('[getMyLedTeams error]', error);
    return res.status(500).json({ message: 'Server error retrieving led teams' });
  }
};

// Send a message within team chat
export const sendTeamMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    const team = await Team.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!team.discussionEnabled) {
      return res.status(400).json({ message: 'Team discussion board is disabled' });
    }

    // Verify sender is active member / lead
    const isLead = team.creatorId.toString() === req.user._id.toString();
    const isMember = team.members.some((m) => m.userId.toString() === req.user?._id.toString());
    if (!isLead && !isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this team' });
    }

    // Save text-only message to DB
    const chatMessage = await DiscussionMessage.create({
      teamId: id,
      senderId: req.user._id,
      message: message.trim(),
    });

    const sender = await User.findById(req.user._id).select('name usn branch year');

    const formattedMessage = {
      _id: chatMessage._id,
      teamId: chatMessage.teamId,
      message: chatMessage.message,
      createdAt: chatMessage.createdAt,
      senderId: {
        _id: sender?._id,
        name: sender?.name,
        usn: sender?.usn,
        branch: sender?.branch,
        year: sender?.year,
      },
    };

    // Broadcast message to the entire team room (including sender, client handles deduplication)
    const io = getIO();
    if (io) {
      io.to(`team_${id}`).emit('new_message', formattedMessage);
    }

    return res.status(200).json({
      message: 'Message sent successfully',
      chatMessage: formattedMessage,
    });
  } catch (error) {
    console.error('[sendTeamMessage error]', error);
    return res.status(500).json({ message: 'Server error sending message' });
  }
};

// Toggle user emoji reaction on a message
export const toggleMessageReaction = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id, messageId } = req.params;
    const { emoji } = req.body;

    const allowedEmojis = ['👍', '❤️', '😂', '🔥', '🎉', '👀', '💯', '🚀'];
    if (!emoji || !allowedEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid reaction emoji' });
    }

    // Verify team access (member or lead)
    const team = await Team.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isLead = team.creatorId.toString() === req.user._id.toString();
    const isMember = team.members.some((m) => m.userId.toString() === req.user?._id.toString());
    if (!isLead && !isMember) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this team' });
    }

    // Find message
    const message = await DiscussionMessage.findOne({ _id: messageId, teamId: id });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    // Check if user already reacted with this emoji
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === req.user?._id.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Remove reaction
      message.reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({
        userId: req.user._id,
        emoji,
      });
    }

    await message.save();

    // Broadcast the update via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`team_${id}`).emit('message_reaction', {
        messageId,
        reactions: message.reactions,
      });
    }

    return res.status(200).json({
      message: 'Reaction updated successfully',
      reactions: message.reactions,
    });
  } catch (error) {
    console.error('[toggleMessageReaction error]', error);
    return res.status(500).json({ message: 'Server error updating reaction' });
  }
};
