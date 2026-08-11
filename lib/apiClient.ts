import { getStoredToken } from "@lib/auth";
import { clearPersistedAccessToken, clearPersistedUserSnapshot } from "@lib/session";
import type { ModuleName } from "../types/auth";
import type { ApiSuccess, AuthLoginResponse, AuthMeResponse, CityListResponse, CityMasterNode, MasterNode } from "../types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
let logoutInProgress = false;

export function setLogoutInProgress(
  value: boolean
) {
  logoutInProgress = value;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function parseErrorMessage(raw: string, fallback: string) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === "string") return parsed.error;
  } catch { }
  return raw;
}

function handleUnauthorized(
  path: string,
  message: string
) {
  if (typeof window === "undefined") {
    return;
    console.error("[AUTH_401_TRACE]", {
      path,
      message,
      currentPath: window.location.pathname,
      unifiedSessionPresent: Boolean(
        localStorage.getItem("unified_auth_session")
      ),
      taskforceTokenPresent: Boolean(
        localStorage.getItem("taskforce_access_token")
      ),
      matrixtrackTokenPresent: Boolean(
        localStorage.getItem("matrixtrack_access_token")
      ),
      wardRankingTokenPresent: Boolean(
        localStorage.getItem("ward_ranking_access_token")
      ),
      genericTokenPresent: Boolean(
        localStorage.getItem("token")
      ),
      unifiedCookiePresent:
        document.cookie.includes("unified_session="),
      hmsCookiePresent:
        document.cookie.includes("hms_access_token="),
    });
  }
  /*
 * Logout ke dauran mounted dashboard ki pending
 * requests 401 de sakti hain. Unhe session expiry
 * nahi maana jayega.
 */
  if (logoutInProgress) {
    return;
  }

  const cleanPath = path.split("?")[0];

  /*
   * Login, OTP and registration failures should be
   * displayed inside their forms. They are not an
   * existing-session expiry.
   */
  const isAuthenticationRequest =
    cleanPath === "/auth/login" ||
    cleanPath === "/auth/logout" ||
    cleanPath === "/auth/register-request" ||
    cleanPath === "/auth/register-employee-request" ||
    cleanPath === "/auth/request-unified-registration" ||
    cleanPath === "/auth/unified-login" ||
    cleanPath.startsWith(
      "/auth/unified-login/"
    );

  if (isAuthenticationRequest) {
    return;
  }

  const normalizedMessage =
    message.toLowerCase();

  const isExpiredSession =
    normalizedMessage.includes(
      "expired token"
    ) ||
    normalizedMessage.includes(
      "invalid or expired token"
    ) ||
    normalizedMessage.includes(
      "missing authorization header"
    );

  if (!isExpiredSession) {
    return;
  }

  clearPersistedAccessToken();
  clearPersistedUserSnapshot();

  const currentPath =
    window.location.pathname || "";

  const isAuthenticationPage =
    currentPath.startsWith("/login") ||
    currentPath.startsWith(
      "/unified-login"
    ) ||
    currentPath.startsWith(
      "/create-account"
    ) ||
    currentPath.startsWith("/register");

  if (!isAuthenticationPage) {
    window.location.replace(
      "/unified-login?reason=session-expired"
    );
  }
}

async function buildHeaders(initHeaders?: HeadersInit, isFormData?: boolean) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...Object.fromEntries(new Headers(initHeaders).entries())
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const headers = await buildHeaders(init.headers, isFormData);
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
  const targetUrl = `${baseUrl}${path}`;

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      ...init,
      headers,
      cache: "no-store"
    });
  } catch (netErr: any) {
    console.error("[apiFetch] Network error for:", targetUrl, netErr);
    throw new ApiError(503, "Cannot connect to backend server at " + baseUrl);
  }

  if (!res.ok) {
    const rawMessage = await res.text();
    const message = parseErrorMessage(rawMessage, res.statusText);
    if (res.status === 401) {
      handleUnauthorized(path, message);
    }
    throw new ApiError(res.status, message || res.statusText);
  }

  return res.json();
}

export type UnifiedPortalKey =
  | "TASKFORCE_20"
  | "MATRIX_TRACK"
  | "WARD_RANKING"
  | "PROCESSING_PLANT";

