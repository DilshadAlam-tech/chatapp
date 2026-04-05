import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, getCurrentUser, logout as storeLogout } from '@/lib/store';

interface AuthContextType {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => {}, logout: () => {}, refreshUser: () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const refreshUser = () => {
    const u = getCurrentUser();
    setUser(u || null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = () => {
    storeLogout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, setUser, logout, refreshUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
