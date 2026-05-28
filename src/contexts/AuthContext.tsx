import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import apiService from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (apiService.getToken()) {
          const profile = await apiService.getProfile();
          setUser(profile);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        apiService.clearToken();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await apiService.login({ email, password });
      apiService.setToken(response.access_token);
      const profile = await apiService.getProfile();
      setUser(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string, phone: string) => {
    try {
      setError(null);
      await apiService.register({ email, password, name, phone });
      // Auto-login after registration
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    apiService.clearToken();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      if (apiService.getToken()) {
        const profile = await apiService.getProfile();
        setUser(profile);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      apiService.clearToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
