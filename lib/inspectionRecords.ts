import { ModuleRecordsApi } from './apiClient';

/** Inspection analytics includes bin inspections awaiting SI review, and excludes bin registrations. */
export function loadInspectionRecords(moduleKey: string, filters: { page?: number; limit?: number } = {}) {
  return ModuleRecordsApi.getRecords(moduleKey, {
    ...filters,
    tab: moduleKey === 'LITTERBINS' ? 'DAILY_REPORTS' : 'HISTORY',
  });
}
