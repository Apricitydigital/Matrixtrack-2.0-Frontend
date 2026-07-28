import { Role } from "../types/auth";

export const ROLE_LABELS: Record<Role | string, string> = {
  EMPLOYEE: "Taskforce Member",
  COMMISSIONER: "ULB Official",
  QC: "Quality Controller",
  CITY_ADMIN: "City Admin",
  ACTION_OFFICER: "Action Officer",
  HMS_SUPER_ADMIN: "HMS Super Admin"
};

export function roleLabel(role: Role | string) {
  return ROLE_LABELS[role] || role;
}

export const MODULE_LABELS: Record<string, string> = {
  TASKFORCE: "CTU/GVP Transformation",
  LITTERBINS: "Litter Bins",
  SWEEPING: "Sweeping",
  TOILET: "Cleanliness of Toilet"
};

export function moduleLabel(key: string, fallback?: string) {
  return MODULE_LABELS[key.toUpperCase()] || fallback || key;
}
