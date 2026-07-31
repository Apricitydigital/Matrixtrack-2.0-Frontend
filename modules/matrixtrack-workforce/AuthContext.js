import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "./config";

// Use the API base (which already includes the /api prefix) for auth routes
const apiUrl = `${API_BASE_URL}/auth`;
console.info("AuthContext API endpoint base:", apiUrl);

const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || "mtadmin@apricitydigital.in";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const normalizeUser = (payload) => {
    if (!payload) return null;

    const access = payload.access || {};
    const roles = Array.isArray(payload.roles) && payload.roles.length > 0
      ? payload.roles
      : access.roles || [];

    const normalizePerm = (perm) => {
      if (!perm) return null;
      const module = perm.module || perm.module_name || perm.moduleName;
      const action = perm.action || perm.permission || perm.action_name || perm.actionName;
      if (!module || !action) return null;
      return { ...perm, module, action };
    };

    const payloadPermissions = Array.isArray(payload.permissions) ? payload.permissions.map(normalizePerm).filter(Boolean) : [];
    const accessPermissions = Array.isArray(access.permissions) ? access.permissions.map(normalizePerm).filter(Boolean) : [];
    const permissions =
      payloadPermissions.length > 0
        ? payloadPermissions
        : accessPermissions;

    return {
      ...payload,
      access: {
        ...access,
        roles,
        permissions,
      },
      roles,
      permissions,
      customPermissions: payload.customPermissions || access.customPermissions || payload.permissions_custom || null,
    };
  };

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      const defaultSsoUser = normalizeUser({
        id: "sso-admin",
        name: "Admin",
        email: "admin@matrixtrack.in",
        role: "admin",
        roles: ["admin"],
        permissions: [
          { module: "dashboard", action: "view" },
          { module: "master", action: "view" },
          { module: "geofencing", action: "view" },
          { module: "employees", action: "view" },
          { module: "attendance_reports", action: "view" },
          { module: "short_attendance", action: "view" },
          { module: "supervisors", action: "view" },
          { module: "assign_supervisor_ward", action: "view" },
          { module: "settings", action: "view" },
        ]
      });
      setUser(defaultSsoUser);
      return;
    }

    try {
      setIsRefreshing(true);
      const res = await fetch(`${apiUrl}/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        const normalized = normalizeUser(payload);
        // eslint-disable-next-line no-console
        console.info("[Auth] /me payload:", payload);
        // eslint-disable-next-line no-console
        console.info("[Auth] normalized user:", normalized);
        setUser(normalized);
        return;
      }

      if (res.status === 401 || res.status === 403) {
        if (payload?.code === "SESSION_REVOKED") {
           alert("Your session has been terminated by the Super Admin. Please log in again.");
        }
        localStorage.removeItem("token");
        setUser(null);
        return;
      }

      console.error(
        `AuthContext: failed to confirm session (status ${res.status}).`,
        payload?.error || payload?.message || "Unknown error"
      );
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ✅ Check if user is already logged in (e.g., from a token)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // ✅ Auto-logout at 12:00 AM Midnight (Local Kolkata Time)
  useEffect(() => {
    if (!user) return;

    const getMsUntilMidnight = () => {
      const now = new Date();
      const kolkataTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const kolkataDate = new Date(kolkataTimeStr);
      
      const midnight = new Date(kolkataTimeStr);
      midnight.setHours(24, 0, 0, 0); // Sets to midnight of the next day
      
      return midnight.getTime() - kolkataDate.getTime();
    };

    const delay = getMsUntilMidnight();
    console.info(`[Auth] Auto-logout scheduled in ${Math.round(delay / 1000 / 60)} minutes (at 12:00 AM Kolkata time)`);

    const timer = setTimeout(() => {
      console.info("[Auth] Midnight reached. Logging out.");
      logout();
    }, delay);

    return () => clearTimeout(timer);
  }, [user]);

  // ✅ Login function
  const login = async (email, password) => {
    try {
      const res = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        localStorage.removeItem("token");
        setUser(null);
        const message = data?.error || data?.message || "Invalid credentials";
        console.error("Login failed:", message);
        throw new Error(message);
      }

      if (data.status === "pending_2fa") {
        return { pending2FA: true, email: data.email };
      }

      localStorage.setItem("token", data.token);
      setUser(normalizeUser(data.user));
      return { success: true };
    } catch (error) {
      console.error("Error in login function:", error);
      throw error;
    }
  };

  // ✅ Verify OTP function
  const verifyOTP = async (email, otp) => {
    try {
      const res = await fetch(`${apiUrl}/verify-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.status !== 'success') {
        throw new Error(data?.error || data?.message || "Invalid OTP");
      }

      localStorage.setItem("token", data.token);
      setUser(normalizeUser(data.user));
      return true;
    } catch (error) {
      console.error("OTP Error:", error);
      throw error;
    }
  };


  // ✅ Logout function
  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch(`${apiUrl}/logout`, {
        method: "POST",
        credentials: "include",
        headers,
      });
    } catch (err) {
      console.error("Logout API call failed:", err);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const logPageView = useCallback(async (pageName, pageUrl) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const endpoint = pageName.toLowerCase().includes("admin") || pageName.toLowerCase().includes("activity logs")
        ? `${API_BASE_URL}/admin-management/log-page-visit`
        : `${API_BASE_URL}/log-page-visit`;

      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pageName, pageUrl })
      });
    } catch (err) {
      console.error("Failed to log page view:", err);
    }
  }, []);

  const logAction = useCallback(async (actionName, actionDescription, isAdminOnly = false) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const endpoint = isAdminOnly
        ? `${API_BASE_URL}/admin-management/log-action`
        : `${API_BASE_URL}/log-action`;

      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ actionName, actionDescription })
      });
    } catch (err) {
      console.error("Failed to log action:", err);
    }
  }, []);

  const isAdmin = (candidate = user) => {
    const normalized = normalizeUser(candidate);
    if (!normalized) return false;
    const roles = normalized.roles || [];
    return (
      normalized.role === "admin" ||
      roles.some((role) => (role.name || role)?.toLowerCase() === "admin")
    );
  };

  const hasPermission = ({ module, action }) => {
    if (!module || !action) return true;
    const normalized = normalizeUser(user);
    if (!normalized) return false;

    // Super admin (SUPER_ADMIN_EMAIL) gets full access always
    const isSuperAdminEmail = normalized.email === SUPER_ADMIN_EMAIL;
    if (isSuperAdminEmail) return true;

    // Sub-admins: check customPermissions (module-level permissions)
    if (normalized.customPermissions) {
      const active = normalized.customPermissions.is_active !== false;
      if (!active) return false;

      const modules = normalized.customPermissions.modules || {};
      const normModule = module.toLowerCase().replace(/-/g, '_');
      const accessLevel = modules[normModule];

      if (accessLevel === 'write') return true;
      if (accessLevel === 'view' && action === 'view') return true;
      if (accessLevel === true) return true;
      return false;
    }

    // Fallback to standard RBAC permissions table (works for both admins & supervisors)
    const permissions =
      (Array.isArray(normalized.permissions) && normalized.permissions.length > 0
        ? normalized.permissions
        : normalized.access?.permissions) || [];
    const targetModule = module.toLowerCase();
    const targetAction = action.toLowerCase();

    return permissions.some((perm) => {
      const permModule = perm?.module?.toLowerCase().replace(/-/g, '_');
      const permAction = perm?.action?.toLowerCase();
      const normTargetModule = targetModule.replace(/-/g, '_');
      if (!permModule || !permAction) return false;
      if (permModule !== normTargetModule) return false;
      if (permAction === targetAction) return true;
      if (permAction === 'write' && targetAction === 'view') return true;
      return false;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: normalizeUser(user),
        login,
        verifyOTP,
        logout,
        refreshUser,
        hasPermission,
        isAdmin,
        isRefreshing,
        logPageView,
        logAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
