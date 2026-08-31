import { apiFetch } from "@lib/apiClient";

export type TargetRole =
  | "SUPERVISOR"
  | "QC";

export type TargetPeriodType =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY";

export type TargetModule = {
  id: string;
  name: string;
  displayName: string | null;
};

export type TargetUser = {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  employeeId: string | null;
  role: TargetRole;

  modules: TargetModule[];
};

export type TargetOptionsResponse = {
  users: TargetUser[];
  supervisors: TargetUser[];
  qcUsers: TargetUser[];
  modules: TargetModule[];
};

export type EmployeeTarget = {
  id: string;
  cityId: string;
  userId: string;
  moduleId: string;

  role: TargetRole;
  periodType: TargetPeriodType;

  targetValue: number;

  startDate: string;
  endDate: string;

  isActive: boolean;

  createdById: string;
  updatedById: string | null;

  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    employeeId?: string | null;
  };

  module: TargetModule;

  _count?: {
    history: number;
  };
};

export type EmployeeTargetPerformance =
  EmployeeTarget & {
    achieved: number;
    remaining: number;
    progress: number;
    targetMet: boolean;
  };

export type TargetListResponse = {
  total: number;
  targets: EmployeeTarget[];
};

export type TargetPerformanceResponse = {
  total: number;
  targets: EmployeeTargetPerformance[];
};

export type CreateTargetPayload = {
  userId: string;
  moduleId: string;
  role: TargetRole;
  periodType: TargetPeriodType;
  startDate: string;
  targetValue: number;
};

export type CreateTargetResponse = {
  target: EmployeeTarget;
};

export type UpdateTargetPayload = {
  targetValue: number;
};

export type UpdateTargetResponse = {
  target: EmployeeTarget;
  changed: boolean;
};

export type TargetHistoryItem = {
  id: string;
  targetId: string;
  oldTargetValue: number;
  newTargetValue: number;
  changedById: string;
  changedAt: string;
};

export type TargetHistoryResponse = {
  target: {
    id: string;
    targetValue: number;

    user: {
      id: string;
      name: string;
    };

    module: TargetModule;
  };

  history: TargetHistoryItem[];
};

export const TargetsApi = {
  options() {
    return apiFetch<TargetOptionsResponse>(
      "/city/targets/options"
    );
  },

  list() {
    return apiFetch<TargetListResponse>(
      "/city/targets"
    );
  },

  performance() {
    return apiFetch<TargetPerformanceResponse>(
      "/city/targets/performance"
    );
  },

  create(
    payload: CreateTargetPayload
  ) {
    return apiFetch<CreateTargetResponse>(
      "/city/targets",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  update(
    targetId: string,
    payload: UpdateTargetPayload
  ) {
    return apiFetch<UpdateTargetResponse>(
      `/city/targets/${targetId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  history(
    targetId: string
  ) {
    return apiFetch<TargetHistoryResponse>(
      `/city/targets/${targetId}/history`
    );
  },
};