export type UnifiedTaskforceModuleKey =
  | "TASKFORCE"
  | "SWEEPING"
  | "LITTERBINS"
  | "TOILET";

export type UnifiedRegistrationRole =
  | "SUPERVISOR"
  | "EMPLOYEE"
  | "QC"
  | "ACTION_OFFICER";

export interface UnifiedLoginResponse {
  success: boolean;

  requiresOtp?: boolean;

  provider?: "MATRIX_TRACK";

  email?: string;

  message?: string;

  pendingOtp?: {
    provider: "MATRIX_TRACK";
    email: string;
    message: string;
  } | null;

  user: {
    id?: string;
    name?: string;
    email: string;
    applications?: any[];
    [key: string]: any;
  };

  applications: any[];

  tokens: {
    taskforce?: string | null;
    matrixTrack?: string | null;
    wardRanking?: string | null;
    processingPlant?: string | null;
  };

  taskforce?: {
    user?: any;
    modules?: any[];
    redirectTo?: string | null;
  } | null;

  matrixTrack?: {
    user?: any;
    message?: string;
  } | null;

  wardRanking?: {
    user?: any;
    message?: string;
    redirectTo?: string | null;
  } | null;

  redirectTo: string | null;
}

export interface UnifiedRegistrationRequest {
  name: string;
  email: string;
  phone: string;
  aadhaar: string;
  password: string;
  stateId?: string;
  divisionId?: string;
  districtId?: string;
  cityId: string;
  zoneId?: string;
  wardId?: string;

  applicationRoles?: Partial<Record<UnifiedPortalKey, string>>;

  requestedRole?: UnifiedRegistrationRole;

  requestedPortals: UnifiedPortalKey[];
  taskforceModules: UnifiedTaskforceModuleKey[];
}

