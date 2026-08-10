import { apiFetch } from "@lib/apiClient";

export type AttendanceSummary = {
  totalRecords: number;
  uniqueEmployees: number;
  present: number;
  absent: number;
  punchIn: number;
  checkedOut: number;
  openCheckIns: number;
  noPunch: number;
  attendanceRate: number;
  avgWorkMinutes: number | null;
  avgCheckInMinutes: number | null;
};

export type AttendanceRecord = {
  id: string;
  attendanceId: string;
  employeeName: string;
  designation: string | null;
  officeLocation: string | null;
  divisionUnit: string | null;
  attendanceDate: string;
  inTime: string | null;
  outTime: string | null;
  status: string;
};

export type AttendanceUpload = {
  id: string;
  fileName: string;
  attendanceDate: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  insertedRows: number;
  updatedRows: number;
  presentCount: number;
  absentCount: number;
  openCheckinCount: number;
  status: string;
  createdAt: string;
};

export type AttendanceDashboardResponse = {
  hasData: boolean;
  range: { from: string; to: string } | null;
  summary: AttendanceSummary | null;
  dailyTrend: Array<{
    date: string;
    total: number;
    present: number;
    absent: number;
    rate: number;
  }>;
  designationBreakdown: Array<{
    designation: string;
    total: number;
    present: number;
    absent: number;
    rate: number;
  }>;
  checkInDistribution: Array<{ hour: number; count: number }>;
  workDurationBuckets: Array<{ bucket: string; count: number }>;
  officeBreakdown: Array<{
    officeLocation: string;
    total: number;
    present: number;
    rate: number;
  }>;
  topEmployees: Array<{
    attendanceId: string;
    employeeName: string;
    designation: string | null;
    officeLocation: string | null;
    totalDays: number;
    presentDays: number;
    absentDays: number;
    attendanceRate: number;
    completedPunches: number;
    avgWorkMinutes: number | null;
  }>;
  records: AttendanceRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    designations: string[];
    officeLocations: string[];
    divisionUnits: string[];
  };
  uploads: AttendanceUpload[];
};

export type AttendanceDashboardQuery = {
  from?: string;
  to?: string;
  status?: string;
  designation?: string;
  officeLocation?: string;
  divisionUnit?: string;
  checkoutState?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AttendanceUploadResponse = {
  success: boolean;
  batch: {
    id: string;
    fileName: string;
    attendanceDate: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    insertedRows: number;
    updatedRows: number;
    presentCount: number;
    absentCount: number;
    openCheckinCount: number;
  };
  rejectedRows: Array<{ row: number; reason: string }>;
};

function toQueryString(query: AttendanceDashboardQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
}

export const AttendanceApi = {
  dashboard: (query: AttendanceDashboardQuery = {}) =>
    apiFetch<AttendanceDashboardResponse>(
      `/city/attendance/dashboard${toQueryString(query)}`
    ),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<AttendanceUploadResponse>("/city/attendance/upload", {
      method: "POST",
      body: formData,
    });
  },
};