import type { Role } from "../types/auth";
export const ROLE_LABELS: Record<Role | string, string> = {
  HMS_SUPER_ADMIN: "HMS Super Admin",
  SUPER_ADMIN: "Super Admin",
  DIVISION_ADMIN: "Division Admin",
  EMPLOYEE: "Employee",
  SUPERVISOR: "Supervisor",
  COMMISSIONER: "ULB Official",
  QC: "Quality Controller",
  ULB_OFFICER: "ULB Officer",
  CITY_ADMIN: "City Admin",
  CITY_ADMINISTRATOR: "City Admin",
  ACTION_OFFICER: "Action Officer",
  ADMIN: "Admin",
  ADMINISTRATOR: "Admin"
};

export function roleLabel(role: Role | string) {
  if (!role) return '';
  const label = ROLE_LABELS[role] || role;
  return label.replace(/Administrator/gi, 'Admin');
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