export const AuthApi = {
  login: async (body: { email: string; password: string; cityId?: string }) =>
    apiFetch<AuthLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  registerRequest: (body: {
    ulbCode: string;
    name: string;
    email: string;
    phone: string;
    aadharNumber: string;
    password: string;
    zoneId: string;
    wardId: string;
    cityId?: string;
  }) =>
    apiFetch<{ success: boolean; message: string }>("/auth/register-request", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  unifiedLogin: async (body: {
    email: string;
    password: string;
    cityId?: string;
  }) =>
    apiFetch<UnifiedLoginResponse>(
      "/auth/unified-login",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  unifiedVerifyMatrixTrackOtp: async (body: {
    email: string;
    otp: string;
  }) =>
    apiFetch<UnifiedLoginResponse>(
      "/auth/unified-login/verify-matrixtrack-otp",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  unifiedRegisterRequest: (
    body: UnifiedRegistrationRequest
  ) =>
    apiFetch<{
      success: boolean;
      message: string;
      requestId?: string;
      status?: string;
      requestedRole?: string;
      requestedPortals?: string[];
      taskforceModules?: string[];
      stateId?: string;
      divisionId?: string;
      districtId?: string;
    }>(
      "/auth/request-unified-registration",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  registerEmployeeRequest: (body: {
    ulbCode: string;
    name: string;
    email: string;
    phone: string;
    aadharNumber: string;
    password: string;
    zoneId: string;
    wardId: string;
    cityId?: string;
  }) =>
    apiFetch<{
      success: boolean;
      message: string;
    }>("/auth/register-employee-request", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logout: async () =>
    apiFetch<ApiSuccess>("/auth/logout", {
      method: "POST",
    }),

  getMe: async () =>
    apiFetch<AuthMeResponse>("/auth/me"),
};

export interface IntegratedRegistrationPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  aadharNumber?: string;
  cityId?: string;
  zoneId?: string;
  wardId?: string;
  targetSystems: Array<"TASKFORCE_20" | "SWACHH_RANKING">;
  taskforceConfig?: {
    role?: string;
    moduleKeys?: string[];
  };
  swachhConfig?: {
    role?: "accessor" | "qc" | "admin";
    accessorType?: "hms" | "pmc" | "janwani";
    ward?: string;
    zone?: string;
  };
}

export const CommonRegistrationApi = {
  register: (body: IntegratedRegistrationPayload) =>
    apiFetch<{
      success: boolean;
      email: string;
      userId?: string;
      swachhUserId?: string;
      taskforceCreated: boolean;
      swachhCreated: boolean;
      message: string;
    }>("/common-registration/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  bulkImport: (employees: IntegratedRegistrationPayload[]) =>
    apiFetch<{
      success: boolean;
      total: number;
      successCount: number;
      failCount: number;
      results: Array<{
        success: boolean;
        email: string;
        message: string;
        taskforceCreated: boolean;
        swachhCreated: boolean;
      }>;
    }>("/common-registration/bulk-import", {
      method: "POST",
      body: JSON.stringify({ employees }),
    }),

  getConfig: () =>
    apiFetch<{
      cities: { id: string; name: string; code: string }[];
      modules: { key: string; name: string }[];
      taskforceRoles: { key: string; label: string }[];
      swachhRoles: { key: string; label: string }[];
      swachhAccessorTypes: { key: string; label: string }[];
    }>("/common-registration/config"),
};

export const CityApi = {
  list: () => apiFetch<CityListResponse>("/hms/cities"),
  listStates: () => apiFetch<{ states: MasterNode[] }>("/hms/locations/states"),
  listDivisions: (stateId: string) =>
    apiFetch<{ divisions: (MasterNode & { stateId: string })[] }>(
      `/hms/locations/divisions?stateId=${encodeURIComponent(stateId)}`
    ),
  listDistricts: (stateId: string, divisionId: string) =>
    apiFetch<{ districts: (MasterNode & { stateId: string; divisionId: string })[] }>(
      `/hms/locations/districts?stateId=${encodeURIComponent(stateId)}&divisionId=${encodeURIComponent(divisionId)}`
    ),
  listCities: (districtId: string) =>
    apiFetch<{ cities: CityMasterNode[] }>(
      `/hms/locations/cities?districtId=${encodeURIComponent(districtId)}`
    ),
  create: (body: { stateId: string; divisionId: string; districtId: string; cityMasterId: string; code: string; ulbCode: string }) =>
    apiFetch("/hms/cities", { method: "POST", body: JSON.stringify(body) }),
  update: (cityId: string, body: { stateId?: string; divisionId?: string; districtId?: string; cityMasterId?: string; name?: string; code?: string; ulbCode?: string; enabled?: boolean; adminName?: string; adminEmail?: string }) =>
    apiFetch(`/hms/cities/${cityId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (cityId: string) =>
    apiFetch(`/hms/cities/${cityId}`, { method: "DELETE" }),
  setEnabled: (cityId: string, enabled: boolean) =>
    CityApi.update(cityId, { enabled }),
  toggleModule: (cityId: string, moduleId: string, enabled: boolean) =>
    apiFetch(`/hms/cities/${cityId}/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  createCityAdmin: (cityId: string, body: { email: string; password: string; name: string }) =>
    apiFetch(`/hms/cities/${cityId}/admins`, {
      method: "POST",
      body: JSON.stringify({ ...body, cityId })
    }),
  createCommissioner: (
    cityId: string,
    body: {
      email: string;
      password: string;
      name: string;
    }
  ) =>
    apiFetch(`/hms/cities/${cityId}/commissioners`, {
      method: "POST",
      body: JSON.stringify({
        ...body,
        cityId,
      }),
    }),
  updateCityAdmin: (cityId: string, userId: string, body: { email?: string; password?: string; name?: string }) =>
    apiFetch(`/hms/cities/${cityId}/admins/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  removeCityAdmin: (cityId: string, userId: string) =>
    apiFetch(`/hms/cities/${cityId}/admins/${userId}`, {
      method: "DELETE"
    }),
  getStats: (params?: { startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<{
      stats: {
        totalModules: number;
        qualityControllers: number;
        taskforceMembers: number;
        ulbOfficials: number;
        actionOfficers: number;
        cityAdmins: number;
      };
    }>(`/city/stats${query}`);
  }
};

export const HmsApi = {
  getGlobalStats: (params?: { startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<{
      stats: {
        totalModules: number;
        qualityControllers: number;
        taskforceMembers: number;
        ulbOfficials: number;
        actionOfficers: number;
        cityAdmins: number;
      };
    }>(`/hms/stats${query}`);
  }
};
export const ModuleApi = {
  list: () => apiFetch<{ modules: { id: string; name: string }[] }>("/hms/modules")
};

export const GeoApi = {
  list: (level?: string) => apiFetch<{ nodes: any[] }>(level ? `/city/geo?level=${level}` : "/city/geo"),
  create: (body: any) => apiFetch<{ node: any }>("/city/geo", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch<{ node: any }>(`/city/geo/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<{ success: boolean }>(`/city/geo/${id}`, { method: "DELETE" })
};

export const AreaBeatApi = {
  list: () => apiFetch<{ beats: any[] }>("/city/areas"),
  listMyBeats: () => apiFetch<{ beats: any[] }>("/city/areas/my-beats"),
  beatStatusOverview: async (params?: { date?: string; status?: string }) => {
    const res = await apiFetch<{ beats: any[] }>("/city/areas");
    let beats = res.beats || [];

    let total = 0, completed = 0, inProgress = 0, notDone = 0;
    beats.forEach(beat => {
      total++;
      const status = beat.lastAssessment?.status || beat.status;
      if (status === "APPROVED" || status === "COMPLETED") {
        completed++;
        beat.beatCompletionStatus = "COMPLETED";
      } else if (status === "PENDING" || status === "IN_PROGRESS" || status === "PENDING_QC") {
        inProgress++;
        beat.beatCompletionStatus = "IN_PROGRESS";
      } else {
        notDone++;
        beat.beatCompletionStatus = "NOT_DONE";
      }
    });

    if (params?.status && params.status !== "ALL") {
      beats = beats.filter(beat => {
        const status = beat.lastAssessment?.status || beat.status;
        if (params.status === "COMPLETED") return status === "APPROVED" || status === "COMPLETED";
        if (params.status === "IN_PROGRESS") return status === "PENDING" || status === "IN_PROGRESS" || status === "PENDING_QC";
        if (params.status === "NOT_DONE") return !status || status === "REJECTED" || status === "ACTION_REQUIRED" || status === "PENDING_ASSIGNMENT";
        return true;
      });
    }

    return {
      beats,
      summary: { total, completed, inProgress, notDone },
      date: params?.date || new Date().toISOString()
    };
  },
  listPendingRequests: (status?: string) =>
    apiFetch<{ pendingBeats: any[]; counts?: { pending: number; approved: number; rejected: number; all: number } }>(
      `/city/areas/pending-requests${status ? `?status=${status}` : ""}`
    ),
  reviewBeatRequest: (id: string, action: "APPROVE" | "REJECT", rejectionReason?: string) =>
    apiFetch<{ success: boolean; beat: any }>(`/city/areas/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ action, rejectionReason })
    }),
  create: (formData: FormData) =>
    apiFetch<{ id: string }>("/city/areas", {
      method: "POST",
      body: formData,
      headers: {} // Multi-part handled by browser
    }),
  update: (id: string, formData: FormData) =>
    apiFetch<{ id: string }>(`/city/areas/${id}`, {
      method: "PUT",
      body: formData,
      headers: {}
    }),
  remove: (id: string) => apiFetch<{ success: boolean }>(`/city/areas/${id}`, { method: "DELETE" }),
  listPotentialAssignees: (id: string, role?: string) =>
    apiFetch<any[]>(`/city/areas/${id}/potential-assignees${role ? `?role=${role}` : ""}`),
  assign: (
    id: string,
    userId: string | null,
    segmentId?: string | null,
    segmentIds?: string[],
    targetRole?: "SUPERVISOR" | "EMPLOYEE"
  ) =>
    apiFetch(`/city/areas/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ userId, segmentId, segmentIds, targetRole })
    })
};

export const PublicGeoApi = {
  states: () =>
    apiFetch<{
      states: {
        id: string;
        code: string;
        name: string;
      }[];
    }>("/public/locations/states"),

  divisions: (stateId: string) =>
    apiFetch<{
      divisions: {
        id: string;
        code: string;
        name: string;
        stateId: string;
      }[];
    }>(
      `/public/locations/divisions?stateId=${encodeURIComponent(stateId)}`
    ),

  districts: (stateId: string, divisionId: string) =>
    apiFetch<{
      districts: {
        id: string;
        code: string;
        name: string;
        stateId: string;
        divisionId: string;
      }[];
    }>(
      `/public/locations/districts?stateId=${encodeURIComponent(
        stateId
      )}&divisionId=${encodeURIComponent(divisionId)}`
    ),

  citiesByDistrict: (districtId: string) =>
    apiFetch<{
      cities: {
        id: string;
        code: string;
        name: string;
        stateId?: string;
        divisionId?: string;
        districtId?: string;
      }[];
    }>(
      `/public/locations/cities?districtId=${encodeURIComponent(districtId)}`
    ),

  // Keep existing APIs for other screens
  cities: () =>
    apiFetch<{
      cities: {
        id: string;
        name: string;
      }[];
    }>("/public/cities"),

  zones: (cityId: string) =>
    apiFetch<{
      zones: {
        id: string;
        name: string;
      }[];
    }>(`/public/cities/${cityId}/zones`),

  wards: (zoneId: string) =>
    apiFetch<{
      wards: {
        id: string;
        name: string;
      }[];
    }>(`/public/zones/${zoneId}/wards`),
};

export const CityUserApi = {
  list: () =>
    apiFetch<{
      users: {
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
        modules: { id: string; key: string; name: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }[];
        zoneIds?: string[];
        wardIds?: string[];
      }[];
    }>("/city/users"),
  create: (body: {
    name: string;
    email: string;
    password: string;
    role: string;
    zoneIds?: string[];
    wardIds?: string[];
    modules: { moduleId: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }[];
  }) => apiFetch("/city/users", { method: "POST", body: JSON.stringify(body) }),
  update: (
    id: string,
    body: {
      name?: string;
      role?: string;
      zoneIds?: string[];
      wardIds?: string[];
      modules?: { moduleId: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }[];
    }
  ) => apiFetch<{ success: boolean }>(`/city/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<{ success: boolean }>(`/city/users/${id}`, { method: "DELETE" })
};

export const CityModulesApi = {
  list: () => apiFetch<{ id: string; key: string; name: string; enabled: boolean }[]>("/city/modules")
};

// Module resolution cache (expects backend to expose module listing)
let moduleMap: Record<string, string> | null = null;
async function ensureModuleMap() {
  if (moduleMap) return moduleMap;
  const result = await ModuleApi.list();
  moduleMap = Object.fromEntries(result.modules.map((m) => [m.name.toUpperCase(), m.id]));
  return moduleMap;
}

export async function getModuleId(moduleName: ModuleName): Promise<string | undefined> {
  const map = await ensureModuleMap();
  return map[moduleName];
}

export const TaskforceApi = {
  listCases: (cityId?: string) => apiFetch<{ cases: any[] }>(cityId ? `/modules/taskforce/cases?cityId=${cityId}` : "/modules/taskforce/cases"),
  createCase: (body: { title: string; status?: string; geoNodeId?: string; assignedTo?: string }) =>
    apiFetch<{ case: any }>("/modules/taskforce/cases", { method: "POST", body: JSON.stringify(body) }),
  updateCase: (id: string, body: { status?: string; assignedTo?: string }) =>
    apiFetch<{ case: any }>(`/modules/taskforce/cases/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  addActivity: (id: string, body: { action: string; metadata?: any }) =>
    apiFetch<{ activity: any }>(`/modules/taskforce/cases/${id}/activity`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  assigned: () =>
    apiFetch<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/assigned"),
  feederRequests: () => apiFetch<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/requests"),
  approveRequest: (id: string, body: any) =>
    apiFetch<{ feederPoint: any }>(`/modules/taskforce/feeder-points/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  rejectRequest: (id: string) =>
    apiFetch<{ feederPoint: any }>(`/modules/taskforce/feeder-points/${id}/reject`, { method: "POST" }),
  submitReport: (id: string, body: { latitude: number; longitude: number; payload: any }) =>
    apiFetch<{ report: any }>(`/modules/taskforce/feeder-points/${id}/report`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  pendingFeederPoints: () => apiFetch<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/pending"),
  approvedFeederPoints: (assigned?: boolean) =>
    apiFetch<{ feederPoints: any[] }>(
      `/modules/taskforce/feeder-points/approved${assigned ? "?assigned=true" : ""}`
    ),
  assignFeederPoint: (id: string, employeeId: string) =>
    apiFetch<{ feederPoint: any }>(`/modules/taskforce/feeder-points/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ employeeId })
    }),
  pendingReports: () => apiFetch<{ reports: any[] }>("/modules/taskforce/reports/pending"),
  approveReport: (id: string) => apiFetch<{ report: any }>(`/modules/taskforce/reports/${id}/approve`, { method: "POST" }),
  rejectReport: (id: string) => apiFetch<{ report: any }>(`/modules/taskforce/reports/${id}/reject`, { method: "POST" }),
  actionRequiredReport: (id: string) =>
    apiFetch<{ report: any }>(`/modules/taskforce/reports/${id}/action-required`, { method: "POST" }),
  actionOfficerPending: () => apiFetch<{ reports: any[] }>("/modules/taskforce/action-officer/pending"),
  actionOfficerSubmit: (id: string, body?: { actionNote?: string }) =>
    apiFetch<{ report: any }>(`/modules/taskforce/action-officer/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(body || {})
    }),
  getRecords: (filters?: { page?: number; limit?: number; tab?: string; cityId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.tab) params.append("tab", filters.tab);
    if (filters?.cityId) params.append("cityId", filters.cityId);
    return apiFetch<{
      data: any[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      stats: { pending: number; approved: number; rejected: number; actionRequired: number; total: number };
    }>(`/modules/taskforce/records?${params.toString()}`);
  },
  myTasks: () => apiFetch<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/assigned")
};

export const StorageApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return apiFetch<{ url: string }>("/storage/upload", {
      method: "POST",
      body: formData,
      headers: {} // Let browser set boundary
    });
  }
};

export const ToiletApi = {
  // Stats & Dashboard
  getDashboardStats: (params?: { startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<any>(`/modules/toilet/stats${query}`);
  },

  // Master & Search
  listToilets: () => apiFetch<{ toilets: any[] }>("/modules/toilet/assigned"),
  listAllToilets: () => apiFetch<{ toilets: any[] }>("/modules/toilet/all"),
  getToiletDetails: (id: string) => apiFetch<{ toilet: any }>(`/modules/toilet/${id}`),
  summary: () => apiFetch<{ summary: { status: string; count: number }[] }>("/modules/toilet/reports/summary"),

  // Registration & Approval
  listPendingToilets: () => apiFetch<{ toilets: any[] }>("/modules/toilet/pending"),
  approveToilet: (id: string, body: { assignedEmployeeIds?: string[] } = {}) =>
    apiFetch(`/modules/toilet/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  rejectToilet: (id: string, reason: string) =>
    apiFetch(`/modules/toilet/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),

  bulkImport: (csvText: string) =>
    apiFetch<{ count: number }>("/modules/toilet/bulk-import", {
      method: "POST",
      body: JSON.stringify({ csvText })
    }),

  // Operational
  listInspections: (params?: { status?: string; employeeId?: string; page?: number; pageSize?: number; startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.employeeId) sp.append('employeeId', params.employeeId);
    if (params?.page) sp.append('page', params.page.toString());
    if (params?.pageSize) sp.append('pageSize', params.pageSize.toString());
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<{ inspections: any[]; total: number; page: number; pageSize: number }>(`/modules/toilet/inspections${query}`);
  },
  getInspectionDetails: (id: string) => apiFetch<{ inspection: any }>(`/modules/toilet/inspections/${id}`),
  submitInspection: (body: any) =>
    apiFetch("/modules/toilet/inspections/submit", { method: "POST", body: JSON.stringify(body) }),
  reviewInspection: (id: string, body: { status: string; comment?: string }) =>
    apiFetch(`/modules/toilet/inspections/${id}/review`, { method: "POST", body: JSON.stringify(body) }),

  // Geo Data Proxy
  getZones: () => apiFetch<{ nodes: any[] }>("/city/geo?level=ZONE"),
  getWardsByZone: (zoneId: string) => apiFetch<{ nodes: any[] }>(`/city/geo?level=WARD&parentId=${zoneId}`),

  // Assignments
  listEmployees: () => apiFetch<{ employees: any[] }>("/modules/toilet/staff"),
  bulkAssignToilets: (supervisorId: string, toiletIds: string[], category: string) =>
    apiFetch("/modules/toilet/assignments/bulk", {
      method: "POST",
      body: JSON.stringify({ supervisorId, toiletIds, category })
    }),
  unassignToilet: (supervisorId: string, toiletId: string) =>
    apiFetch("/modules/toilet/assignments/remove", {
      method: "POST",
      body: JSON.stringify({ supervisorId, toiletId })
    })
};

export const ModuleRecordsApi = {
  getRecords: (
    moduleKey: string,
    filters?: {
      cityId?: string;
      zoneIds?: string[];
      wardIds?: string[];
      page?: number;
      limit?: number;
      tab?: string;
      fromDate?: string;
      toDate?: string;
    }
  ) => {
    const params = new URLSearchParams();
    if (filters?.cityId) params.append("cityId", filters.cityId);
    if (filters?.zoneIds?.length) filters.zoneIds.forEach(id => params.append("zoneIds", id));
    if (filters?.wardIds?.length) filters.wardIds.forEach(id => params.append("wardIds", id));
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.tab) params.append("tab", filters.tab);
    if (filters?.fromDate) params.append("startDate", filters.fromDate);
    if (filters?.toDate) params.append("endDate", filters.toDate);

    const queryString = params.toString();
    const url = `/modules/${moduleKey}/records${queryString ? `?${queryString}` : ""}`;

    return apiFetch<{
      city: string;
      module: string;
      data: any[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      stats?: { pending: number; approved: number; total: number; actionRequired: number; actionTaken: number };
    }>(url);
  },
  updateRecordStatus: (moduleKey: string, id: string, status: string, remarks?: string, extraData?: any) => {
    return apiFetch(`/modules/${moduleKey}/records/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, remarks, ...extraData })
    });
  }
};

