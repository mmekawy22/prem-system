import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3001/api';

// ---------- User Interface ----------
interface User {
  id: number;
  username: string;
  role: 'admin' | 'staff' | 'cashier';
  permissions: string; // JSON string
}

// ---------- Settings Interface ----------
interface Setting {
  id: number;
  store_name: string;
  store_logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  receipt_footer: string | null;
  currency_symbol: string;
  currency_code: string;
  tax_rate: number;
  enable_discounts: boolean;
  tax_mode: 'inclusive' | 'exclusive';
  allow_overselling: boolean;
  enable_wholesale: boolean;
  default_customer_id: number | null;
}

interface AuthContextType {
  user: User | null;
  settings: Setting | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) throw new Error("Could not fetch settings.");
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('pos_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          await fetchSettings();
        }
      } catch {
        localStorage.removeItem('pos_user');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) return false;

      const data = await response.json();
      const loggedInUser: User = data.user;

      setUser(loggedInUser);
      localStorage.setItem('pos_user', JSON.stringify(loggedInUser));

      await fetchSettings();
      return true;
    } catch (error) {
      console.error("Login API call failed:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setSettings(null);
    localStorage.removeItem('pos_user');
    navigate('/login');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    try {
      const userPermissions = JSON.parse(user.permissions);
      return !!userPermissions[permission];
    } catch {
      return false;
    }
  };

  const value = { user, settings, login, logout, hasPermission, loading };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
