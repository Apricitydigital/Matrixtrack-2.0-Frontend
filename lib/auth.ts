import jwt from "jsonwebtoken";
import type { AuthUser } from "../types/auth";

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

export function decodeToken(token?: string, fallback?: Partial<AuthUser>): AuthUser | null {
  if (!token) return null;
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded) return null;
    if (decoded.exp && Date.now() >= (decoded.exp as number) * 1000) {
      return null;
    }
    const modules = Array.isArray(decoded.modules)
      ? decoded.modules.map((m: any) => ({
          moduleId: m.moduleId,
          key: normalizeKey(m.key || m.name),
          name: m.name,
          canWrite: Boolean(m.canWrite),
          roles: m.roles
        }))
      : fallback?.modules || [];

    const roles = Array.isArray(decoded.roles) ? decoded.roles : fallback?.roles || [];
    const id = (decoded.sub as string) || fallback?.id;
    if (!id) return null;

    return {
      id,
      email: fallback?.email,
      name: fallback?.name,
      cityId: decoded.cityId || fallback?.cityId,
      cityName: fallback?.cityName,
      roles,
      modules
    };
  } catch (err) {
    console.error("Failed to decode token", err);
    return null;
  }
}
