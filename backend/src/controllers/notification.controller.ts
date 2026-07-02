import { Response } from 'express';
import Notification from '../models/Notification';
import Invitation from '../models/Invitation';
import { AuthRequest } from '../middleware/auth';

// Fetch current user's notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // limit to recent 50

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving notifications' });
  }
};

// Retrieve unread notifications count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving unread notification count' });
  }
};

// Mark notification(s) as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params; // if id is provided, read single, else mark all as read

    if (id) {
      const notification = await Notification.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { isRead: true },
        { new: true }
      );
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
    } else {
      await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    }

    return res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating notifications' });
  }
};

// Retrieve unread counts for notifications and invitations
export const getBadgeCounts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unreadNotificationCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    const pendingInvitationCount = await Invitation.countDocuments({
      receiverId: req.user._id,
      status: 'Pending',
    });

    return res.status(200).json({
      unreadNotificationCount,
      pendingInvitationCount,
    });
  } catch (error) {
    console.error('[getBadgeCounts error]', error);
    return res.status(500).json({ message: 'Server error retrieving badge counts' });
  }
};
