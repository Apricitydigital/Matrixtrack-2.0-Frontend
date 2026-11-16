import { useEffect, useState } from 'react';
import { matrixStore } from './store';
import { loadDarogaAttendance } from './darogaAttendance';
import { darogaAttendance } from './darogaBreakdown';
import { siPerformance } from './siPerformance';

type AttendanceRead = { key: string; rows: any[]; status: 'loading' | 'ready' | 'no_data' | 'error' };
export function useSiPerformance(cityId: string, rows: {user:any;stat:any}[], enabled: boolean, revision: number) {
  const {from,to} = matrixStore.getDateRange();
  const key = JSON.stringify([cityId,from,to,matrixStore.loadRevision,revision]);
  const [read,setRead] = useState<AttendanceRead>({key:'',rows:[],status:'loading'});
  const attendance: AttendanceRead = read.key === key ? read : {key,rows:[],status:'loading'};
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setRead({key,rows:[],status:'loading'});
    loadDarogaAttendance(cityId,from,to,controller.signal).then(result => {
      if (!controller.signal.aborted) setRead({...result,key});
    }).catch(() => { if (!controller.signal.aborted) setRead({key,rows:[],status:'error'}); });
    return () => controller.abort();
  },[key,enabled]);
  const people = rows.map(row => row.user);
  const scored = rows.map(row => {
    const att = darogaAttendance(row.user,people,attendance.rows);
    const breakdown = siPerformance(row.stat,att,attendance.status === 'loading');
    return {...row,att,breakdown,stat:{...row.stat,reviewTargetPerformance:row.stat?.performance,performance:breakdown.score,scoreBasis:'reported',siComposite:true,siBreakdown:breakdown}};
  }).sort((a,b)=>(b.breakdown.score ?? -1)-(a.breakdown.score ?? -1)||a.user.name.localeCompare(b.user.name));
  return {rows:scored,attendance};
}
