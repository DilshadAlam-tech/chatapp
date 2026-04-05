import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import {
  UserProfile,
  clearStoreSession,
  fetchUserProfile,
  initializeStoreSession,
  logout as storeLogout,
} from "@/lib/store";

interface AuthContextType {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  authReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  authReady: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      return;
    }

    const profile = await fetchUserProfile(currentUser.uid);
    setUser(profile);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearStoreSession();
        setUser(null);
        setAuthReady(true);
        return;
      }

      await initializeStoreSession(firebaseUser.uid);
      const profile = await fetchUserProfile(firebaseUser.uid);
      setUser(profile);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await storeLogout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, setUser, logout, refreshUser, authReady }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
