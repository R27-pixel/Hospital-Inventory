import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthStatus, AuthResponse, ActiveUserSession } from '../vite-env';

interface AuthContextType {
  isInitialized: boolean;
  user: ActiveUserSession | null;
  loading: boolean;
  isElectron: boolean;
  login: (loginId: string, password: string) => Promise<AuthResponse>;
  setupAccounts: (payload: { master: { login_id: string; password: string; display_name?: string }; staff: { login_id: string; password: string; display_name?: string } }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Web Browser Fallback State
let mockUser: ActiveUserSession | null = null;
let mockIsInitialized: boolean = false;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [user, setUser] = useState<ActiveUserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isElectron, setIsElectron] = useState<boolean>(false);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.auth) {
        setIsElectron(true);
        const status: AuthStatus = await window.electronAPI.auth.getStatus();
        setIsInitialized(status.initialized);
        setUser(status.user);
      } else {
        // Web Browser Fallback Mode
        setIsElectron(false);
        setIsInitialized(mockIsInitialized);
        setUser(mockUser);
      }
    } catch (error) {
      console.error('Failed to fetch auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const setupAccounts = async (payload: { master: { login_id: string; password: string; display_name?: string }; staff: { login_id: string; password: string; display_name?: string } }): Promise<AuthResponse> => {
    if (window.electronAPI && window.electronAPI.auth) {
      const res = await window.electronAPI.auth.setupAccounts(payload);
      if (res.success) await checkAuthStatus();
      return res;
    } else {
      // Browser fallback
      mockIsInitialized = true;
      mockUser = { userId: 1, loginId: payload.master.login_id, role: 'MASTER', displayName: 'Master Admin' };
      await checkAuthStatus();
      return { success: true, user: mockUser };
    }
  };

  const login = async (loginId: string, password: string): Promise<AuthResponse> => {
    if (window.electronAPI && window.electronAPI.auth) {
      const res = await window.electronAPI.auth.login({ loginId, password });
      if (res.success) await checkAuthStatus();
      return res;
    } else {
      // Browser fallback
      if (loginId.toLowerCase() === 'admin' && password === 'master123') {
        mockUser = { userId: 1, loginId: 'admin', role: 'MASTER', displayName: 'Master Admin' };
        await checkAuthStatus();
        return { success: true, user: mockUser };
      } else if (loginId.toLowerCase() === 'staff' && password === 'staff123') {
        mockUser = { userId: 2, loginId: 'staff', role: 'STAFF', displayName: 'Staff User' };
        await checkAuthStatus();
        return { success: true, user: mockUser };
      }
      return { success: false, error: 'Invalid Login ID or Password (Web Preview: try admin/master123 or staff/staff123).' };
    }
  };

  const logout = async (): Promise<void> => {
    if (window.electronAPI && window.electronAPI.auth) {
      await window.electronAPI.auth.logout();
    }
    mockUser = null;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isInitialized,
        user,
        loading,
        isElectron,
        login,
        setupAccounts,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
