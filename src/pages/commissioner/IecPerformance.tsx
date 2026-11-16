import React, {useState} from 'react';
import {Drawer} from '../../components/common/Drawer';
import {Pagination,usePagination} from '../../components/common/Pagination';
import type {useIecPerformance} from '../../services/useIecPerformance';
import type {Ward,Zone} from '../../types';
import {officerGeography} from '../../services/performanceSelection';
import {matrixStore} from '../../services/store';
import {IecAttendance} from './IecAttendance';
import {OfficerPerformanceDetail} from './OfficerPerformanceDetail';
const pct=(value:number|null)=>value==null?'Not assessed':`${value.toFixed(1)}%`;
export function IecPerformance({model,rawStats,module,wards,zones,loading}:{model:ReturnType<typeof useIecPerformance>;rawStats:any;module:string;wards:Ward[];zones:Zone[];loading:boolean}) {
  const [tab,setTab]=useState('overall'),[selectedId,setSelected]=useState('');
  const {rows,attendance}=model,range=matrixStore.getDateRange();
  const pending=loading||attendance.status==='loading';
  const assessed=rows.filter(row=>row.breakdown.score!=null),selected=rows.find(row=>row.user.id===selectedId);
  const mean=assessed.length?assessed.reduce((n,row)=>n+row.breakdown.score!,0)/assessed.length:null;
  const failed=rows.length>0&&rows.every(row=>row.stat.availability==='error');
  const label=attendance.status==='loading'?'Loading...':attendance.status==='error'?'Unavailable':attendance.status==='no_data'?'No attendance data':'Not matched';
  const paging=usePagination(rows,JSON.stringify([module,range,rows.map(row=>[row.user.id,row.breakdown.score])]));
  return <section className="daroga-performance-view iec-performance-view">
    <div className="officer-overview">
      <article className="officer-overview-primary"><span>Average IEC overall score</span><strong>{pending?'Loading...':failed?'Unavailable':pct(mean)}</strong><p>{assessed.length} assessed / {rows.length} IEC users</p></article>
      <article><span>Score weights</span><strong>80% + 20%</strong><p>On-time actions + personal attendance</p></article>
      <article><span>Overdue actions</span><strong>{loading?'Loading...':failed?'Unavailable':rows.filter(row=>!row.stat.availability).reduce((n,row)=>n+(row.stat.overdue||0),0)}</strong><p>Assigned actions past their deadline</p></article>
      <article><span>Attendance availability</span><strong>{['loading','error'].includes(attendance.status)?label:`${rows.filter(row=>row.att?.score!=null).length} / ${rows.length}`}</strong><p>IEC users matched to selected-period records</p></article>
    </div>
    <section className="workspace-panel daroga-performance-tabs">
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">IEC PERFORMANCE</span><h2>Actions and attendance</h2><p>Select a member for the score breakdown and action evidence.</p></div><div className="view-switch no-print" role="tablist" aria-label="IEC performance parameter">{[['overall','Overall'],['attendance','Attendance']].map(([key,title])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{title}</button>)}</div></div>
      <p className="score-context-note">Overall = 80% on-time actions + 20% personal attendance. Actions = on time / (on time + late + overdue); in-progress actions are excluded. Attendance = present days / all selected calendar days. Missing records earn no attendance credit. An unassessed component is excluded and remaining weights are rescaled.</p>
      {['error','no_data'].includes(attendance.status)&&<p role="status" className="officer-attendance-notice">{attendance.status==='error'?'Attendance could not be loaded.':'No attendance uploaded for these dates.'} Attendance is unassessed; overall uses the available action component.</p>}
      {rows.some(row=>row.stat.availability==='error')&&<p role="status" className="officer-attendance-notice">Some IEC action calculations are unavailable. Those users have no overall score.</p>}
      {tab==='overall'&&<><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['IEC member','Assignment','Overall','On-time actions (80%)','Attendance (20%)','Overdue'].map(head=><th key={head}>{head}</th>)}</tr></thead><tbody>{paging.rows.map(row=>{
        const scope=officerGeography(row.user,wards,module),place=scope.wardIds.map(id=>wards.find(ward=>ward.id===id)?.name).filter(Boolean).join(', ')||scope.zoneIds.map(id=>zones.find(zone=>zone.id===id)?.name).filter(Boolean).join(', ')||'No assigned ward';
        return <tr key={row.user.id}><td><button className="si-officer-open" onClick={()=>setSelected(row.user.id)} aria-label={`Open IEC performance for ${row.user.name}`}><strong>{row.user.name}</strong><small>View breakdown</small></button></td><td>{place}</td><td><strong>{row.stat.availability==='error'?'Unavailable':pending?'Loading...':pct(row.breakdown.score)}</strong></td><td>{row.stat.availability==='loading'?'Loading...':row.stat.availability==='error'?'Unavailable':pct(row.breakdown.actions)}</td><td><strong>{row.att?pct(row.breakdown.attendance):label}</strong>{row.att&&<small className="officer-data-label">{row.att.presentDays} / {row.att.selectedDays} days; {row.att.missingDays} missing</small>}</td><td>{row.stat.availability?'—':row.stat.overdue??'—'}</td></tr>;
      })}</tbody></table></div>{!rows.length&&<p className="analytics-empty">No IEC users match this selection.</p>}<Pagination {...paging} noun="IEC users"/></>}
    </section>
    {tab==='attendance'&&<IecAttendance model={model}/>}
    <Drawer isOpen={!!selected} onClose={()=>setSelected('')} title={selected?.user.name||'IEC performance'} subtitle={`IEC - ${range.from} to ${range.to}`} width="4xl">{selected&&<>
      <div className="officer-overview">{([['Overall',selected.breakdown.score],['On-time actions (80%)',selected.breakdown.actions],['Attendance (20%)',selected.breakdown.attendance]] as const).map(([title,value])=><article key={title}><span>{title}</span><strong>{pending?'Loading...':pct(value)}</strong></article>)}</div>
      <p className="score-context-note">{selected.breakdown.weightUsed}/100 configured weight assessed. {selected.att?`Attendance: ${selected.att.presentDays} present / ${selected.att.selectedDays} selected days; ${selected.att.recordedDays} recorded, ${selected.att.absentDays} absent, ${selected.att.missingDays} missing.`:label}</p>
      {selected.stat.availability?<p role="status">Action evidence {selected.stat.availability==='loading'?'is loading':'is unavailable'}.</p>:<OfficerPerformanceDetail user={selected.user} raw={rawStats?.[selected.user.id]} role="ACTION_OFFICER" module={module} wards={wards} period={range}/>}
    </>}</Drawer>
  </section>;
}
