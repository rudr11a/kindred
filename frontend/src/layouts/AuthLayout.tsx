import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/common/Logo';

const AuthLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-reddit-bg dark:bg-reddit-bgDark">
        <div className="text-lg font-semibold text-reddit-blue animate-pulse font-sans">Loading Kindred...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-reddit-bg dark:bg-reddit-bgDark p-4 font-sans">
      <div className="w-full max-w-md bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-lg shadow-md p-8 flex flex-col transition-all duration-300">
        <div className="text-center mb-6">
          <Logo className="justify-center mb-3" iconSize={42} textSize="text-3xl" />
          <h2 className="text-sm font-extrabold text-reddit-orange tracking-wide uppercase mt-2">
            Find Your Kindred. Build Together.
          </h2>
          <p className="text-xs text-reddit-gray mt-2 px-2 leading-relaxed">
            Discover teammates, build projects, and collaborate with verified students.
          </p>
        </div>
        
        <div className="border-t border-reddit-border/30 dark:border-reddit-borderDark/30 pt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
