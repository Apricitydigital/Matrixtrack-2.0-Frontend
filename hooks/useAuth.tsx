'use client';

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStoredToken, normalizeAuthUser } from "@lib/auth";
import { ApiError, AuthApi } from "@lib/apiClient";
import type { AuthUser } from "../types/auth";
import { roleLabel } from "@lib/labels";
import {
  clearPersistedAccessToken,
  clearPersistedUserSnapshot,
  getPersistedUserSnapshot,
  persistAccessToken,
  persistUserSnapshot
} from "@lib/session";

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  setAuthenticatedUser: (token: string, user: AuthUser | null) => void;
  hydrateUser: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = (nextUser: AuthUser | null, persist = true) => {
    if (!nextUser) {
      setUser(null);
      if (persist) clearPersistedUserSnapshot();
      return;
    }
    const normalized = normalizeAuthUser(nextUser);
    if (!normalized) {
      setUser(null);
      if (persist) clearPersistedUserSnapshot();
      return;
    }
    normalized.roleLabels = normalized.roles.map((role) => roleLabel(role));
    setUser(normalized);
    if (persist) persistUserSnapshot(normalized);
  };

  const clearSession = () => {
    clearPersistedAccessToken();
    clearPersistedUserSnapshot();
    setUser(null);
  };

  const hydrateUser = async () => {
    const token = getStoredToken();
    const snapshot = getPersistedUserSnapshot<AuthUser>();

    if (!token) {
      clearSession();
      setLoading(false);
      return;
    }

    if (snapshot) {
      applyUser(snapshot, false);
    }

    try {
      const response = await AuthApi.getMe();
      applyUser(response.user as AuthUser);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearSession();
      } else if (!snapshot) {
        // keep token intact for transient dev/server reload issues
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void hydrateUser();
  }, []);

  const logout = async () => {
    try {
      await AuthApi.logout();
    } catch {
      // ignore logout errors; proceed to clear client state
    }
    clearSession();
  };

  const setAuthenticatedUser = (token: string, nextUser: AuthUser | null) => {
    persistAccessToken(token);
    applyUser(nextUser);
  };

  const value = useMemo(
    () => ({ user, setUser: (nextUser: AuthUser | null) => applyUser(nextUser), setAuthenticatedUser, hydrateUser, logout, loading }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
