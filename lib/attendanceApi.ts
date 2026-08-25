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
  matrixTrackUserId: string | null;
  zones: string[];
  wards: string[];
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
    matrixTrackUserId: string | null;
    zones: string[];
    wards: string[];
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
  cityId?: string;
  from?: string;
  to?: string;
  status?: string;
  designation?: string;
  officeLocation?: string;
  divisionUnit?: string;
  checkoutState?: string;
  workDurationBucket?: string;
  search?: string;
  employeeGroup?: string;
  page?: number;
  pageSize?: number;
};


export type AttendanceCity = {
  id: string;
  name: string;
  code: string;
  ulbCode: string | null;
};

export type AttendanceCitiesResponse = {
  cities: AttendanceCity[];
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

export type AttendanceUploadCalendarResponse = {
  year: number;
  month: number;
  days: Array<{
    date: string;
    uploadCount: number;
    completedUploads: number;
    latestUploadAt: string | null;
  }>;
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
  cities: () =>
    apiFetch<AttendanceCitiesResponse>("/city/attendance/cities"),

  uploadCalendar: async (year: number, month: number, cityId?: string) => {
    // Reuse the existing attendance dashboard endpoint instead of requiring a
    // separate /upload-calendar backend route. This keeps the calendar/status
    // compatible with the current MatrixTrack 2.0 backend.
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const from = `${monthKey}-01`;
    const to = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

    const query: AttendanceDashboardQuery = {
      cityId,
      from,
      to,
      page: 1,
      pageSize: 1,
    };

    const result = await apiFetch<AttendanceDashboardResponse>(
      `/city/attendance/dashboard${toQueryString(query)}`
    );

    const days = new Map<
      string,
      {
        date: string;
        uploadCount: number;
        completedUploads: number;
        latestUploadAt: string | null;
      }
    >();

    // Recent upload batches give us the real file count when available.
    for (const upload of result.uploads || []) {
      const date = upload.attendanceDate.slice(0, 10);
      if (!date.startsWith(`${monthKey}-`)) continue;

      const current = days.get(date) || {
        date,
        uploadCount: 0,
        completedUploads: 0,
        latestUploadAt: null,
      };

      current.uploadCount += 1;
      if (upload.status.toUpperCase() === "COMPLETED") {
        current.completedUploads += 1;
      }
      if (!current.latestUploadAt || upload.createdAt > current.latestUploadAt) {
        current.latestUploadAt = upload.createdAt;
      }
      days.set(date, current);
    }

    // AttendanceDailyRecord is the durable source for older dates. If records
    // exist for a day, that day's CSV was successfully imported even if its
    // upload batch is no longer inside the backend's recent-upload list.
    for (const trend of result.dailyTrend || []) {
      if (!trend.total) continue;
      const date = trend.date.slice(0, 10);
      if (!date.startsWith(`${monthKey}-`)) continue;

      const current = days.get(date);
      if (current) {
        if (current.completedUploads === 0) current.completedUploads = 1;
      } else {
        days.set(date, {
          date,
          uploadCount: 1,
          completedUploads: 1,
          latestUploadAt: null,
        });
      }
    }

    return {
      year,
      month,
      days: Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },

  dashboard: (query: AttendanceDashboardQuery = {}) =>
    apiFetch<AttendanceDashboardResponse>(
      `/city/attendance/dashboard${toQueryString(query)}`
    ),

  upload: (file: File, cityId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (cityId) formData.append("cityId", cityId);

    return apiFetch<AttendanceUploadResponse>("/city/attendance/upload", {
      method: "POST",
      body: formData,
    });
  },
};