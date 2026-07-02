import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import type { IUser } from '../types';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ unverified?: boolean; email?: string }>;
  register: (data: {
    name: string;
    usn: string;
    email: string;
    password: string;
    branch: string;
    year: number;
  }) => Promise<{ unverified?: boolean; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: {
    skills: string[];
    availability: 'Available' | 'Busy';
    githubProfile: string;
    openToInvitations: boolean;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to load user', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        setUser(response.data.user);
      }
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 403 && error.response.data.unverified) {
        return error.response.data; // Needs verification, return email
      }
      throw error;
    }
  };

  const register = async (data: {
    name: string;
    usn: string;
    email: string;
    password: string;
    branch: string;
    year: number;
  }) => {
    try {
      const response = await api.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 403 && error.response.data.unverified) {
        return error.response.data;
      }
      throw error;
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      setUser(response.data.user);
    }
  };

  const resendOtp = async (email: string) => {
    await api.post('/auth/resend-otp', { email });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const updateProfile = async (data: {
    skills: string[];
    availability: 'Available' | 'Busy';
    githubProfile: string;
    openToInvitations: boolean;
  }) => {
    const response = await api.put('/users/profile', data);
    setUser(response.data.user);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to refresh user context', error);
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
