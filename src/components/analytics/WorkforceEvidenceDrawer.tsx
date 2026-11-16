import React,{useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Search,Users} from 'lucide-react';
import {api} from '../../services/api';
import {matrixStore} from '../../services/store';
import {Drawer} from '../common/Drawer';
import {Pagination,usePagination} from '../common/Pagination';

type Day={date:string;state:string;present:boolean};
type Person={id:string;name:string;employeeId:string|null;registered:boolean;daroga:boolean;days:Day[]};
type Beat={id:string;name:string;employeeIds:string[];days:{date:string;state:string;presentIds:string[]}[]};
type Evidence={basis:string;receivedDays:string[];people:Person[];beats:Beat[]};
export const WORKFORCE_FACTORS:Record<string,string>={deployment:'Registered staff present',supervisorAvailability:'Daroga availability',unmannedBeatControl:'Verified staffed beat-days'};
export const attendanceState=(day?:Day)=>!day?'Attendance not found':day.state==='review'?'Needs review':day.state!=='matched'?'Attendance not found':day.present?'Present':'Matched non-present';
export function workforceDateRows(data:Evidence,factor:string){
  return data.receivedDays.map(date=>{
    const people=data.people.filter(p=>factor==='supervisorAvailability'?p.daroga:p.registered);
    return {date,actual:factor==='unmannedBeatControl'?data.beats.filter(b=>b.days.find(d=>d.date===date)?.state==='staffed').length:people.filter(p=>p.days.find(d=>d.date===date)?.present).length,required:factor==='unmannedBeatControl'?data.beats.length:people.length};
  });
}
export function WorkforceEvidenceDrawer({wardId,factor,onClose}:{wardId:string;factor:string;onClose:()=>void}) {
  const range=matrixStore.getDateRange(),key=JSON.stringify([wardId,range.from,range.to,matrixStore.loadRevision]);
  const [read,setRead]=useState<{key:string;data?:Evidence;error?:string}>({key:''}),[retry,setRetry]=useState(0);
  const [date,setDate]=useState(''),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const current=read.key===key?read:{key:''},data=current.data;
  useEffect(()=>{
    const c=new AbortController();setRead({key});setDate('');setQuery('');setFilter('all');
    api(`/ward-ranking/${encodeURIComponent(wardId)}/component/WORKFORCE?${new URLSearchParams({from:range.from,to:range.to,evidence:'attendance'})}`,{signal:c.signal,cache:'no-store'}).then(result=>{
      if(result?.data?.basis!=='registered_workforce'||!Array.isArray(result.data.people)||!Array.isArray(result.data.beats)||!Array.isArray(result.data.receivedDays)||result.period?.from!==range.from||result.period?.to!==range.to)throw Error('Exact ranking attendance evidence is unavailable. Update the backend and retry.');
      if(!c.signal.aborted)setRead({key,data:result.data});
    }).catch(error=>{if(!c.signal.aborted)setRead({key,error:error.message});});
    return()=>c.abort();
  },[key,retry]);
  useEffect(()=>{setDate('');setFilter('all');setQuery('');},[factor]);
  const dates=data?workforceDateRows(data,factor):[],actual=dates.reduce((n,d)=>n+d.actual,0),required=dates.reduce((n,d)=>n+d.required,0),isBeat=factor==='unmannedBeatControl';
  const dateRows=dates.filter(d=>!date||d.date===date);
  const names=data?.people.filter(p=>factor==='supervisorAvailability'?p.daroga:p.registered)||[];
  const peopleRows=data?names.flatMap(person=>person.days.filter(d=>(!date||d.date===date)&&(filter==='all'||filter==='present'&&d.present||filter==='missing'&&!d.present)).map(day=>({person,day}))).filter(row=>`${row.person.name} ${row.person.employeeId||''}`.toLowerCase().includes(query.toLowerCase())):[];
  const beatRows=data?data.beats.flatMap(beat=>beat.days.filter(d=>(!date||d.date===date)&&(filter==='all'||filter==='present'&&d.state==='staffed'||filter==='missing'&&d.state!=='staffed')).map(day=>({beat,day}))).filter(row=>row.beat.name.toLowerCase().includes(query.toLowerCase())):[];
  const list=isBeat?beatRows.map(row=>({beat:row,person:null})):peopleRows.map(row=>({beat:null,person:row}));
  const paging=usePagination(list,JSON.stringify([key,factor,date,filter,query]));
  return <Drawer isOpen={true} onClose={onClose} title={WORKFORCE_FACTORS[factor]||'Workforce details'} subtitle={`${range.from} to ${range.to} · Attendance evidence`} width="3xl"><section className="wf-evidence">
    <div className="wf-intro"><Users size={21}/><p>{isBeat?'A staffed beat-day has at least one assigned employee matched present in attendance. This does not verify a supervisor visit or physical presence at the beat.':'Each entry is one registered person on one date with received attendance data. Missing records are distinct from matched non-present records.'}</p></div>
    {current.error?<div role="alert" className="wf-error"><p>{current.error}</p><button onClick={()=>setRetry(n=>n+1)}>Retry evidence</button></div>:!data?<p role="status" className="analytics-empty">Loading exact ranking evidence…</p>:<>
      <div className="wf-totals">{[['present',isBeat?'Verified staffed beat-days':'Matched present person-days',actual],['all',isBeat?'Required beat-days':'Required person-days',required],['missing',isBeat?'No verified present match':'Not present / not verified',required-actual]].map(([id,label,value])=><button key={id} aria-pressed={filter===id} onClick={()=>{setFilter(String(id));setDate('');}}><span>{label}</span><strong>{value}</strong><small>Show {id==='all'?'all entries':id==='present'?'present matches':'remaining entries'} <ArrowUpRight size={12}/></small></button>)}</div>
      {!data.receivedDays.length?<p className="analytics-empty">No attendance uploaded for the selected dates. No person-days or beat-days are inferred.</p>:<>
        <div className="wf-section-heading"><div><span>DATE-WISE BREAKDOWN</span><h3>{date?'Names and assignments for '+date:'Choose a date to see names'}</h3></div>{date&&<button onClick={()=>setDate('')}><ArrowLeft size={13}/>All dates</button>}</div>
        <div className="wf-date-list">{dateRows.map(d=><button key={d.date} onClick={()=>{setDate(d.date);setQuery('');}} aria-pressed={date===d.date}><span>{d.date}</span><b>{d.actual} / {d.required}</b><small>{isBeat?'staffed beats':'present people'}<ArrowUpRight size={12}/></small></button>)}</div>
        <div className="wf-controls"><label><Search size={15}/><input aria-label="Search workforce evidence" placeholder={isBeat?'Find a beat…':'Find a name or employee ID…'} value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Workforce evidence status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All entries</option><option value="present">{isBeat?'Verified staffed':'Present matches'}</option><option value="missing">{isBeat?'No verified present match':'Not present / not verified'}</option></select></div>
        <p className="wf-count">{date||'All received dates'} · {list.length} {isBeat?'beat-days':'person-days'} · Click an entry for details</p>
        <div className="wf-register">{paging.rows.map(row=>row.person?<details key={`${row.person.person.id}:${row.person.day.date}`}><summary><span className="wf-person-avatar">{row.person.person.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('')}</span><span><b>{row.person.person.name}</b><small>{row.person.person.employeeId||'Employee ID not recorded'} · {row.person.day.date}</small></span><span className="wf-state" data-state={row.person.day.present?'present':row.person.day.state}>{attendanceState(row.person.day)}</span></summary><div className="wf-entry-body"><p><b>Date:</b> {row.person.day.date}</p><p><b>Attendance:</b> {attendanceState(row.person.day)}</p><p>{row.person.person.daroga?'Registered Daroga':'Registered workforce member'} · This entry contributes {row.person.day.present?'1':'0'} present person-day.</p></div></details>:row.beat?<details key={`${row.beat.beat.id}:${row.beat.day.date}`}><summary><span><b>{row.beat.beat.name}</b><small>{row.beat.day.date} · {row.beat.beat.employeeIds.length} assigned employees</small></span><span className="wf-state" data-state={row.beat.day.state==='staffed'?'present':row.beat.day.state}>{row.beat.day.state==='staffed'?'Verified staffed':row.beat.day.state==='confirmed_absent'?'All matched non-present':'Presence unverified'}</span></summary><div className="wf-entry-body"><h4>Assigned employees · {row.beat.day.date}</h4>{row.beat.beat.employeeIds.length?row.beat.beat.employeeIds.map(id=>{const person=data.people.find(p=>p.id===id),day=person?.days.find(d=>d.date===row.beat!.day.date);return <div className="wf-assigned-person" key={id}><span><b>{person?.name||'User not available'}</b><small>{person?.employeeId||'Employee ID not recorded'}</small></span><span className="wf-state" data-state={day?.present?'present':day?.state}>{attendanceState(day)}</span></div>;}):<p>No assigned field employees. Presence is unverified, not confirmed absent.</p>}</div></details>:null)}</div>
        {!list.length&&<p className="analytics-empty">No entries match this selection.</p>}<Pagination {...paging} noun={isBeat?'beat-days':'person-days'}/>
      </>}
    </>}
  </section></Drawer>;
}
