import { useEffect, useState } from 'react';
import { matrixStore } from './store';
import { loadDarogaAttendance } from './darogaAttendance';
import { darogaAttendance } from './darogaBreakdown';

type AttendanceRead = { key: string; rows: any[]; status: 'loading' | 'ready' | 'no_data' | 'error' };
/** Personal attendance for the selected period; never reuse another period's rows. */
export function useOfficerAttendance(cityId: string, rows: {user:any;stat:any}[], enabled: boolean, revision: number) {
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
  return {attendance,rows:rows.map(row => ({...row,att:darogaAttendance(row.user,people,attendance.rows,{from,to})}))};
}
