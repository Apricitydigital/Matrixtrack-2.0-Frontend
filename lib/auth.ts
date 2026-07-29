import type { AuthUser, ModuleAssignment, Role } from "../types/auth";
import { getPersistedAccessToken } from "./session";

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
