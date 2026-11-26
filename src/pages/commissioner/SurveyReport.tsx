import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Printer, Users, X } from 'lucide-react';
import type { City, OperationalModuleId, OperationalReport, Ward } from '../../types';
import type { MapAsset } from '../../services/operationsMap';
import { datePreset } from '../../services/presentation';
import { geographyOrder } from '../../services/wardInspections';
import { matrixStore } from '../../services/store';
import { todayIST } from '../../services/api';
import { printElement } from '../../services/print';

type SurveyModule = 'sweeping' | 'toilets' | 'litter_bins';
type SurveyCounts = { total: number; surveyed: Set<string>; uncertain: boolean };
type WardReport = { ward: Ward; counts: Record<SurveyModule, SurveyCounts>; people: Map<string, string>; assignedPeople: Map<string, string>; hasSurvey: boolean };
type SiDecision = 'accepted' | 'rejected' | 'other' | 'pending';
type SiDetail = { report: OperationalReport; wardName: string; siName: string; decision: SiDecision; remarks: string };
type SiGroup = { key: string; wardName: string; siName: string; accepted: number; rejected: number; other: number; pending: number };
const MODULES: { id: SurveyModule; total: string; done: string; pending: string }[] = [
  { id: 'sweeping', total: 'Total Beats', done: 'Beats Surveyed', pending: 'Pending Beats' },
  { id: 'litter_bins', total: 'Total Assigned Litter bins', done: 'Litterbin Surveyed', pending: 'Pending litterbin Surveyed' },
  { id: 'toilets', total: 'Total Assigned Toilets', done: 'Toilet Surveyed', pending: 'Pending Toilet' },
];
const EMPTY_COUNTS = (): SurveyCounts => ({ total: 0, surveyed: new Set(), uncertain: false });
const number = (value: number) => value.toLocaleString('en-IN');
const isSurveyModule = (value: OperationalModuleId): value is SurveyModule => value === 'sweeping' || value === 'toilets' || value === 'litter_bins';

interface Props {
  city: City;
  wards: Ward[];
  assets: MapAsset[];
  reports: OperationalReport[];
  from: string;
  to: string;
  inventoryAvailable: boolean;
  failedModules: OperationalModuleId[];
  loading: boolean;
}

