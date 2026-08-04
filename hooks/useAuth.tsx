'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  getStoredToken,
  normalizeAuthUser
} from "@lib/auth";
import {
  ApiError,
  AuthApi,
  setLogoutInProgress
} from "@lib/apiClient";
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
  setAuthenticatedUser: (
    token: string,
    user: AuthUser | null
  ) => void;
  hydrateUser: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

function syncSubmoduleStorage(normalized: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (!normalized) {
    localStorage.removeItem("user");
    localStorage.removeItem("swachh_user");
    localStorage.removeItem("token");
    localStorage.removeItem("swachh_token");
    return;
  }
  const primaryRole = (normalized.roles && normalized.roles[0]) ? normalized.roles[0].toLowerCase() : 'admin';
  const mappedRole = (primaryRole.includes('admin') || primaryRole.includes('commissioner') || primaryRole.includes('hms')) ? 'admin' : primaryRole;
  const moduleUser = {
    id: normalized.id,
    name: normalized.name,
    email: normalized.email,
    role: mappedRole,
    roles: normalized.roles,
    cityId: normalized.cityId,
    cityName: normalized.cityName,
    modules: normalized.modules
  };
  const currentToken = getStoredToken() || "";
  localStorage.setItem("user", JSON.stringify(moduleUser));
  localStorage.setItem("swachh_user", JSON.stringify(moduleUser));
  if (currentToken) {
    localStorage.setItem("token", currentToken);
    localStorage.setItem("swachh_token", currentToken);
  }
}

function getUnifiedSessionUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = localStorage.getItem(
      "unified_auth_session"
    );

    if (!rawSession) {
      return null;
    }

    const unifiedSession = JSON.parse(rawSession);
    const sessionUser = unifiedSession?.user;

    if (!sessionUser) {
      return null;
    }

    const normalizedUser = normalizeAuthUser(
      sessionUser as AuthUser
    );

    if (normalizedUser) {
      normalizedUser.roleLabels =
        normalizedUser.roles.map((role) =>
          roleLabel(role)
        );

      return normalizedUser;
    }

    const rawRoles = Array.isArray(
      sessionUser.roles
    )
      ? sessionUser.roles
      : sessionUser.role
        ? [sessionUser.role]
        : [];

    const roles = rawRoles.map(
      (role: unknown) =>
        String(role).toUpperCase()
    );

    return {
      ...sessionUser,
      roles,
      roleLabels: roles.map((role: string) =>
        roleLabel(role)
      )
    } as AuthUser;
  } catch {
    localStorage.removeItem(
      "unified_auth_session"
    );

    return null;
  }
}

export function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const applyUser = (
    nextUser: AuthUser | null,
    persist = true
  ) => {
    if (!nextUser) {
      setUser(null);

      if (persist) {
        clearPersistedUserSnapshot();
        syncSubmoduleStorage(null);
      }

      return;
    }

    const normalized =
      normalizeAuthUser(nextUser);

    if (!normalized) {
      setUser(null);

      if (persist) {
        clearPersistedUserSnapshot();
        syncSubmoduleStorage(null);
      }

      return;
    }

    normalized.roleLabels =
      normalized.roles.map((role) =>
        roleLabel(role)
      );

    setUser(normalized);

    if (persist) {
      persistUserSnapshot(normalized);
      syncSubmoduleStorage(normalized);
    }
  };

  const clearSession = () => {
    clearPersistedAccessToken();
    clearPersistedUserSnapshot();
    syncSubmoduleStorage(null);
    setUser(null);
  };

  const hydrateUser = async () => {
    const token = getStoredToken();

    const snapshot =
      getPersistedUserSnapshot<AuthUser>();

    const unifiedUser =
      getUnifiedSessionUser();

    /*
     * Unified users may have access only to
     * MatrixTrack or Ward Ranking and therefore
     * may not have a Taskforce access token.
     */
    if (!token) {
      if (unifiedUser) {
        applyUser(unifiedUser);
      } else {
        clearSession();
      }

      setLoading(false);
      return;
    }

    if (snapshot) {
      applyUser(snapshot, false);
    } else if (unifiedUser) {
      applyUser(unifiedUser, false);
    }

    try {
      const response =
        await AuthApi.getMe();

      applyUser(
        response.user as AuthUser
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (
          error.status === 401 ||
          error.status === 403
        )
      ) {
        /*
         * Taskforce session may be invalid while
         * another unified portal session is valid.
         */
        if (unifiedUser) {
          clearPersistedAccessToken();
          applyUser(unifiedUser);
        } else {
          clearSession();
        }
      } else if (
        !snapshot &&
        !unifiedUser
      ) {
        /*
         * Preserve the token during temporary
         * backend or development server failures.
         */
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
    setLogoutInProgress(true);
    try {
      await AuthApi.logout();
    } catch {
      /*
       * Local sessions must still be cleared even
       * when the backend logout request fails.
       */
    }

    clearSession();

    if (typeof window !== "undefined") {
      const unifiedStorageKeys = [
        "unified_auth_session",
        "active_unified_application",
        "taskforce_access_token",
        "matrixtrack_access_token",
        "ward_ranking_access_token",
        "swachh_token",
        "token"
      ];

      unifiedStorageKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      document.cookie =
        "unified_session=; Path=/; Max-Age=0; SameSite=Lax";

      document.cookie =
        "hms_access_token=; Path=/; Max-Age=0; SameSite=Lax";

      window.location.replace(
        "/unified-login"
      );
    }
  };

  const setAuthenticatedUser = (
    token: string,
    nextUser: AuthUser | null
  ) => {
    persistAccessToken(token);
    applyUser(nextUser);
  };

  const value = useMemo(
    () => ({
      user,
      setUser: (
        nextUser: AuthUser | null
      ) => applyUser(nextUser),
      setAuthenticatedUser,
      hydrateUser,
      logout,
      loading
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
}