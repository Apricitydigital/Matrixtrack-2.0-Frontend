import { useOfficerAttendance } from './useOfficerAttendance';
import { iecPerformance } from './iecPerformance';
export function useIecPerformance(cityId:string,rows:{user:any;stat:any}[],enabled:boolean,revision:number) {
  const model=useOfficerAttendance(cityId,rows,enabled,revision);
  const scored=model.rows.map(row=>{
    const breakdown=iecPerformance(row.stat,row.att,model.attendance.status==='loading');
    return {...row,breakdown,stat:{...row.stat,onTimeActionRate:breakdown.actions,performance:breakdown.score,scoreBasis:'reported',iecComposite:true,iecBreakdown:breakdown}};
  }).sort((a,b)=>(b.breakdown.score??-1)-(a.breakdown.score??-1)||a.user.name.localeCompare(b.user.name));
  return {...model,rows:scored};
}