export function SurveyReport({ city, wards, assets, reports, from, to, inventoryAvailable, failedModules, loading }: Props) {
  const formattedRef = useRef<HTMLDivElement>(null);
  const [periodError, setPeriodError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [siPreviewOpen, setSiPreviewOpen] = useState(false);
  const choices = [['today', 'Today'], ['yesterday', 'Yesterday'], ['last_7_days', 'Last 7 days'], ['last_30_days', 'Last 30 days'], ['last_90_days', 'Last 90 days'], ['this_month', 'This month']] as const;
  const today = todayIST();
  const selectedPeriod = choices.find(([key]) => { const value = datePreset(key, today); return value.from === from && value.to === to; })?.[0] || 'selected';
  const activeModules = useMemo(() => MODULES.filter(module => city.enabledModules.includes(module.id)), [city.enabledModules]);
  const relevantFailedModules = failedModules.filter(isSurveyModule);
  useEffect(() => {
    if (!previewOpen && !siPreviewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPreviewOpen(false); setSiPreviewOpen(false); } };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewOpen, siPreviewOpen]);
  const { rows, surveyors, surveyedWards } = useMemo(() => {
    const wardMap = new Map<string, WardReport>();
    for (const ward of wards.filter(item => item.cityId === city.id)) wardMap.set(ward.id, { ward, counts: { sweeping: EMPTY_COUNTS(), toilets: EMPTY_COUNTS(), litter_bins: EMPTY_COUNTS() }, people: new Map(), assignedPeople: new Map(), hasSurvey: false });
    for (const asset of assets) {
      if (!isSurveyModule(asset.module)) continue;
      const row = wardMap.get(asset.wardId);
      if (row) {
        row.counts[asset.module].total += 1;
        const assigned = asset.supervisors?.length ? asset.supervisors : asset.employees;
        for (const person of assigned || []) if (person?.name?.trim()) row.assignedPeople.set(person.id || person.name.toLocaleLowerCase(), person.name.trim());
      }
    }
    const registered = new Set(assets.map(asset => `${asset.module}:${asset.id}`));
    const people = new Map<string, string>();
    for (const report of reports) {
      if (!isSurveyModule(report.moduleId)) continue;
      const module = report.moduleId;
      const ward = wardMap.get(report.wardId);
      const personName = report.submittedByName?.trim() || 'Name unavailable';
      const personKey = report.submittedByUserId || personName.toLocaleLowerCase();
      people.set(personKey, personName);
      if (!ward) continue;
      ward.hasSurvey = true;
      ward.people.set(personKey, personName);
      if (!report.assetId || !registered.has(`${module}:${report.assetId}`)) ward.counts[module].uncertain = true;
      else ward.counts[module].surveyed.add(report.assetId);
    }
    const values = [...wardMap.values()].filter(row => activeModules.some(({ id }) => row.counts[id].total > 0) || row.hasSurvey).sort((a, b) => geographyOrder(a.ward, b.ward));
    return { rows: values, surveyors: people.size, surveyedWards: values.filter(row => row.hasSurvey).length };
  }, [assets, reports, wards, city.id, activeModules]);
  const reportedRows = rows.filter(row => row.hasSurvey);
  const notReportedRows = rows.filter(row => !row.hasSurvey);

  const periodLabel = from === to ? new Date(`${to}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : `${new Date(`${from}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} - ${new Date(`${to}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`;
  const unassignedAssets = assets.filter(asset => isSurveyModule(asset.module) && !asset.wardId).length;
  const applyPeriod = (key: string) => {
    setPeriodError('');
    if (key === 'selected') return;
    const preset = datePreset(key, today);
    void matrixStore.setDateRange(preset.from, preset.to).catch(error => setPeriodError(error instanceof Error ? error.message : 'Could not change the report period.'));
  };
  const printReport = () => {
    if (!previewOpen) setPreviewOpen(true);
    window.setTimeout(() => printElement(`Survey Report - ${periodLabel}`, formattedRef.current, 'Counts show unique registered assets with at least one submitted survey in the selected dates.'), 80);
  };

  return <>
  <section className="survey-report workspace-panel">
    <header className="workspace-panel-heading survey-report__heading">
      <div><span className="workspace-eyebrow">FIELD SURVEY SUMMARY</span><h2>Survey Report</h2><p>{periodLabel} - Selected page period</p></div>
      <div className="survey-report__tools no-print">
        <label><CalendarDays size={14}/><span className="sr-only">Survey report period</span><select aria-label="Survey report period" value={selectedPeriod} onChange={event => applyPeriod(event.target.value)}>{choices.map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="selected">Custom / selected dates</option></select></label>
        <button type="button" onClick={() => setPreviewOpen(true)}>View report</button>
        <button type="button" onClick={() => setSiPreviewOpen(true)}>SI survey report</button>
        <button type="button" onClick={printReport}><Printer size={14}/>Print report</button>
      </div>
    </header>
    {periodError && <p className="survey-report__error" role="alert">{periodError}</p>}
    <div className="survey-report__summary">
      <article><span><Users size={14}/>People surveyed</span><strong>{number(surveyors)}</strong><small>Unique report submitters in this period</small></article>
      <article><span>Wards with surveys</span><strong>{number(surveyedWards)}</strong><small>Of {number(rows.length)} wards with tracked assets</small></article>
    </div>
    <p className="survey-report__note">Use the period menu or the page date filter to view another range. Surveyed counts are unique assets with at least one submitted report; repeat surveys do not increase the count.</p>
    {!inventoryAvailable && <p className="survey-report__error">Asset inventory is unavailable, so total and pending counts cannot be confirmed.</p>}
    {unassignedAssets > 0 && <p className="survey-report__error">{number(unassignedAssets)} assets have no ward assignment and are not included in ward totals.</p>}
    {relevantFailedModules.length > 0 && <p className="survey-report__error">Some survey modules could not load all reports; their surveyed and pending counts are unavailable.</p>}
    {loading ? <p className="survey-report__empty">Loading survey records for this period…</p> : reportedRows.length === 0 ? <p className="survey-report__empty">No wards have submitted a survey for this period.</p> : <div className="survey-report__wards">
      {reportedRows.map(({ ward, counts, people, assignedPeople, hasSurvey }) => {
        const names = [...(people.size ? people.values() : assignedPeople.values())];
        const wardPeople = names.length ? names.join(', ') : 'Surveyor not assigned';
        return <article className="survey-report__ward" key={ward.id}>
          <h3>Ward {ward.name.replace(/^ward\s*/i, '')} - {wardPeople}{hasSurvey ? '' : ' (No survey submitted)'}</h3>
          <ul>{activeModules.map(module => {
            const count = counts[module.id], unavailable = !inventoryAvailable || relevantFailedModules.includes(module.id) || count.uncertain;
            const total = inventoryAvailable ? number(count.total) : '-';
            const surveyed = unavailable ? '-' : number(count.surveyed.size);
            const pending = unavailable ? '-' : number(Math.max(0, count.total - count.surveyed.size));
            return <React.Fragment key={module.id}><li><b>{module.total}:</b> {total}</li><li><b>{module.done}:</b> {surveyed}</li><li><b>{module.pending}:</b> {pending}</li></React.Fragment>;
          })}</ul>
        </article>;
      })}
    </div>}
    {!loading&&notReportedRows.length>0&&<section className="survey-report__not-surveyed"><h3>No survey submitted</h3><p>{notReportedRows.map(({ward})=>`Ward ${ward.name.replace(/^ward\s*/i,'')}`).join(', ')}</p></section>}
  </section>
  {previewOpen&&<div className="survey-report-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPreviewOpen(false);}}><section className="survey-report-modal" role="dialog" aria-modal="true" aria-labelledby="survey-report-modal-title">
    <header><div><span className="workspace-eyebrow">FIELD SURVEY SUMMARY</span><h2 id="survey-report-modal-title">Survey Report - {periodLabel}</h2></div><button type="button" aria-label="Close survey report" onClick={()=>setPreviewOpen(false)}><X size={18}/></button></header>
    <div className="survey-report-modal__body" ref={formattedRef}>
      {loading?<p className="survey-report__empty">Loading survey records for this period…</p>:reportedRows.length===0?<p className="survey-report__empty">No wards have submitted a survey for this period.</p>:<div className="survey-report__formatted">
        <h3>Survey Report - {periodLabel}</h3>
        {reportedRows.map(({ward,counts,people,assignedPeople,hasSurvey})=>{
          const names=[...(people.size?people.values():assignedPeople.values())];
          const wardPeople=names.length?names.join(', '):'Surveyor not assigned';
          return <article key={ward.id}>
            <h4>Ward {ward.name.replace(/^ward\s*/i,'')} - {wardPeople}{hasSurvey?'':' (No survey submitted)'}</h4>
            <ul>{activeModules.map(module=>{
              const count=counts[module.id],unavailable=!inventoryAvailable||relevantFailedModules.includes(module.id)||count.uncertain;
              const total=inventoryAvailable?number(count.total):'-';
              const surveyed=unavailable?'-':number(count.surveyed.size);
              const pending=unavailable?'-':number(Math.max(0,count.total-count.surveyed.size));
              return <React.Fragment key={module.id}><li>{module.total}: {total}</li><li>{module.done}: {surveyed}</li><li>{module.pending}: {pending}</li></React.Fragment>;
            })}</ul>
          </article>;
        })}
      </div>}
      {!loading&&notReportedRows.length>0&&<section className="survey-report__not-surveyed"><h3>No survey submitted</h3><p>{notReportedRows.map(({ward})=>`Ward ${ward.name.replace(/^ward\s*/i,'')}`).join(', ')}</p></section>}
    </div>
    <footer><button type="button" onClick={()=>setPreviewOpen(false)}>Close</button><button type="button" className="survey-report-modal__print" onClick={()=>printElement(`Survey Report - ${periodLabel}`,formattedRef.current,'Counts show unique registered assets with at least one submitted survey in the selected dates.')}><Printer size={14}/>Print report</button></footer>
  </section></div>}
  <SiSurveyReportModal open={siPreviewOpen} onClose={()=>setSiPreviewOpen(false)} reports={reports} wards={wards} modules={activeModules} loading={loading} periodLabel={periodLabel}/>
  </>;
}

function SiSurveyReportModal({open,onClose,reports,wards,modules,loading,periodLabel}:{open:boolean;onClose:()=>void;reports:OperationalReport[];wards:Ward[];modules:{id:SurveyModule}[];loading:boolean;periodLabel:string}) {
  const reportRef=useRef<HTMLDivElement>(null);
  const data=useMemo(()=>buildSiReviewData(reports,wards,modules),[reports,wards,modules]);
  useEffect(()=>{
    if(!open)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',closeOnEscape);
    return()=>window.removeEventListener('keydown',closeOnEscape);
  },[open,onClose]);
  if(!open)return null;
  return <div className="survey-report-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section className="survey-report-modal survey-report-modal--si" role="dialog" aria-modal="true" aria-labelledby="si-survey-report-title">
    <header><div><span className="workspace-eyebrow">SI REVIEW SUMMARY</span><h2 id="si-survey-report-title">SI Survey Report - {periodLabel}</h2></div><button type="button" aria-label="Close SI survey report" onClick={onClose}><X size={18}/></button></header>
    <div className="survey-report-modal__body" ref={reportRef}>
      {loading?<p className="survey-report__empty">Loading SI review data for this period…</p>:<div className="survey-report__formatted">
        <h3>SI Survey Report - {periodLabel}</h3>
        <div className="survey-report__si-summary"><article><span>Total reports</span><strong>{number(data.total)}</strong></article><article><span>Accepted</span><strong>{number(data.accepted)}</strong></article><article><span>Rejected</span><strong>{number(data.rejected)}</strong></article><article><span>Pending SI review</span><strong>{number(data.pending)}</strong></article></div>
        <h3>SI-wise decisions by ward</h3>
        {data.groups.length?<div className="survey-report__si-table-wrap"><table className="survey-report__si-table"><thead><tr><th>SI</th><th>Ward</th><th>Accepted</th><th>Rejected</th><th>Other reviewed</th><th>Pending SI review</th></tr></thead><tbody>{data.groups.map(group=><tr key={group.key}><td>{group.siName}</td><td>{group.wardName}</td><td>{number(group.accepted)}</td><td>{number(group.rejected)}</td><td>{number(group.other)}</td><td>{number(group.pending)}</td></tr>)}</tbody></table></div>:<p className="survey-report__empty">No SI review or pending survey reports in this period.</p>}
        <h3>Report-wise details</h3>
        {data.details.length?<div className="survey-report__si-table-wrap"><table className="survey-report__si-table"><thead><tr><th>Report / asset</th><th>Ward</th><th>Submitted by</th><th>Submitted on</th><th>SI</th><th>Decision</th><th>Reviewed on</th><th>Remarks</th></tr></thead><tbody>{data.details.map(item=><tr key={item.report.id}><td><strong>{item.report.reportNumber}</strong><small>{item.report.assetName} · {item.report.moduleId.replaceAll('_',' ')}</small></td><td>{item.wardName}</td><td>{item.report.submittedByName||'Name unavailable'}</td><td>{dateTime(item.report.submittedAt)}</td><td>{item.siName}</td><td>{decisionText(item.decision)}</td><td>{dateTime(item.report.reviewedAt)}</td><td>{item.remarks||'—'}</td></tr>)}</tbody></table></div>:<p className="survey-report__empty">No survey reports are available for this period.</p>}
      </div>}
    </div>
    <footer><button type="button" onClick={onClose}>Close</button><button type="button" className="survey-report-modal__print" onClick={()=>printElement(`SI Survey Report - ${periodLabel}`,reportRef.current,'SI acceptance, rejection, other decisions and pending reviews for the selected dates.')}><Printer size={14}/>Print report</button></footer>
  </section></div>;
}

function buildSiReviewData(reports:OperationalReport[],wards:Ward[],modules:{id:SurveyModule}[]) {
  const included=new Set(modules.map(module=>module.id));
  const groups=new Map<string,SiGroup>(),details:SiDetail[]=[];
  let accepted=0,rejected=0,pending=0;
  for(const report of reports){
    if(!included.has(report.moduleId as SurveyModule))continue;
    const qcRecord=report.decisions?.find(decision=>['QC','SI'].includes(String(decision.role).toUpperCase()));
    const rawDecision=String(qcRecord?.decision||report.qcDecision||'').trim().toUpperCase().replace(/[\s-]+/g,'_');
    const status=String(report.status||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
    const decision:SiDecision=/^(APPROVED|APPROVE|ACCEPTED|ACCEPT)$/.test(rawDecision)?'accepted':/^(REJECTED|REJECT)$/.test(rawDecision)?'rejected':status==='approved'?'accepted':status==='rejected'?'rejected':status==='pending_review'||status==='unclassified'?'pending':'other';
    const reviewer=qcRecord?.name||report.reviewerName||'SI name unavailable';
    const siName=decision==='pending'?'Pending SI review':reviewer;
    const wardName=wards.find(ward=>ward.id===report.wardId)?.name||'Ward not recorded';
    const key=`${decision==='pending'?'PENDING':report.reviewerId||reviewer}:${report.wardId||wardName}`;
    const group=groups.get(key)||{key,wardName,siName,accepted:0,rejected:0,other:0,pending:0};
    group[decision]+=1;groups.set(key,group);
    if(decision==='accepted')accepted+=1;else if(decision==='rejected')rejected+=1;else if(decision==='pending')pending+=1;
    const remarks=qcRecord?.remarks||report.escalationReason||'';
    details.push({report,wardName,siName,decision,remarks});
  }
  const sortedGroups=[...groups.values()].sort((a,b)=>a.siName.localeCompare(b.siName)||a.wardName.localeCompare(b.wardName));
  details.sort((a,b)=>a.wardName.localeCompare(b.wardName)||a.siName.localeCompare(b.siName)||b.report.submittedAt.localeCompare(a.report.submittedAt));
  return {total:details.length,accepted,rejected,pending,groups:sortedGroups,details};
}

function decisionText(decision:SiDecision){return decision==='accepted'?'Accepted':decision==='rejected'?'Rejected':decision==='pending'?'Pending SI review':'Other / action required';}
function dateTime(value?:string){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}):'—';}
