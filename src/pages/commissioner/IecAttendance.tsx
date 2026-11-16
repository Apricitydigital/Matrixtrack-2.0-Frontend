import React from 'react';
import { Pagination, usePagination } from '../../components/common/Pagination';
import type { useOfficerAttendance } from '../../services/useOfficerAttendance';
import { matrixStore } from '../../services/store';

const pct = (value: number | null | undefined) => value == null ? 'Not assessed' : `${value.toFixed(1)}%`;
export function IecAttendance({model}: {model: ReturnType<typeof useOfficerAttendance>}) {
  const {rows,attendance} = model, {from,to} = matrixStore.getDateRange();
  const label = attendance.status === 'loading' ? 'Loading...' : attendance.status === 'error' ? 'Unavailable' : attendance.status === 'no_data' ? 'No attendance data' : 'Not matched';
  const matched = rows.filter(row => row.att?.score != null);
  const mean = matched.length ? matched.reduce((sum,row) => sum + row.att!.score!,0) / matched.length : null;
  const paging = usePagination(rows,JSON.stringify([from,to,rows.map(row => row.user.id)]));
  return <section className="workspace-panel daroga-performance-tabs">
    <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">IEC ATTENDANCE</span><h2>Attendance for the selected period</h2><p>{from} to {to} (IST)</p></div><div><strong>{['loading','error'].includes(attendance.status) ? label : pct(mean)}</strong><p>{matched.length} / {rows.length} IEC users matched</p></div></div>
    <p className="score-context-note">Attendance = present days / all selected calendar days, inclusive. Missing records earn no attendance credit and are separate from recorded absences. This attendance rate supplies the 20% attendance component of the IEC overall score.</p>
    {['no_data','error'].includes(attendance.status) && <p className="officer-attendance-notice" role="status">{attendance.status === 'no_data' ? 'No attendance uploaded for these dates.' : 'Attendance could not be loaded.'}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['IEC member','Attendance','Present days','Selected days','Recorded days','Absent days','Missing days'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{paging.rows.map(({user,att}) => <tr key={user.id}><td><strong>{user.name}</strong></td><td><strong>{att ? pct(att.score) : label}</strong></td>{[att?.presentDays,att?.selectedDays,att?.recordedDays,att?.absentDays,att?.missingDays].map((value,index) => <td key={index}>{value ?? '—'}</td>)}</tr>)}</tbody></table></div>
    {!rows.length && <p className="analytics-empty">No IEC users match this selection.</p>}
    <Pagination {...paging} noun="IEC users"/>
  </section>;
}
