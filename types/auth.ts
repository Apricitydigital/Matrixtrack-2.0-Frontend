export type Role =
  | "HMS_SUPER_ADMIN"
  | "SUPER_ADMIN"
  | "DIVISION_ADMIN"
  | "CITY_ADMIN"
  | "ZONE_ADMIN"
  | "WARD_ADMIN"
  | "COMMISSIONER"
  | "SUPERVISOR"
  | "ACTION_OFFICER"
  | "SUPERVISOR"
  | "EMPLOYEE"
  | "QC"
  | "ULB_OFFICER";

export type ModuleKey = string;
export type ModuleName = ModuleKey;

export interface ModuleAssignment {
  moduleId?: string;
  key: ModuleKey;
  name?: string;
  label?: string;
  cityId?: string;
  canWrite: boolean;
  roles?: Role[];
  zoneIds: string[];
  wardIds: string[];
}

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  cityId?: string;
  cityName?: string;
  roles: Role[];
  roleLabels?: string[];
  modules: ModuleAssignment[];
  token?: string;
}
