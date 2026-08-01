'use client';

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthCookie, decodeToken, getTokenFromCookies, setAuthCookie } from "@lib/auth";
import { AuthApi } from "@lib/apiClient";
import type { AuthUser } from "../types/auth";
import { roleLabel } from "@lib/labels";

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolvedUser: AuthUser | null = null;

    // Existing Taskforce authentication
    const taskforceCookieToken = getTokenFromCookies();

    if (taskforceCookieToken) {
      resolvedUser = decodeToken(taskforceCookieToken);
    }

    // Unified-login fallback
    if (
      !resolvedUser &&
      typeof window !== "undefined"
    ) {
      try {
        const rawSession = localStorage.getItem(
          "unified_auth_session",
        );

        if (rawSession) {
          const unifiedSession = JSON.parse(rawSession);

          const taskforceToken =
            unifiedSession?.tokens?.taskforce ||
            localStorage.getItem(
              "taskforce_access_token",
            );

          if (taskforceToken) {
            resolvedUser = decodeToken(
              taskforceToken,
              unifiedSession?.user,
            );
          }

          // MatrixTrack/Ward Ranking users may not have
          // a Taskforce token, but still need portal-home access.
          if (!resolvedUser && unifiedSession?.user) {
            const sessionUser = unifiedSession.user;

            const rawRoles = Array.isArray(
              sessionUser.roles,
            )
              ? sessionUser.roles
              : sessionUser.role
                ? [sessionUser.role]
                : [];

            const roles = rawRoles.map(
              (role: unknown) =>
                String(role).toUpperCase(),
            );

            resolvedUser = {
              ...sessionUser,
              roles,
              roleLabels: roles.map((role: string) =>
                roleLabel(role),
              ),
            } as AuthUser;
          }
        }
      } catch {
        localStorage.removeItem(
          "unified_auth_session",
        );
      }
    }

    if (resolvedUser) {
      resolvedUser.roleLabels =
        resolvedUser.roles?.map((role: string) =>
          roleLabel(role),
        );
    }

    setUser(resolvedUser);
    setLoading(false);
  }, []);

  const logout = async () => {
    try {
      await AuthApi.logout();
    } catch {
      // Server logout fail hone par bhi local session clear hogi
    }

    clearAuthCookie();

    if (typeof window !== "undefined") {
      [
        "unified_auth_session",
        "active_unified_application",
        "taskforce_access_token",
        "matrixtrack_access_token",
        "ward_ranking_access_token",
        "swachh_token",
        "token",
      ].forEach((key) => {
        localStorage.removeItem(key);
      });

      document.cookie =
        "unified_session=; Path=/; Max-Age=0; SameSite=Lax";

      document.cookie =
        "hms_access_token=; Path=/; Max-Age=0; SameSite=Lax";
    }

    setUser(null);

    if (typeof window !== "undefined") {
      window.location.replace("/unified-login");
    }
  };

  const value = useMemo(() => ({ user, setUser, logout, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
