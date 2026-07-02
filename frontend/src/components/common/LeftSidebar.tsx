import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, FolderKanban, Mail, Bell, User, Settings } from 'lucide-react';
import Logo from './Logo';
import { useNotifications } from '../../contexts/NotificationContext';

const LeftSidebar: React.FC = () => {
  const { unreadCount, pendingInvitationCount } = useNotifications();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <Home className="h-4.5 w-4.5" /> },
    { label: 'Search Students', path: '/search', icon: <Users className="h-4.5 w-4.5" /> },
    { label: 'My Teams', path: '/teams', icon: <FolderKanban className="h-4.5 w-4.5" /> },
    { label: 'Invitations', path: '/invitations', icon: <Mail className="h-4.5 w-4.5" />, badge: pendingInvitationCount },
    { label: 'Notifications', path: '/notifications', icon: <Bell className="h-4.5 w-4.5" />, badge: unreadCount },
    { label: 'Profile', path: '/profile', icon: <User className="h-4.5 w-4.5" /> },
    { label: 'Settings', path: '/settings', icon: <Settings className="h-4.5 w-4.5" /> },
  ];

  return (
    <aside className="fixed left-0 top-12 bottom-0 w-64 border-r border-reddit-border dark:border-reddit-borderDark hidden md:block p-4 overflow-y-auto bg-reddit-card dark:bg-reddit-cardDark z-30">
      <div className="flex flex-col gap-1.5 font-sans">
        <Logo className="mb-4 px-3 border-b border-reddit-border/10 dark:border-reddit-borderDark/10 pb-3" />
        <p className="text-[10px] font-bold text-reddit-gray uppercase tracking-wider px-3 mb-2">Navigation</p>
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-reddit-bg dark:bg-reddit-bgDark text-reddit-orange shadow-sm font-bold'
                  : 'text-reddit-text dark:text-reddit-textDark hover:bg-reddit-bg/60 dark:hover:bg-reddit-bgDark/60 hover:translate-x-0.5'
              }`
            }
          >
            {item.icon}
            <span className="flex items-center gap-2">
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[8.5px] font-extrabold text-white bg-red-600 rounded-full font-sans leading-none">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

export default LeftSidebar;

