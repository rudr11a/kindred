import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Team from '../models/Team';
import DiscussionMessage from '../models/DiscussionMessage';
import User from '../models/User';

let io: Server | null = null;

export const initSockets = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware for socket connections
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
      
      // Database verification check
      const user = await User.findById(decoded.id);
      if (!user || !user.isVerified || user.isDeleted || user.deletedAt) {
        return next(new Error('Authentication error: User not found, deleted, or unverified'));
      }
      
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    // Join personal notifications room
    socket.join(userId);

    // Join team channel for discussion
    socket.on('join_team', async ({ teamId }) => {
      try {
        if (!teamId || !/^[0-9a-fA-F]{24}$/.test(teamId)) {
          socket.emit('error_message', 'Invalid team ID format');
          return;
        }

        const team = await Team.findOne({ _id: teamId, isDeleted: { $ne: true } });
        if (!team) {
          socket.emit('error_message', 'Team not found');
          return;
        }

        // Check if user is a member of the team (or creator / Team Lead)
        const isLead = team.creatorId.toString() === userId;
        const isMember = team.members.some((m) => m.userId.toString() === userId);
        if (!isLead && !isMember) {
          socket.emit('error_message', 'Forbidden: You are not a member of this team');
          return;
        }

        socket.join(`team_${teamId}`);
      } catch (err) {
        console.error(err);
      }
    });

    // Leave team channel
    socket.on('leave_team', ({ teamId }) => {
      socket.leave(`team_${teamId}`);
    });

    // Send a message within team chat
    socket.on('send_message', async ({ teamId, message }) => {
      try {
        if (!teamId || !/^[0-9a-fA-F]{24}$/.test(teamId)) {
          socket.emit('error_message', 'Invalid team ID format');
          return;
        }

        if (!message || message.trim() === '') {
          return;
        }

        // Verify team exists and discussion is enabled
        const team = await Team.findOne({ _id: teamId, isDeleted: { $ne: true } });
        if (!team) {
          socket.emit('error_message', 'Team not found');
          return;
        }

        if (!team.discussionEnabled) {
          socket.emit('error_message', 'Team discussion is disabled');
          return;
        }

        // Verify sender is a member of the team
        const isLead = team.creatorId.toString() === userId;
        const isMember = team.members.some((m) => m.userId.toString() === userId);
        if (!isLead && !isMember) {
          socket.emit('error_message', 'Unauthorized: You are not a member of this team');
          return;
        }

        // Save text-only message to DB
        const chatMessage = await DiscussionMessage.create({
          teamId,
          senderId: userId,
          message: message.trim(),
        });

        // Fetch sender details to attach in broadcast
        const sender = await User.findById(userId).select('name usn branch year');

        // Broadcast message to the entire team room (including sender)
        if (io) {
          io.to(`team_${teamId}`).emit('new_message', {
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
          });
        }
      } catch (err) {
        console.error(err);
        socket.emit('error_message', 'Failed to send message');
      }
    });

    // Real-time typing indicators
    socket.on('typing', ({ teamId, isTyping, userName }) => {
      if (!teamId) return;
      socket.to(`team_${teamId}`).emit('user_typing', {
        userId,
        userName,
        isTyping,
      });
    });

    socket.on('disconnect', () => {
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};
