import React, {useState} from 'react';
import {ArrowUpRight, ClipboardCheck, Clock3, Users, ShieldCheck} from 'lucide-react';
import {Drawer} from '../../components/common/Drawer';
import {Pagination,usePagination} from '../../components/common/Pagination';
import {officerGeography} from '../../services/performanceSelection';
import {matrixStore} from '../../services/store';
import type {useSiPerformance} from '../../services/useSiPerformance';
import type {Ward,Zone} from '../../types';
import {OfficerPerformanceDetail} from './OfficerPerformanceDetail';

const pct = (v: number | null) => v == null ? 'Not assessed' : `${v.toFixed(1)}%`;
const count = (v: any) => typeof v === 'number' && Number.isFinite(v) ? v : '—';
function Score({value,pending=false}:{value:number|null;pending?:boolean}) {
  return <span className="officer-score" data-tone={value==null||pending?'muted':value>=75?'good':value>=40?'fair':'low'}><strong>{pending?'Loading...':pct(value)}</strong>{value!=null&&!pending&&<span className="officer-score-track" aria-hidden="true"><i style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></span>}</span>;
}
type Props = {model:ReturnType<typeof useSiPerformance>;rawStats:any;module:string;wards:Ward[];zones:Zone[];loading:boolean};
export function SiPerformance({model,rawStats,module,wards,zones,loading}:Props) {
  const [selectedId,setSelected]=useState(''),[tab,setTab]=useState('overall'),[detailTab,setDetailTab]=useState('overall');
  const {rows,attendance}=model,range=matrixStore.getDateRange();
  const pending=loading||attendance.status==='loading';
  const assessed=rows.filter(r=>r.breakdown.score!=null),mean=assessed.length?assessed.reduce((n,r)=>n+r.breakdown.score!,0)/assessed.length:null;
  const failed=rows.filter(r=>r.stat.availability==='error').length;
  const available=rows.filter(r=>!r.stat.availability);
  const sum=(key:string)=>available.reduce((n,r)=>n+(typeof r.stat[key]==='number'?r.stat[key]:0),0);
  const paging=usePagination(rows,JSON.stringify([module,range,rows.map(r=>[r.user.id,r.breakdown.score])]));
  const selected=rows.find(r=>r.user.id===selectedId);
  const attendanceLabel=attendance.status==='loading'?'Loading...':attendance.status==='error'?'Unavailable':attendance.status==='no_data'?'No attendance data':'Not matched';
  const geography=(user:any)=>{const scope=officerGeography(user,wards,module);return {zone:scope.zoneIds.map(id=>zones.find(z=>z.id===id)?.name).filter(Boolean).join(', ')||'—',ward:scope.wardIds.map(id=>wards.find(w=>w.id===id)?.name).filter(Boolean).join(', ')||'No assigned ward'};};
  const open=(id:string)=>{setSelected(id);setDetailTab('overall');};
  const heads=tab==='overall'?['Overall / 100','Reviews · 50%','On time · 30%','Attendance · 20%']:tab==='reviews'?['Target','Reviews counted','Approved','Rejected','Pending']:tab==='timing'?['On-time rate','On time','Late','Overdue','In progress']:['Attendance rate','Present days','Recorded days','Absent days'];
  const cells=(r:typeof rows[number])=>{
    if(r.stat.availability)return [<span key="state" className="officer-data-label">{r.stat.availability==='loading'?'Loading...':'Unavailable'}</span>,...heads.slice(1).map(()=> '—')];
    if(tab==='overall')return [<Score key="o" value={r.breakdown.score} pending={pending}/>,<Score key="r" value={r.breakdown.reviews}/>,<Score key="t" value={r.breakdown.timing}/>,r.att?.score!=null?<Score key="a" value={r.breakdown.attendance} pending={attendance.status==='loading'}/>:<span key="na" className="officer-data-label">{attendanceLabel}</span>];
    if(tab==='reviews')return ['target','counted','approved','rejected','pending'].map(key=>count(r.stat.targetReviews?.[key]));
    if(tab==='timing')return [<Score key="t" value={r.breakdown.timing}/>,...['onTime','late','overdue','inProgress'].map(key=>count(r.stat[key]))];
    return [r.att?<Score key="a" value={r.breakdown.attendance}/>:attendanceLabel,count(r.att?.presentDays),count(r.att?.recordedDays),count(r.att?.absentDays)];
  };
  return <section className="daroga-performance-view si-performance-view">
    <div className="si-score-banner"><div><span className="workspace-eyebrow">SANITARY INSPECTOR PERFORMANCE</span><h2>Every review counts. Every deadline matters.</h2><p>Review completion, timely decisions and personal attendance in one clear score.</p></div><div className="si-weight-pills"><span><ClipboardCheck size={15}/>50% reviews</span><span><Clock3 size={15}/>30% on time</span><span><Users size={15}/>20% attendance</span></div></div>
    <div className="officer-overview">
      <article className="officer-overview-primary"><span>Average SI score</span><strong>{pending?'Loading...':failed===rows.length&&failed?'Unavailable':pct(mean)}</strong><p>{assessed.length} assessed / {rows.length} SIs in view</p></article>
      <article><span>Review target delivery</span><strong>{loading?'Loading...':available.length?available.reduce((n,r)=>n+(r.stat.targetReviews?.counted||0),0):'—'}<small> / {loading?'—':available.reduce((n,r)=>n+(r.stat.targetReviews?.target||0),0)}</small></strong><p>Credited reviews against assigned targets</p></article>
      <article><span>Overdue reviews</span><strong>{loading?'Loading...':available.length?sum('overdue'):'—'}</strong><p>{sum('late')} completed late · Older pending backlog included</p></article>
      <article><span>Attendance availability</span><strong>{attendance.status==='error'?'Unavailable':attendance.status==='loading'?'Loading...':`${rows.filter(r=>r.breakdown.attendance!=null).length} / ${rows.length}`}</strong><p>{attendance.status==='no_data'?'No upload for the selected dates':'SIs matched to selected-period records'}</p></article>
    </div>
    {failed>0&&<p role="status" className="officer-attendance-notice">{failed} SI calculations unavailable. Summary includes available records only.</p>}
    <section className="workspace-panel daroga-performance-tabs">
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">SI LEADERBOARD</span><h2>Your team, score by score</h2><p className="officer-table-hint">Highest score first · Select an SI to inspect every parameter</p></div><div className="view-switch no-print" role="tablist" aria-label="SI performance parameter">{[['overall','Overall'],['reviews','Review targets'],['timing','Timeliness'],['attendance','Attendance']].map(([key,label])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div></div>
      <details className="officer-score-guide"><summary>How the 50 / 30 / 20 score works</summary><div className="si-formula-grid"><article><b>50% · Review targets</b><p>Credited eligible reviews ÷ effective assigned target, capped at 100%. Existing target-window caps apply. Approved and Rejected both earn review credit.</p></article><article><b>30% · Timeliness</b><p>On time ÷ (on time + late + overdue). Existing deadline: end of the next day in IST. In-progress work is excluded; older overdue backlog counts.</p></article><article><b>20% · Attendance</b><p>Present days ÷ recorded attendance days for the selected dates. No previous-day fallback. Missing parameters are excluded and remaining weights are rescaled.</p></article></div><p className="score-context-note">Approving a report as Cleaned earns no extra marks. Missing review timestamps leave timeliness unassessed. Filters select officers by assignment; each score covers their assigned scope for the chosen module and dates.</p></details>
      {['no_data','error'].includes(attendance.status)&&<p role="status" className="officer-attendance-notice"><ShieldCheck size={14}/>{attendance.status==='no_data'?'No attendance uploaded for these dates.':'Attendance could not be loaded.'} No attendance marks awarded; remaining assessed weights are rescaled.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Sanitary Inspector</th><th>Assignment</th>{heads.map(h=><th key={h}>{h}</th>)}<th><span className="sr-only">Details</span></th></tr></thead><tbody>{paging.rows.map(r=>{const place=geography(r.user);return <tr key={r.user.id}><td><button className="si-officer-open" onClick={()=>open(r.user.id)} aria-label={`Open SI performance for ${r.user.name}`}><span className="officer-identity"><span className="officer-avatar" aria-hidden="true">{r.user.name.split(/\s+/).map((n:string)=>n[0]).slice(0,2).join('')}</span><span><strong>{r.user.name}</strong><small>View performance breakdown</small></span></span></button></td><td><strong>{place.zone}</strong><small className="si-assigned-ward">{place.ward}</small></td>{cells(r).map((cell,i)=><td key={i}>{cell}</td>)}<td><button className="si-detail-arrow" aria-label={`View details for ${r.user.name}`} onClick={()=>open(r.user.id)}><ArrowUpRight size={17}/></button></td></tr>;})}</tbody></table></div>
      {!rows.length&&<p className="analytics-empty">No SIs match this selection.</p>}<Pagination {...paging} noun="SIs"/>
    </section>
    <Drawer isOpen={!!selected} onClose={()=>setSelected('')} title={selected?.user.name||'SI performance'} subtitle={`Sanitary Inspector · ${range.from} to ${range.to}`} width="4xl">{selected&&<div className="si-detail space-y-5">
      <div className="si-detail-heading"><span>OVERALL PERFORMANCE</span><strong>{selected.stat.availability==='error'?'Unavailable':pending?'Loading...':pct(selected.breakdown.score)}</strong><p>{selected.breakdown.weightUsed}/100 configured weight assessed. Missing parameters receive no credit; assessed weights are rescaled.</p></div>
      <div className="view-switch no-print" role="tablist" aria-label="SI detail section">{[['overall','Score breakdown'],['reviews','Review evidence'],['attendance','Attendance']].map(([key,label])=><button key={key} role="tab" aria-selected={detailTab===key} className={detailTab===key?'active':''} onClick={()=>setDetailTab(key)}>{label}</button>)}</div>
      {detailTab==='overall'&&<><div className="si-formula-grid">{([['reviews','Review completion',50],['timing','On-time reviews',30],['attendance','Personal attendance',20]] as const).map(([key,label,weight])=><article key={key}><span>{label} · {weight}%</span><Score value={selected.breakdown[key]} pending={pending}/><p>{selected.breakdown[key]==null?'Not assessed':`${(selected.breakdown[key]!/100*weight).toFixed(2)} / ${weight} base marks`}</p></article>)}</div><p className="score-context-note">Overall = sum of earned base marks ÷ assessed weight × 100. A missing parameter differs from a recorded zero.</p><div className="officer-timing-grid">{[['On time',selected.stat.onTime],['Completed late',selected.stat.late],['Overdue',selected.stat.overdue],['In progress',selected.stat.inProgress],['Older backlog overdue',selected.stat.backlogOverdue]].map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{count(value)}</strong></article>)}</div></>}
      {detailTab==='reviews'&&(selected.stat.availability?<p className="analytics-empty">Review evidence {selected.stat.availability==='loading'?'is loading':'is unavailable'}. Retry the selected period.</p>:<><p className="score-context-note">The target achievement below supplies the 50% review component. Module selection here changes review evidence only; the overall score above retains the page filters.</p><OfficerPerformanceDetail user={selected.user} raw={rawStats?.[selected.user.id]} role="QC" module={module} wards={wards} period={range}/></>)}
      {detailTab==='attendance'&&<><p className="score-context-note">Selected dates: {range.from} to {range.to}. Only this SI's matched personal attendance is used.</p><div className="officer-timing-grid">{[['Attendance rate',selected.att?pct(selected.breakdown.attendance):attendanceLabel],['Present days',count(selected.att?.presentDays)],['Recorded days',count(selected.att?.recordedDays)],['Absent days',count(selected.att?.absentDays)]].map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div><p className="score-context-note">Days without uploaded attendance are excluded, not treated as present or absent.</p></>}
    </div>}</Drawer>
  </section>;
}
