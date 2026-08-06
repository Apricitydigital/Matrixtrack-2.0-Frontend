import type { AuthUser } from "./auth";

export interface ApiSuccess {
  success: boolean;
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUser;
  redirectTo: string;
}

export interface AuthMeResponse {
  user: Partial<AuthUser> & { role?: string };
}

export interface MasterNode {
  id: string;
  code: string;
  name: string;
}

export interface CityMasterNode extends MasterNode {
  districtId: string;
}

export interface CityAdminInfo {
  id?: string;
  name: string;
  email: string;
}

export interface CityRow {
  id: string;
  name: string;
  code: string;
  ulbCode?: string;
  enabled: boolean;
  state?: MasterNode | null;
  division?: MasterNode | null;
  district?: MasterNode | null;
  cityAdmins?: CityAdminInfo[];
  cityAdmin: CityAdminInfo | null;
  modules?: { id: string; name: string; enabled: boolean }[];
  createdAt?: string | Date;
}

export interface CityListResponse {
  cities: CityRow[];
}
