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
  | "EMPLOYEE"
  | "QC"
  | "ULB_OFFICER"
  | "hms_super_admin"
  | "super_admin"
  | "taskforce"
  | "TASKFORCE_ADMIN"
  | "swachh"
  | "SWACHH_ADMIN"
  | "swachh_sync"
  | "workforce"
  | "WORKFORCE_ADMIN"
  | "matrix_track"
  | (string & {});

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
  phone?: string;
  cityId?: string;
  cityName?: string;
  cityCode?: string;
  stateName?: string;
  divisionName?: string;
  districtName?: string;
  aadhaar?: string;
  role?: string;
  city?: any;
  roles: Role[];
  roleLabels?: string[];
  modules: ModuleAssignment[];
  token?: string;
  zoneIds?: string[];
  wardIds?: string[];
  zoneDetails?: Array<{ id: string; name: string }>;
  wardDetails?: Array<{ id: string; name: string }>;
  assignedBeats?: Array<{ id: string; beatName: string; beatCode?: string }>;
}
