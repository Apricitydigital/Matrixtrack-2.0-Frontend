import type { CityUserApi } from './apiClient';
import { performanceRangeParams } from './userPerformanceScores';

/** Only the selected role's score endpoint is needed for the directory. */
export async function fetchPerformanceSummary(
  role: string,
  from: string,
  to: string,
  api: Pick<typeof CityUserApi, 'darogaPerformance' | 'siPerformance' | 'iecPerformance'>,
) {
  const range = performanceRangeParams(from, to);
  switch (role) {
    case 'SUPERVISOR': return { role: 'SUPERVISOR' as const, data: await api.darogaPerformance(range) };
    case 'QC': return { role: 'QC' as const, data: await api.siPerformance(range) };
    case 'ACTION_OFFICER': return { role: 'ACTION_OFFICER' as const, data: await api.iecPerformance(range) };
    default: return null;
  }
}
