import jwt from "jsonwebtoken";
import type { AuthUser, ModuleAssignment, Role } from "../types/auth";
import { getPersistedAccessToken } from "./session";

export const AUTH_COOKIE = "hms_access_token";

function setBrowserCookie(token: string) {
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; samesite=lax; ${
    process.env.NODE_ENV === "production" ? "secure;" : ""
  }`;
}

export function setAuthCookie(token: string) {
  if (typeof window !== "undefined") {
    setBrowserCookie(token);
    localStorage.setItem("token", token);
    localStorage.setItem("swachh_token", token);
    return;
  }
  // Server-side render fallback
  const { cookies } = require("next/headers");
  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export function clearAuthCookie() {
  if (typeof window !== "undefined") {
    document.cookie = `${AUTH_COOKIE}=; Max-Age=0; path=/`;
    localStorage.removeItem("token");
    localStorage.removeItem("swachh_token");
    localStorage.removeItem("user");
    return;
  }
  const { cookies } = require("next/headers");
  cookies().delete(AUTH_COOKIE);
}

export function getTokenFromCookies(): string | undefined {
  if (typeof window !== "undefined") {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AUTH_COOKIE}=`));
    const cookieToken = match?.split("=")?.[1];
    if (cookieToken) return cookieToken;

    // Fallback to localStorage
    const localToken = localStorage.getItem("token") || localStorage.getItem("swachh_token");
    if (localToken && localToken !== "matrix_track_session_token") return localToken;
  }
  try {
    const { cookies } = require("next/headers");
    return cookies().get(AUTH_COOKIE)?.value;
  } catch (e) {
    return undefined;
  }
}

// NOTE: In production, validate the JWT signature with the backend's public key/secret.
function normalizeKey(key?: string) {
  return (key || "").trim().toUpperCase();
}

function normalizeModules(modules: unknown): ModuleAssignment[] {
  if (!Array.isArray(modules)) return [];
  return modules.map((module) => {
    const item = module as ModuleAssignment;
    return {
      moduleId: item.moduleId,
      key: normalizeKey(item.key || item.name),
      name: item.name,
      label: item.label,
      cityId: item.cityId,
      canWrite: Boolean(item.canWrite),
      roles: Array.isArray(item.roles) ? item.roles : undefined,
      zoneIds: Array.isArray(item.zoneIds) ? item.zoneIds : [],
      wardIds: Array.isArray(item.wardIds) ? item.wardIds : []
    };
  });
}

export function normalizeAuthUser(
  user: (Partial<AuthUser> & { role?: string | Role }) | null | undefined
): AuthUser | null {
  if (!user?.id) return null;
  const roles = Array.isArray(user.roles)
    ? user.roles
    : user.role
      ? [user.role as Role]
      : [];

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    cityId: user.cityId,
    cityName: user.cityName,
    roles,
    roleLabels: Array.isArray(user.roleLabels) ? user.roleLabels : [],
    modules: normalizeModules(user.modules),
    token: user.token
  };
}

export function getStoredToken(): string | undefined {
  return getPersistedAccessToken() || undefined;
}

export function decodeToken(token?: string, fallback?: Partial<AuthUser> | null): AuthUser | null {
  if (!token) return normalizeAuthUser(fallback);
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded) return normalizeAuthUser(fallback);
    if (decoded.exp && Date.now() >= (decoded.exp as number) * 1000) {
      return null;
    }

    const merged = {
      id: (decoded.sub as string) || fallback?.id || "",
      email: fallback?.email || decoded.email || "",
      name: fallback?.name || decoded.name || "",
      cityId: decoded.cityId || fallback?.cityId,
      cityName: fallback?.cityName,
      roles: Array.isArray(decoded.roles) && decoded.roles.length > 0 ? decoded.roles : (fallback?.roles || []),
      roleLabels: fallback?.roleLabels || [],
      modules: (Array.isArray(decoded.modules) && decoded.modules.length > 0) ? decoded.modules : (fallback?.modules || []),
      token
    };

    return normalizeAuthUser(merged);
  } catch (err) {
    console.error("Failed to decode token", err);
    return normalizeAuthUser(fallback);
  }
}

