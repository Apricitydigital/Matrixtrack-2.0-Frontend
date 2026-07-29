export type Role =
  | "HMS_SUPER_ADMIN"
  | "CITY_ADMIN"
  | "COMMISSIONER"
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
