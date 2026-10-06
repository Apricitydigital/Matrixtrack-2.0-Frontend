import { apiFetch } from '../lib/apiClient';
import type {
  ProcessingPlant,
  ProcessingPlantDashboardData,
  ProcessingPlantEntriesResponse,
  ProcessingPlantFiltersState,
  ProcessingPlantUploadResult,
} from '../types/processingPlant';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  '';

function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

function toQuery(params: Partial<ProcessingPlantFiltersState> & Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  const json = await response.json();
  return (json?.data ?? json) as T;
}

export async function getProcessingPlants(): Promise<ProcessingPlant[]> {
  const data = await apiGet<any>('/modules/processing-plant/plants');
  return Array.isArray(data) ? data : data?.plants ?? data?.items ?? [];
}

export async function getProcessingPlantDashboard(
  filters: Partial<ProcessingPlantFiltersState>,
): Promise<ProcessingPlantDashboardData | any> {
  return apiGet(`/modules/processing-plant/dashboard${toQuery(filters)}`);
}

export async function getProcessingPlantDetail(
  plantId: string,
  filters: Pick<ProcessingPlantFiltersState, 'from' | 'to'>,
): Promise<any> {
  return apiGet(
    `/modules/processing-plant/plants/${encodeURIComponent(plantId)}/dashboard${toQuery(filters)}`,
  );
}

export async function getProcessingPlantEntries(
  filters: Partial<ProcessingPlantFiltersState> & { page?: number; limit?: number },
): Promise<ProcessingPlantEntriesResponse | any> {
  return apiGet(`/modules/processing-plant/entries${toQuery(filters)}`);
}

/**
 * Alternative to the Google Form: upload the plant-wise Excel file
 * ("All Plants Data Format.xlsx"). Missing data is not rejected; the
 * response lists what was imported and what is missing.
 */
export async function uploadProcessingPlantExcel(file: File): Promise<ProcessingPlantUploadResult> {
  const body = new FormData();
  body.append('file', file);
  const json = await apiFetch<{ success: boolean; data: ProcessingPlantUploadResult }>(
    '/modules/processing-plant/upload',
    { method: 'POST', body },
  );
  return json.data;
}

export const processingPlantService = {
  getPlants: getProcessingPlants,
  getDashboard: getProcessingPlantDashboard,
  getPlantDashboard: getProcessingPlantDetail,
  getEntries: getProcessingPlantEntries,
  uploadExcel: uploadProcessingPlantExcel,
};
