import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { logger } from '../utils/logger';
import { notify } from '../utils/notifications';

interface AdminContextType {
  isAuthenticated: boolean;
  user: any;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user has a token in localStorage
    const token = localStorage.getItem('auth_token');
    logger.debug('AdminContext initial load', { hasToken: !!token });
    
    if (token) {
      // If token exists, assume authenticated (optimistic)
      // We'll validate on critical actions, not on every page load
      setIsAuthenticated(true);
      
      // Optionally validate in background without blocking
      checkSession().catch(err => {
        logger.debug('Background session check failed, keeping user logged in locally', err);
      });
    }
  }, []);

  const checkSession = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    logger.debug('Checking session', { hasToken: !!token });
    
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    try {
      logger.debug('Validating token with server');
      const response = await fetch(`${API_URL}/auth/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      logger.debug('Session check response', { status: response.status });

      if (response.ok) {
        const data = await response.json();
        logger.debug('Session valid', { email: data.user?.email });
        
        // Only update if we got valid session data
        if (data.session && data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          return true;
        } else {
          logger.debug('Session response OK but no valid session data');
          // Don't remove token - keep user logged in locally
          return false;
        }
      } else {
        logger.debug('Session check failed', { status: response.status });
        // Don't remove token or logout - the token might have expired but user is still valid locally
        // Only explicit logout should clear the token
        return false;
      }
    } catch (error) {
      logger.debug('Session check failed (network error, server offline, or CORS issue)', error);
      // Don't logout on network errors - keep user logged in locally
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      logger.debug('Signup API call', { email, url: `${API_URL}/auth/signup` });
      
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();
      logger.debug('Signup response', { status: response.status, success: response.ok });

      if (response.ok) {
        // After signup, automatically sign in
        logger.info('Signup successful, attempting auto-login');
        return await login(email, password);
      } else {
        const errorMsg = data.error || 'Unknown error';
        const detailsMsg = data.details ? ` (${data.details})` : '';
        logger.error('Signup failed', { error: errorMsg, details: data.details });
        notify.error('Signup failed', errorMsg + detailsMsg);
        return false;
      }
    } catch (error) {
      logger.error('Signup exception', error);
      notify.error('Signup error', error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      logger.debug('Login API call', { email, url: `${API_URL}/auth/signin` });
      
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      logger.debug('Login response', { status: response.status, hasSession: !!data.session });

      if (response.ok && data.session) {
        localStorage.setItem('auth_token', data.session.access_token);
        setUser(data.user);
        setIsAuthenticated(true);
        logger.info('Login successful', { email: data.user?.email });
        return true;
      } else {
        const errorMsg = data.error || 'Invalid credentials';
        const detailsMsg = data.details ? ` (${data.details})` : '';
        logger.warn('Login failed', { error: errorMsg, details: data.details });
        return false;
      }
    } catch (error) {
      logger.error('Login exception', error);
      notify.error('Login error', error instanceof Error ? error.message : 'Network error');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setUser(null);
    logger.info('User logged out');
  };

  return (
    <AdminContext.Provider value={{ isAuthenticated, user, login, signup, logout, checkSession }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}