import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import RootLayout from './layouts/RootLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Home from './pages/Home';
import Profile from './pages/Profile';
import SearchStudents from './pages/SearchStudents';
import CreateTeam from './pages/CreateTeam';
import TeamDashboard from './pages/TeamDashboard';
import MyTeams from './pages/MyTeams';
import Invitations from './pages/Invitations';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
              </Route>

              {/* Protected Application Routes */}
              <Route element={<RootLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<SearchStudents />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:usn" element={<Profile />} />
                <Route path="/teams/create" element={<CreateTeam />} />
                <Route path="/teams/:id" element={<TeamDashboard />} />
                <Route path="/teams" element={<MyTeams />} />
                <Route path="/invitations" element={<Invitations />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Fallback Catch-All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
     </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
