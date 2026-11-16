import { useOfficerAttendance } from './useOfficerAttendance';
import { siPerformance } from './siPerformance';

export function useSiPerformance(cityId: string, rows: {user:any;stat:any}[], enabled: boolean, revision: number) {
  const model = useOfficerAttendance(cityId,rows,enabled,revision);
  const {attendance} = model;
  const scored = model.rows.map(row => {
    const {att} = row;
    const breakdown = siPerformance(row.stat,att,attendance.status === 'loading');
    return {...row,att,breakdown,stat:{...row.stat,reviewTargetPerformance:row.stat?.performance,performance:breakdown.score,scoreBasis:'reported',siComposite:true,siBreakdown:breakdown}};
  }).sort((a,b)=>(b.breakdown.score ?? -1)-(a.breakdown.score ?? -1)||a.user.name.localeCompare(b.user.name));
  return {rows:scored,attendance};
}
