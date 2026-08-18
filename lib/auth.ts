import type {
  AuthUser,
  ModuleAssignment,
  Role
} from "../types/auth";

import {
  getPersistedAccessToken
} from "./session";

export const AUTH_COOKIE =
  "hms_access_token";

function setBrowserCookie(token: string) {
  document.cookie =
    `${AUTH_COOKIE}=${token}; path=/; samesite=lax; ${process.env.NODE_ENV === "production"
      ? "secure;"
      : ""
    }`;
}

export function setAuthCookie(
  token: string
) {
  if (typeof window !== "undefined") {
    setBrowserCookie(token);

    localStorage.setItem("token", token);
    localStorage.setItem("swachh_token", token);
    localStorage.setItem("hms_access_token", token);
    localStorage.setItem("taskforce_access_token", token);
    localStorage.setItem("matrixtrack_access_token", token);

    return;
  }

  const { cookies } =
    require("next/headers");

  cookies().set(
    AUTH_COOKIE,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/"
    }
  );
}

export function clearAuthCookie() {
  if (typeof window !== "undefined") {
    document.cookie =
      `${AUTH_COOKIE}=; Max-Age=0; path=/`;

    localStorage.removeItem("token");
    localStorage.removeItem("swachh_token");
    localStorage.removeItem("hms_access_token");
    localStorage.removeItem("taskforce_access_token");
    localStorage.removeItem("matrixtrack_access_token");
    localStorage.removeItem("user");

    return;
  }

  const { cookies } =
    require("next/headers");

  cookies().delete(AUTH_COOKIE);
}

export function getTokenFromCookies():
  | string
  | undefined {
  if (typeof window !== "undefined") {
    const match = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) =>
        cookie.startsWith(
          `${AUTH_COOKIE}=`
        )
      );

    const cookieToken =
      match?.split("=")?.[1];

    if (cookieToken) {
      return cookieToken;
    }

    const localToken =
      localStorage.getItem("token") ||
      localStorage.getItem("swachh_token") ||
      localStorage.getItem("hms_access_token") ||
      localStorage.getItem("taskforce_access_token") ||
      localStorage.getItem("matrixtrack_access_token");

    if (localToken) {
      return localToken;
    }
  }

  try {
    const { cookies } =
      require("next/headers");

    return cookies().get(
      AUTH_COOKIE
    )?.value;
  } catch {
    return undefined;
  }
}

// In production, JWT verification remains
// the responsibility of the backend.
function normalizeKey(key?: string) {
  return (key || "")
    .trim()
    .toUpperCase();
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
  user: (Partial<AuthUser> & { role?: string | Role; permissions?: any[]; assignedModules?: any[] }) | null | undefined
): AuthUser | null {
  if (!user?.id) return null;
  const initialRoles = Array.isArray(user.roles)
    ? user.roles
    : user.role
      ? [user.role as Role]
      : [];

  const rolesSet = new Set<string>(initialRoles.map((r) => String(r)));
  if (user.role) rolesSet.add(String(user.role));
  if (Array.isArray(user.permissions)) {
    user.permissions.forEach((p) => { if (p) rolesSet.add(String(p)); });
  }
  if (Array.isArray(user.assignedModules)) {
    user.assignedModules.forEach((m) => { if (m) rolesSet.add(String(m)); });
  }
  if (Array.isArray(user.modules)) {
    user.modules.forEach((m: any) => {
      if (m.key) rolesSet.add(String(m.key));
      if (m.name) rolesSet.add(String(m.name));
    });
  }

  const roles = Array.from(rolesSet) as Role[];

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || (user as any).mobileNumber || (user as any).mobile || "",
    cityId: user.cityId,
    cityName: user.cityName,
    cityCode: user.cityCode || (user as any).cityCode,
    stateName: user.stateName || (user as any).stateName,
    divisionName: user.divisionName || (user as any).divisionName,
    districtName: user.districtName || (user as any).districtName,
    aadhaar: (user as any).aadhaar || (user as any).aadhaarNumber || "",
    roles,
    roleLabels: Array.isArray(user.roleLabels) ? user.roleLabels : [],
    modules: normalizeModules(user.modules),
    token: user.token,
    zoneIds: Array.isArray(user.zoneIds) ? user.zoneIds : [],
    wardIds: Array.isArray(user.wardIds) ? user.wardIds : [],
    zoneDetails: Array.isArray(user.zoneDetails) ? user.zoneDetails : [],
    wardDetails: Array.isArray(user.wardDetails) ? user.wardDetails : [],
    assignedBeats: Array.isArray(user.assignedBeats) ? user.assignedBeats : []
  };
}

function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {
  const segments = token.split(".");

  if (segments.length < 2) {
    return null;
  }

  const base64 = segments[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const paddedBase64 = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    "="
  );

  const decodedJson = decodeURIComponent(
    Array.from(atob(paddedBase64))
      .map(
        (character) =>
          `%${character
            .charCodeAt(0)
            .toString(16)
            .padStart(2, "0")}`
      )
      .join("")
  );

  return JSON.parse(
    decodedJson
  ) as Record<string, unknown>;
}

export function decodeToken(
  token: string,
  fallbackUser?: (
    Partial<AuthUser> & {
      role?: string | Role;
    }
  ) | null
): AuthUser | null {
  try {
    const payload =
      decodeJwtPayload(token);

    const resolvedId =
      payload?.id ??
      payload?.sub ??
      fallbackUser?.id;

    const resolvedUser = {
      ...(fallbackUser || {}),
      ...(payload || {}),

      id: resolvedId
        ? String(resolvedId)
        : "",

      roles: Array.isArray(
        payload?.roles
      )
        ? payload.roles
        : fallbackUser?.roles,

      modules: Array.isArray(
        payload?.modules
      )
        ? payload.modules
        : fallbackUser?.modules,

      token
    };

    return normalizeAuthUser(
      resolvedUser as Partial<AuthUser> & {
        role?: string | Role;
      }
    );
  } catch {
    return normalizeAuthUser(
      fallbackUser || null
    );
  }
}

export function getStoredToken(): string | undefined {
  return getPersistedAccessToken() || undefined;
}

