import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Moon, Sun, User, Search, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from './Logo';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentTheme, toggleTheme } = useTheme();
  const isDarkMode = currentTheme === 'dark';
  const navigate = useNavigate();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const toggleDarkMode = toggleTheme;

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-reddit-card dark:bg-reddit-cardDark border-b border-reddit-border dark:border-reddit-borderDark flex items-center justify-between px-4 z-40">
      {/* Brand Logo */}
      <Logo className="md:hidden" />

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-reddit-gray" />
          <input
            type="text"
            placeholder="Search students by Name or USN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-reddit-bg dark:bg-reddit-bgDark border border-transparent hover:border-reddit-border focus:border-reddit-blue dark:hover:border-reddit-borderDark dark:focus:border-reddit-blue focus:bg-reddit-card dark:focus:bg-reddit-cardDark text-sm rounded-full pl-9 pr-4 outline-none transition-colors"
          />
        </div>
      </form>

      {/* Right Navigation controls */}
      <div className="flex items-center gap-3">
        {/* Dark Mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-reddit-bg dark:hover:bg-reddit-bgDark text-reddit-gray dark:text-reddit-textDark transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {isDarkMode ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-full hover:bg-reddit-bg dark:hover:bg-reddit-bgDark text-reddit-gray dark:text-reddit-textDark transition-colors relative"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-reddit-orange text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center scale-90 origin-top-right">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md shadow-lg overflow-hidden py-1 z-50">
              <div className="flex justify-between items-center px-4 py-2 border-b border-reddit-border dark:border-reddit-borderDark">
                <span className="font-semibold text-xs text-reddit-text dark:text-reddit-textDark">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsRead()}
                    className="text-[10px] text-reddit-blue hover:underline flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-reddit-gray">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => {
                        markAsRead(n._id);
                        setShowNotifDropdown(false);
                        if (n.link) navigate(n.link);
                      }}
                      className={`px-4 py-3 text-xs border-b border-reddit-border dark:border-reddit-borderDark last:border-0 cursor-pointer transition-colors ${
                        n.isRead
                          ? 'bg-transparent hover:bg-reddit-bg dark:hover:bg-reddit-bgDark'
                          : 'bg-reddit-blue/5 hover:bg-reddit-blue/10'
                      }`}
                    >
                      <p className="text-reddit-text dark:text-reddit-textDark mb-1">{n.message}</p>
                      <span className="text-[10px] text-reddit-gray">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-1.5 p-1 rounded hover:bg-reddit-bg dark:hover:bg-reddit-bgDark transition-colors"
          >
            <div className="h-6 w-6 rounded-full bg-reddit-orange text-white flex items-center justify-center text-xs font-bold uppercase">
              {user?.name.charAt(0)}
            </div>
            <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate">
              {user?.name}
            </span>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-reddit-border dark:border-reddit-borderDark">
                <p className="text-xs font-bold text-reddit-text dark:text-reddit-textDark truncate">{user?.name}</p>
                <p className="text-[10px] text-reddit-gray truncate">{user?.usn}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs text-reddit-text dark:text-reddit-textDark hover:bg-reddit-bg dark:hover:bg-reddit-bgDark"
              >
                <User className="h-4 w-4" /> My Profile
              </Link>
              <button
                onClick={() => {
                  setShowProfileDropdown(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-reddit-bg dark:hover:bg-reddit-bgDark text-left"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
