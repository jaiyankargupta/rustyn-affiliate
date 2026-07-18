/// <reference types="vite/client" />
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL as string;

interface AuthUser {
  id: string;
  name: string;
  role: string;
  withdrawableBalance: number;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  restoringSession: boolean;
}

interface AuthContextValue extends AuthState {
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccess: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const hasToken = !!localStorage.getItem('refreshToken');
    return {
      user: null,
      accessToken: null,
      restoringSession: hasToken,
    };
  });

  // Helper to refresh the access token
  const refresh = useCallback(async (token: string): Promise<string | null> => {
    try {
      const r = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!r.ok) {
        localStorage.removeItem('refreshToken');
        setState({ user: null, accessToken: null, restoringSession: false });
        return null;
      }
      const data = await r.json();
      localStorage.setItem('refreshToken', data.refreshToken);
      setState({ user: data.user, accessToken: data.accessToken, restoringSession: false });
      return data.accessToken;
    } catch {
      localStorage.removeItem('refreshToken');
      setState({ user: null, accessToken: null, restoringSession: false });
      return null;
    }
  }, []);

  // On mount, restore session if refresh token is present
  useEffect(() => {
    const stored = localStorage.getItem('refreshToken');
    if (stored) {
      refresh(stored);
    } else {
      setState(s => ({ ...s, restoringSession: false }));
    }
  }, [refresh]);

  const refreshAccess = useCallback(async (): Promise<string | null> => {
    const token = localStorage.getItem('refreshToken');
    if (!token) return null;
    return refresh(token);
  }, [refresh]);

  const login = async (userId: string, password: string) => {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'login failed');
    localStorage.setItem('refreshToken', data.refreshToken);
    setState({ user: data.user, accessToken: data.accessToken, restoringSession: false });
  };

  const logout = async () => {
    if (state.accessToken) {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.accessToken}` },
      }).catch(() => { });
    }
    localStorage.removeItem('refreshToken');
    setState({ user: null, accessToken: null, restoringSession: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshAccess, isAuthenticated: !!state.user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
