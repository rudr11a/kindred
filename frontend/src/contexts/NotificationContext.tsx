import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { INotification } from '../types';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  pendingInvitationCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id?: string) => Promise<void>;
  refreshBadgeCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInvitationCount, setPendingInvitationCount] = useState(0);
  const { user } = useAuth();
  const { socket } = useSocket();

  const refreshBadgeCounts = async () => {
    try {
      const badgeRes = await api.get('/notifications/badge-counts');
      setUnreadCount(badgeRes.data.unreadNotificationCount || 0);
      setPendingInvitationCount(badgeRes.data.pendingInvitationCount || 0);
    } catch (err) {
      console.error('Failed to refresh badge counts:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      await refreshBadgeCounts();
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      if (id) {
        await api.put(`/notifications/read/${id}`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        await api.put('/notifications/read');
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Hook real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: INotification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      if (notification.type === 'New Invitation') {
        setPendingInvitationCount((prev) => prev + 1);
      }
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        pendingInvitationCount,
        fetchNotifications,
        markAsRead,
        refreshBadgeCounts,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
