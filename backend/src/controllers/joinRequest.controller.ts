import { Response } from 'express';
import JoinRequest from '../models/JoinRequest';
import Team from '../models/Team';
import User from '../models/User';
import Notification from '../models/Notification';
import Invitation from '../models/Invitation';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../sockets/socket.handler';
import { logActivity } from '../services/activity.service';

// Send a request to join a team
export const sendJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { teamId, message } = req.body;

    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    // Fetch team
    const team = await Team.findOne({ _id: teamId, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify student is not already a member
    const isMember = team.members.some((m) => m.userId.toString() === req.user?._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    // Verify student is not the creator/Lead
    if (team.creatorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You are the Team Lead of this team' });
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'Team is already full' });
    }

    // Check for existing pending request
    const existingRequest = await JoinRequest.findOne({
      teamId,
      studentId: req.user._id,
      status: 'Pending',
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending join request for this team' });
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      teamId,
      receiverId: req.user._id,
      status: 'Pending',
    });
    if (existingInvitation) {
      return res.status(400).json({ message: 'You have a pending invitation for this team. Please check your inbox.' });
    }

    // Create JoinRequest
    const joinRequest = await JoinRequest.create({
      teamId,
      studentId: req.user._id,
      message: message || '',
      status: 'Pending',
    });

    // Create Notification for the Team Lead (creatorId)
    const notification = await Notification.create({
      userId: team.creatorId,
      type: 'Team Update',
      message: `${req.user.name} requested to join "${team.title}"`,
      link: `/teams/${team._id}`,
      isRead: false,
    });

    // Send real-time notification via Socket.IO to Team Lead
    const io = getIO();
    if (io) {
      io.to(team.creatorId.toString()).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: false,
      });
    }

    // Log Activity
    await logActivity(req.user._id, 'Join Request Sent', 'Team', team._id.toString());

    return res.status(201).json({
      message: 'Join request sent successfully',
      joinRequest,
    });
  } catch (error) {
    console.error('[sendJoinRequest error]', error);
    return res.status(500).json({ message: 'Server error sending join request' });
  }
};

// Retrieve join requests for a specific team (Team Lead only)
export const getTeamJoinRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { teamId } = req.params;

    const team = await Team.findOne({ _id: teamId, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify requesting user is the Team Lead
    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can view join requests' });
    }

    const requests = await JoinRequest.find({ teamId, status: 'Pending' })
      .populate('studentId', 'name usn email branch year skills domains availability githubProfile')
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('[getTeamJoinRequests error]', error);
    return res.status(500).json({ message: 'Server error retrieving join requests' });
  }
};

// Respond to a join request (Accept/Reject) - Team Lead only
export const respondJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body; // 'Accepted' | 'Rejected'

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid response status' });
    }

    const joinRequest = await JoinRequest.findById(id);
    if (!joinRequest) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    if (joinRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'This join request has already been processed' });
    }

    const team = await Team.findOne({ _id: joinRequest.teamId, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Associated team not found or is deleted' });
    }

    // Verify current user is the Team Lead
    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can respond to join requests' });
    }

    const student = await User.findById(joinRequest.studentId);
    if (!student || student.isDeleted) {
      return res.status(404).json({ message: 'Student who requested to join no longer exists' });
    }

    const io = getIO();

    if (status === 'Rejected') {
      joinRequest.status = 'Rejected';
      await joinRequest.save();

      // Notify Student
      const notification = await Notification.create({
        userId: student._id,
        type: 'Team Update',
        message: `Your request to join "${team.title}" was declined`,
        link: `/`,
        isRead: false,
      });

      if (io) {
        io.to(student._id.toString()).emit('notification', {
          id: notification._id,
          type: notification.type,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt,
          isRead: false,
        });
      }

      // Log Activity
      await logActivity(req.user._id, 'Join Request Rejected', 'Team', team._id.toString(), {
        studentName: student.name,
      });

      return res.status(200).json({ message: 'Join request declined successfully' });
    }

    // Status: Accepted
    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'The team has reached its maximum capacity. Cannot accept more members.' });
    }

    // Verify receiver is not already a member
    const isMember = team.members.some((m) => m.userId.toString() === student._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'Student is already a member of this team' });
    }

    // Add member to the team as 'Member'
    team.members.push({
      userId: student._id,
      roleName: 'Member',
    });
    await team.save();

    joinRequest.status = 'Accepted';
    await joinRequest.save();

    // Create Notification for the student
    const notification = await Notification.create({
      userId: student._id,
      type: 'Team Update',
      message: `Your request to join "${team.title}" was accepted! You are now a member.`,
      link: `/teams/${team._id}`,
      isRead: false,
    });

    if (io) {
      io.to(student._id.toString()).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: false,
      });

      // Emit team updates to sockets in team channel
      io.to(`team_${team._id}`).emit('team_updated', { teamId: team._id });
    }

    // Log Activity
    await logActivity(req.user._id, 'Join Request Accepted', 'Team', team._id.toString(), {
      studentName: student.name,
    });

    await logActivity(student._id, 'Member Joined', 'Team', team._id.toString(), {
      name: student.name,
    });

    return res.status(200).json({
      message: 'Join request accepted successfully. Student added to the team.',
      team,
    });
  } catch (error) {
    console.error('[respondJoinRequest error]', error);
    return res.status(500).json({ message: 'Server error responding to join request' });
  }
};
