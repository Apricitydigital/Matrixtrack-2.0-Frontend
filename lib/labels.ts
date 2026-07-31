import { Role } from "../types/auth";

export const ROLE_LABELS: Record<Role | string, string> = {
  HMS_SUPER_ADMIN: "State Super Admin",
  SUPER_ADMIN: "State Super Admin",
  DIVISION_ADMIN: "Division Admin",
  CITY_ADMIN: "City Admin",
  ZONE_ADMIN: "Zone Admin",
  WARD_ADMIN: "Ward Admin",
  COMMISSIONER: "Municipal Commissioner",
  SUPERVISOR: "Field Supervisor",
  QC: "Quality Controller",
  ACTION_OFFICER: "Action Officer",
  EMPLOYEE: "Field Staff / Member"
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
