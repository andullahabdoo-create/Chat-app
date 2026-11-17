import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User } from './types';
import { api, getToken, saveToken, clearToken } from './api';

interface Store {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<Store>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getToken());

  useEffect(() => {
    let cancelled = false;
    if (getToken()) {
      api
        .me()
        .then((res) => { if (!cancelled) setUser(res.user); })
        .catch(() => { clearToken(); setToken(null); });
    }
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login({ username, password });
    saveToken(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (username: string, password: string, displayName?: string) => {
    const res = await api.register({ username, password, displayName });
    saveToken(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, login, register, logout, setUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
