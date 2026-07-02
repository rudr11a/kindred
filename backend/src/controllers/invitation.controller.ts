import { Response } from 'express';
import Invitation from '../models/Invitation';
import Team from '../models/Team';
import User from '../models/User';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../sockets/socket.handler';
import { logActivity } from '../services/activity.service';

// Send invitation to student
export const sendInvitation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { teamId, receiverId } = req.body;

    // Fetch team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify sender is Team Lead
    if (team.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the Team Lead can invite members' });
    }

    // Fetch receiver
    const receiver = await User.findOne({ _id: receiverId, isDeleted: { $ne: true } });
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver student not found' });
    }

    if (!receiver.openToInvitations) {
      return res.status(400).json({ message: 'Student is not accepting invitations' });
    }

    // Verify receiver is not already a member
    const isMember = team.members.some((m) => m.userId.toString() === receiverId);
    if (isMember) {
      return res.status(400).json({ message: 'Student is already a member of this team' });
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'Team is already full and cannot invite more members' });
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      teamId,
      receiverId,
      status: 'Pending',
    });
    if (existingInvitation) {
      return res.status(400).json({ message: 'An active invitation is already pending for this student' });
    }

    // Create Invitation
    const invitation = await Invitation.create({
      teamId,
      senderId: req.user._id,
      receiverId,
      status: 'Pending',
    });

    // Create Notification for the receiver
    const notification = await Notification.create({
      userId: receiver._id,
      type: 'New Invitation',
      message: `${req.user.name} invited you to join "${team.title}"`,
      link: `/invitations`,
      isRead: false,
    });

    // Send real-time notification via Socket.IO
    const io = getIO();
    if (io) {
      io.to(receiverId.toString()).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: false,
      });
    }

    // Audit log
    await logActivity(req.user._id, 'Invitation Sent', 'Team', team._id.toString(), {
      inviteeName: receiver.name,
      invitationId: invitation._id.toString(),
    });

    return res.status(201).json({
      message: 'Invitation sent successfully',
      invitation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error sending invitation' });
  }
};

// Retrieve current user's invitations
export const getInvitations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const invitations = await Invitation.find({ receiverId: req.user._id })
      .populate('teamId', 'title description domains tags skills status maxMembers members')
      .populate('senderId', 'name usn email isDeleted')
      .sort({ createdAt: -1 });

    const filteredInvitations = invitations.filter((inv: any) => inv.senderId && !inv.senderId.isDeleted);

    return res.status(200).json({ invitations: filteredInvitations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error listing invitations' });
  }
};

// Respond to an invitation (Accept/Reject)
export const respondInvitation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body; // 'Accepted' | 'Rejected'

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid response status' });
    }

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Verify current user is the receiver
    if (invitation.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Unauthorized to respond to this invitation' });
    }

    if (invitation.status !== 'Pending') {
      return res.status(400).json({ message: 'This invitation has already been processed' });
    }

    // Fetch team and sender
    const team = await Team.findOne({ _id: invitation.teamId, isDeleted: { $ne: true } });
    if (!team) {
      return res.status(404).json({ message: 'Associated team no longer exists' });
    }

    const io = getIO();

    if (status === 'Rejected') {
      // Create Notification for the Team Lead (senderId)
      const notification = await Notification.create({
        userId: invitation.senderId,
        type: 'Invitation Rejected',
        message: `${req.user.name} declined the invitation to join "${team.title}"`,
        link: `/teams/${team._id}`,
        isRead: false,
      });

      if (io) {
        io.to(invitation.senderId.toString()).emit('notification', {
          id: notification._id,
          type: notification.type,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt,
          isRead: false,
        });
      }

      // Audit log
      await logActivity(req.user._id, 'Invitation Rejected', 'Team', team._id.toString(), {
        name: req.user.name,
      });

      // Delete invitation on rejection
      await Invitation.findByIdAndDelete(id);

      return res.status(200).json({ message: 'Invitation rejected successfully' });
    }

    // Status: Accepted
    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'The team has reached its maximum capacity. Cannot accept invitation.' });
    }

    // Verify receiver is not already a member
    const isMember = team.members.some((m) => m.userId.toString() === req.user?._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    // Add member to the team as 'Member'
    team.members.push({
      userId: req.user._id,
      roleName: 'Member',
    });

    await team.save();

    invitation.status = 'Accepted';
    await invitation.save();

    // Notify Team Lead
    const notification = await Notification.create({
      userId: invitation.senderId,
      type: 'Invitation Accepted',
      message: `${req.user.name} accepted the invitation to join "${team.title}"`,
      link: `/teams/${team._id}`,
      isRead: false,
    });

    if (io) {
      io.to(invitation.senderId.toString()).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: false,
      });
      
      // Emit team updates to sockets in team channel so Skill Gap UI redraws immediately
      io.to(`team_${team._id}`).emit('team_updated', { teamId: team._id });
    }

    // Audit log
    await logActivity(req.user._id, 'Invitation Accepted', 'Team', team._id.toString(), {
      name: req.user.name,
    });

    await logActivity(req.user._id, 'Member Joined', 'Team', team._id.toString(), {
      name: req.user.name,
    });

    return res.status(200).json({
      message: 'Invitation accepted. You are now a team member!',
      team,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error responding to invitation' });
  }
};
