import type { AccessLevel } from "../app/admin-management/page";

export interface UserModulePermissions {
  id: string;
  email: string;
  name: string;
  role: string;
  taskforceAccess: AccessLevel;
  swachhAccess: AccessLevel;
  workforceAccess: AccessLevel;
  mrfAccess: AccessLevel;
}

export const PERMISSIONS_STORAGE_KEY = "matrixtrack_user_permissions_v3";

export function getDefaultModuleAccess(role: string): {
  taskforceAccess: AccessLevel;
  swachhAccess: AccessLevel;
  workforceAccess: AccessLevel;
  mrfAccess: AccessLevel;
} {
  const r = (role || "").toUpperCase();

  if (r === "HMS_SUPER_ADMIN") {
    return {
      taskforceAccess: "WRITE",
      swachhAccess: "WRITE",
      workforceAccess: "WRITE",
      mrfAccess: "WRITE"
    };
  }

  if (r === "COMMISSIONER" || r === "CITY_ADMIN") {
    return {
      taskforceAccess: "WRITE",
      swachhAccess: "WRITE",
      workforceAccess: "WRITE",
      mrfAccess: "WRITE"
    };
  }

  if (r === "DIVISION_ADMIN") {
    return {
      taskforceAccess: "WRITE",
      swachhAccess: "WRITE",
      workforceAccess: "READ",
      mrfAccess: "READ"
    };
  }

  if (r === "ZONE_ADMIN") {
    return {
      taskforceAccess: "WRITE",
      swachhAccess: "RESTRICTED",
      workforceAccess: "WRITE",
      mrfAccess: "RESTRICTED"
    };
  }

  if (r === "WARD_ADMIN") {
    return {
      taskforceAccess: "WRITE",
      swachhAccess: "WRITE",
      workforceAccess: "RESTRICTED",
      mrfAccess: "RESTRICTED"
    };
  }

  return {
    taskforceAccess: "READ",
    swachhAccess: "RESTRICTED",
    workforceAccess: "RESTRICTED",
    mrfAccess: "RESTRICTED"
  };
}

export function getUserPermissions(
  user: { id?: string; email?: string; roles?: string[]; role?: string } | null
): UserModulePermissions {
  if (!user) {
    return {
      id: "",
      email: "",
      name: "",
      role: "EMPLOYEE",
      taskforceAccess: "RESTRICTED",
      swachhAccess: "RESTRICTED",
      workforceAccess: "RESTRICTED",
      mrfAccess: "RESTRICTED"
    };
  }

  const role = user.roles?.[0] || user.role || "EMPLOYEE";
  const email = (user.email || "").toLowerCase();
  const userId = user.id || "";

  // HMS Super Admin always gets unrestricted Write access to all 4 modules
  if (role === "HMS_SUPER_ADMIN" || user.roles?.includes("HMS_SUPER_ADMIN")) {
    return {
      id: userId,
      email,
      name: (user as any).name || "Super Admin",
      role: "HMS_SUPER_ADMIN",
      taskforceAccess: "WRITE",
      swachhAccess: "WRITE",
      workforceAccess: "WRITE",
      mrfAccess: "WRITE"
    };
  }

  // Read persisted permissions assigned by Super Admin
  try {
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem(PERMISSIONS_STORAGE_KEY)
        : null;

    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      const match = parsed.find(
        (u) =>
          (u.id && String(u.id) === String(userId)) ||
          (u.email && String(u.email).toLowerCase() === email)
      );

      if (match) {
        return {
          id: match.id || userId,
          email: match.email || email,
          name: match.name || (user as any).name || "",
          role: match.role || role,
          taskforceAccess: match.taskforceAccess || "RESTRICTED",
          swachhAccess: match.swachhAccess || "RESTRICTED",
          workforceAccess: match.workforceAccess || "RESTRICTED",
          mrfAccess: match.mrfAccess || "RESTRICTED"
        };
      }
    }
  } catch (e) {
    console.error("Failed to parse user permissions storage:", e);
  }

  const defaults = getDefaultModuleAccess(role);
  return {
    id: userId,
    email,
    name: (user as any).name || "",
    role,
    ...defaults
  };
}