export const RegistrationApi = {
  listRequests: () =>
    apiFetch<{
      requests: { id: string; name: string; email: string; phone: string; aadhaar: string; status: string; createdAt: string; requestedRole?: "SUPERVISOR" | "EMPLOYEE" | "QC" | "ACTION_OFFICER" }[];
    }>("/city/registration-requests"),
  approve: (id: string, body: { role: "SUPERVISOR" | "EMPLOYEE" | "QC" | "ACTION_OFFICER"; moduleKeys: string[] }) =>
    apiFetch<{ success: boolean }>(`/city/registration-requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  reject: (id: string, reason?: string) =>
    apiFetch<{ success: boolean }>(`/city/registration-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {})
    })
};

export const EmployeesApi = {
  list: async (moduleKey?: string) => {
    const res = await CityUserApi.list();
    const normalizedModuleKey = moduleKey?.trim().toUpperCase();
    const employees = (res.users || [])
      .filter((user) =>
        normalizedModuleKey
          ? (user.modules || []).some((module) => module.key?.toUpperCase() === normalizedModuleKey)
          : true
      )
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        modules: user.modules || [],
        zones: user.zoneIds || [],
        wards: user.wardIds || [],
        createdAt: user.createdAt
      }));

    return { employees };
  }
};

export const TwinbinApi = {
  requestBin: (body: {
    zoneId: string;
    wardId: string;
    areaName: string;
    areaType: string;
    locationName: string;
    roadType: string;
    isFixedProperly: boolean;
    hasLid: boolean;
    condition: string;
    latitude: number;
    longitude: number;
  }) => apiFetch<{ bin: any }>("/modules/twinbin/bins/request", { method: "POST", body: JSON.stringify(body) }),
  myRequests: () =>
    apiFetch<{
      bins: {
        id: string;
        areaName: string;
        locationName: string;
        condition: string;
        status: string;
        createdAt: string;
      }[];
    }>("/modules/twinbin/bins/my-requests"),
  assigned: () =>
    apiFetch<{
      bins: {
        id: string;
        areaName: string;
        locationName: string;
        condition: string;
        status: string;
        createdAt: string;
        latitude?: number;
        longitude?: number;
      }[];
    }>("/modules/twinbin/bins/assigned"),
  myBins: () => apiFetch<{ bins: any[] }>("/modules/twinbin/bins/my"),
  pending: (page = 1, limit = 20) => apiFetch<{ data: any[], meta: any }>(`/modules/twinbin/bins/pending?page=${page}&limit=${limit}`),
  pendingBinRequests: (page = 1, limit = 20) => apiFetch<{ data: any[], meta: any }>(`/modules/twinbin/bin-requests/pending?page=${page}&limit=${limit}`),
  approveBinRequest: (id: string, body: { assignedEmployeeIds?: string[] } = {}) =>
    apiFetch<{ bin: any }>(`/modules/twinbin/bin-requests/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  rejectBinRequest: (id: string) =>
    apiFetch<{ bin: any }>(`/modules/twinbin/bin-requests/${id}/reject`, { method: "POST" }),
  approve: (id: string, body: { assignedEmployeeIds?: string[] }) =>
    apiFetch<{ bin: any }>(`/modules/twinbin/bins/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  assign: (id: string, body: { assignedEmployeeIds: string[] }) =>
    apiFetch<{ bin: any }>(`/modules/twinbin/bins/${id}/assign`, { method: "POST", body: JSON.stringify(body) }),
  reject: (id: string) => apiFetch<{ bin: any }>(`/modules/twinbin/bins/${id}/reject`, { method: "POST" }),
  submitVisit: (binId: string, body: { latitude: number; longitude: number; inspectionAnswers: Record<string, { answer: "YES" | "NO"; photoUrl: string }> }) =>
    apiFetch<{ report: any }>(`/modules/twinbin/bins/${binId}/visit`, { method: "POST", body: JSON.stringify(body) }),
  submitReport: (binId: string, body: { latitude: number; longitude: number; questionnaire: any; proximityToken: string }) =>
    apiFetch<{ report: any }>(`/modules/twinbin/bins/${binId}/report`, { method: "POST", body: JSON.stringify(body) }),
  reportContext: (binId: string, lat: number, lon: number) => {
    const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() });
    return apiFetch<{
      allowed: boolean;
      distanceMeters: number;
      message?: string;
      bin?: any;
      formConfig?: any;
      proximityToken: string | null;
    }>(`/modules/twinbin/bins/${binId}/report-context?${params.toString()}`);
  },
  pendingVisits: (page = 1, limit = 20) =>
    apiFetch<{ data: any[], meta: any }>(`/modules/twinbin/visits/pending?page=${page}&limit=${limit}`),
  approveVisit: (id: string) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/approve`, { method: "POST" }),
  rejectVisit: (id: string) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/reject`, { method: "POST" }),
  markActionRequired: (id: string, body: { qcRemark: string }) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/action-required`, { method: "POST", body: JSON.stringify(body) }),
  listActionRequired: () =>
    apiFetch<{ visits: any[] }>("/modules/twinbin/visits/action-required"),
  submitActionTaken: (id: string, body: { actionRemark: string; actionPhotoUrl: string }) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/action-taken`, { method: "POST", body: JSON.stringify(body) }),
  pendingReports: (page = 1, limit = 20) => apiFetch<{ data: any[], meta: any }>(`/modules/twinbin/reports/pending?page=${page}&limit=${limit}`),
  approvedReports: (page = 1, limit = 20) => apiFetch<{ data: any[], meta: any }>(`/modules/twinbin/reports/approved?page=${page}&limit=${limit}`),
  rejectedReports: (page = 1, limit = 20) => apiFetch<{ data: any[], meta: any }>(`/modules/twinbin/reports/rejected?page=${page}&limit=${limit}`),
  actionRequiredReports: (page = 1, limit = 20) => apiFetch<{ data: any[], meta: any }>(`/modules/twinbin/reports/action-required?page=${page}&limit=${limit}`),
  approveReport: (id: string) => apiFetch<{ report: any }>(`/modules/twinbin/reports/${id}/approve`, { method: "POST" }),
  rejectReport: (id: string) => apiFetch<{ report: any }>(`/modules/twinbin/reports/${id}/reject`, { method: "POST" }),
  actionRequiredReport: (id: string) =>
    apiFetch<{ report: any }>(`/modules/twinbin/reports/${id}/action-required`, { method: "POST" }),
  actionOfficerPending: () => apiFetch<{ reports: any[] }>("/modules/twinbin/action-officer/pending"),
  actionOfficerHistory: () => apiFetch<{ reports: any[] }>("/modules/twinbin/action-officer/history"),
  actionOfficerSubmit: (id: string, body?: { actionNote?: string }) =>
    apiFetch<{ report: any }>(`/modules/twinbin/action-officer/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(body || {})
    })
};






