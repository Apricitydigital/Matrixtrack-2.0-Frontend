import { apiClient } from "../lib/apiClient";

const REQUESTS_BASE = "/supervisor/self-punch/requests";

export const supervisorSelfPunchApi = {
  getRequests: async ({ status = "pending", page = 1, limit = 20 }) => {
    const { data } = await apiClient.get(REQUESTS_BASE, {
      params: { status, page, limit },
    });
    return data;
  },
  getRequestDetail: async (requestId) => {
    const { data } = await apiClient.get(`${REQUESTS_BASE}/${requestId}`);
    return data;
  },
  approveRequest: async (requestId, note = "", extraBody = {}) => {
    const { data } = await apiClient.post(`${REQUESTS_BASE}/${requestId}/approve`, {
      note,
      ...extraBody,
    });
    return data;
  },
  rejectRequest: async (requestId, note) => {
    const { data } = await apiClient.post(`${REQUESTS_BASE}/${requestId}/reject`, {
      note,
    });
    return data;
  },
};

export const professionalAttendanceApi = {
  getSectorHierarchy: async () => {
    const { data } = await apiClient.get("/sectors");
    return data;
  },
  getAttendanceList: async ({ cityId, zoneId, wardId, kothiId, professionalId, date, month, page = 1, limit = 20 }) => {
    const { data } = await apiClient.get("/admin/professional-attendance", {
      params: {
        city_id: cityId || undefined,
        zone_id: zoneId || undefined,
        ward_id: wardId || undefined,
        kothi_id: kothiId || undefined,
        professional_id: professionalId || undefined,
        date: date || undefined,
        month: month || undefined,
        page,
        limit,
      },
    });
    return data;
  },
  getSummary: async ({ cityId, zoneId, wardId, kothiId, professionalId, date, month, startDate, endDate }) => {
    const { data } = await apiClient.get("/admin/professional-attendance/summary", {
      params: {
        city_id: cityId || undefined,
        zone_id: zoneId || undefined,
        ward_id: wardId || undefined,
        kothi_id: kothiId || undefined,
        professional_id: professionalId || undefined,
        date: date || undefined,
        month: month || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      },
    });
    return data;
  },
  getDateRangeSummary: async ({ cityId, zoneId, wardId, kothiId, professionalId, startDate, endDate, page = 1, limit = 20 }) => {
    const { data } = await apiClient.get("/admin/professional-attendance/date-range/summary", {
      params: {
        city_id: cityId || undefined,
        zone_id: zoneId || undefined,
        ward_id: wardId || undefined,
        kothi_id: kothiId || undefined,
        professional_id: professionalId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        limit,
      },
    });
    return data;
  },
  getDateRangeDetails: async ({ professionalId, startDate, endDate }) => {
    const { data } = await apiClient.get("/admin/professional-attendance/date-range/details", {
      params: {
        professional_id: professionalId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      },
      timeout: 12000,
    });
    return data;
  },
};

export const professionalLeaveMgmtApi = {
  getRequests: async ({
    status = "",
    page = 1,
    limit = 20,
    date = "",
    professionalId = "",
    cityId = "",
    zoneId = "",
    wardId = "",
    kothiId = "",
  } = {}) => {
    const { data } = await apiClient.get("/admin/professional-leave/requests", {
      params: {
        status: status || undefined,
        page,
        limit,
        date: date || undefined,
        professional_id: professionalId || undefined,
        city_id: cityId || undefined,
        zone_id: zoneId || undefined,
        ward_id: wardId || undefined,
        kothi_id: kothiId || undefined,
      },
    });
    return data;
  },
  approveRequest: async (requestId, note = "") => {
    const { data } = await apiClient.post(`/admin/professional-leave/requests/${requestId}/approve`, { note });
    return data;
  },
  rejectRequest: async (requestId, note) => {
    const { data } = await apiClient.post(`/admin/professional-leave/requests/${requestId}/reject`, { note });
    return data;
  },
  getLeaveAllocations: async (professionalId) => {
    const { data } = await apiClient.get(`/admin/professional-leave/allocations/${professionalId}`);
    return data;
  },
  setLeaveAllocations: async (professionalId, { allocations, week_off_days }) => {
    const { data } = await apiClient.put(`/admin/professional-leave/allocations/${professionalId}`, {
      allocations,
      week_off_days,
    });
    return data;
  },
  getAllocationLogs: async (professionalId) => {
    const { data } = await apiClient.get(`/admin/professional-leave/allocations/${professionalId}/logs`);
    return data;
  },
};
