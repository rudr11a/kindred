import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/common/Header';
import LeftSidebar from '../components/common/LeftSidebar';

const RootLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-reddit-bg dark:bg-reddit-bgDark">
        <div className="text-lg font-semibold text-reddit-blue animate-pulse">Loading Kindred...</div>
      </div>
    );
  }

  // Redirect to Auth if not logged in
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-reddit-bg dark:bg-reddit-bgDark text-reddit-text dark:text-reddit-textDark">
      {/* Top Header */}
      <Header />

      <div className="flex-1 flex pt-12 max-w-7xl w-full mx-auto px-4">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Center Content and Right Panels */}
        <main className="flex-1 md:pl-64 flex justify-between gap-6 py-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RootLayout;
