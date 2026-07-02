import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, ArrowRight } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatActivityDate } from '../utils/date';

const Notifications: React.FC = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="flex-1 max-w-2xl mx-auto min-w-0 font-sans">
      <div className="bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-5">
        <div className="flex justify-between items-center border-b border-reddit-border/30 dark:border-reddit-borderDark/30 pb-3 mb-4">
          <h2 className="text-base font-extrabold text-reddit-text dark:text-reddit-textDark flex items-center gap-2">
            <Bell className="h-5 w-5 text-reddit-orange" /> Notifications
            {unreadCount > 0 && (
              <span className="bg-reddit-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h2>

          {unreadCount > 0 && (
            <button
              onClick={() => markAsRead()}
              className="text-xs text-reddit-blue hover:underline flex items-center gap-1 font-semibold"
            >
              <CheckCircle className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-xs text-reddit-gray italic">
            No notifications yet. You're all caught up!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => {
                  markAsRead(n._id);
                  if (n.link) navigate(n.link);
                }}
                className={`group border border-reddit-border/40 dark:border-reddit-borderDark/40 rounded-md p-4 cursor-pointer transition-all duration-200 flex justify-between items-center ${
                  n.isRead
                    ? 'bg-transparent hover:bg-reddit-bg/20 dark:hover:bg-reddit-bgDark/20'
                    : 'bg-reddit-blue/5 border-reddit-blue/20 dark:bg-reddit-blue/10 dark:border-reddit-blue/30 hover:bg-reddit-blue/10'
                }`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-reddit-orange flex-shrink-0 animate-pulse"></span>
                    )}
                    <p className={`text-xs text-reddit-text dark:text-reddit-textDark leading-relaxed ${!n.isRead ? 'font-bold' : 'font-medium'}`}>
                      {n.message}
                    </p>
                  </div>
                  <span className="text-[10px] text-reddit-gray block mt-1.5 font-sans">
                    {formatActivityDate(n.createdAt)}
                  </span>
                </div>

                <div className="text-reddit-gray opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
