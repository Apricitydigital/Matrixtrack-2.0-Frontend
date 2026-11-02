import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {RankingGatewayApi,type RankingDashboard,type RankingPage,type RankingResponse,type RankingSummary,type RankingZone} from '../../services/rankingGateway';

type Tab='dashboard'|'rankings'|'scores'|'assessments'|'selfAssessments'|'reviews'|'areas'|'participants';
type Column={header:string;value:(row:Record<string,any>)=>string};

const PAGE_SIZE=25;

const TABS:{key:Tab;label:string}[]=[
  {key:'dashboard',label:'Dashboard'},
  {key:'rankings',label:'Rankings'},
  {key:'scores',label:'Verified Scores'},
  {key:'assessments',label:'Assessments'},
  {key:'selfAssessments',label:'Self-Assessments'},
  {key:'reviews',label:'QC Review Records'},
  {key:'areas',label:'Zones & Wards'},
  {key:'participants',label:'Participants'},
];

const text=(value:unknown)=>value===undefined||value===null||value===''?'-':String(value);
const words=(value:unknown)=>text(value).replace(/_/g,' ');

const PAGED_TABS:Partial<Record<Tab,{load:(category:string|undefined,page:number,size:number)=>Promise<RankingPage>;columns:Column[]}>>={
  assessments:{load:RankingGatewayApi.assessments,columns:[
    {header:'Name',value:r=>text(r.name)},{header:'Category',value:r=>text(r.category)},{header:'Ward',value:r=>text(r.ward)},
    {header:'Stage',value:r=>words(r.stage)},{header:'Approval',value:r=>words(r.approvalStatus)},{header:'QC done',value:r=>r.qcReviewComplete?'Yes':'No'},
  ]},
  scores:{load:RankingGatewayApi.scores,columns:[
    {header:'Rank',value:r=>r.rankInCategory?`#${r.rankInCategory}`:'-'},{header:'Name',value:r=>text(r.name)},{header:'Category',value:r=>text(r.category)},
    {header:'Avg score',value:r=>text(r.combinedAverage?.average)},{header:'Avg %',value:r=>text(r.combinedAverage?.averagePercentage)},{header:'Self-assessment',value:r=>text(r.selfAssessment?.verifiedScore)},
  ]},
  selfAssessments:{load:RankingGatewayApi.selfAssessments,columns:[
    {header:'Name',value:r=>text(r.name)},{header:'Category',value:r=>text(r.category)},{header:'Status',value:r=>text(r.status)},
    {header:'QC',value:r=>words(r.qcStatus)},{header:'Verified score',value:r=>text(r.verifiedScore)},{header:'Submitted',value:r=>r.submittedAt?String(r.submittedAt).slice(0,10):'-'},
  ]},
  reviews:{load:RankingGatewayApi.reviewRecords,columns:[
    {header:'Name',value:r=>text(r.name)},{header:'Category',value:r=>text(r.category)},{header:'Survey',value:r=>text(r.fieldSurveyNo)},
    {header:'Approval',value:r=>words(r.approvalStatus)},{header:'QC',value:r=>words(r.qcStatus)},{header:'Verified',value:r=>text(r.verifiedScore)},{header:'Assessor',value:r=>text(r.assessorScore)},
  ]},
  participants:{load:RankingGatewayApi.participants as any,columns:[
    {header:'Name',value:r=>text(r.name)},{header:'Category',value:r=>words(r.category)},{header:'Ward',value:r=>text(r.ward)},
    {header:'Registered',value:r=>r.registeredAt?String(r.registeredAt).slice(0,10):'-'},
  ]},
};

function Stat({label,value,hint}:{label:string;value:string|number;hint?:string}){
  return <div className="workspace-panel p-4"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>{hint&&<p className="mt-0.5 text-xs text-slate-400">{hint}</p>}</div>;
}

/** Ward Ranking data served by the external Swachhta Parv API through the MatrixTrack gateway. */
export function RankingApiPage(){
  const [tab,setTab]=useState<Tab>('dashboard');
  const [summary,setSummary]=useState<RankingSummary|null>(null);
  const [summaryError,setSummaryError]=useState('');
  const [category,setCategory]=useState('');
  const [dashboard,setDashboard]=useState<RankingDashboard|null>(null);
  const [rankings,setRankings]=useState<RankingResponse|null>(null);
  const [zones,setZones]=useState<RankingZone[]|null>(null);
  const [paged,setPaged]=useState<RankingPage|null>(null);
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    RankingGatewayApi.summary()
      .then(res=>{setSummary(res);setCategory(current=>current||res.categories[0]?.key||'');})
      .catch(err=>setSummaryError(err?.message||'Could not load ranking summary'));
  },[]);

  const loadTab=useCallback(async()=>{
    const needsCategory=tab!=='areas'&&tab!=='dashboard';
    if(needsCategory&&!category)return;
    setLoading(true);setError('');
    try{
      const pagedTab=PAGED_TABS[tab];
      if(tab==='dashboard')setDashboard(await RankingGatewayApi.dashboard());
      else if(tab==='areas')setZones((await RankingGatewayApi.zones()).data);
      else if(tab==='rankings')setRankings(await RankingGatewayApi.rankings(category,100));
      else if(pagedTab)setPaged(await pagedTab.load(category,page,PAGE_SIZE));
    }catch(err:any){setError(err?.message||'Could not load data');}
    finally{setLoading(false);}
  },[tab,category,page]);

  useEffect(()=>{void loadTab();},[loadTab]);

  const rankingGroup=useMemo(()=>rankings?.categories.find(c=>c.category===category),[rankings,category]);
  const pagedConfig=PAGED_TABS[tab];

  return <section className="space-y-5">
    <div className="workspace-page-heading">
      <span className="workspace-eyebrow">SWACHHTA PARV</span>
      <h1>Ward Ranking</h1>
      <p>Ranking data for {summary?.organization?.name||'your city'}, ranked by QC-verified score.</p>
    </div>
    {summaryError&&<p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl text-sm">{summaryError}</p>}
    {summary&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Approved participants" value={summary.participants.approved} hint={`${summary.participants.registered} registered`}/>
      <Stat label="Wards" value={summary.wards}/>
      <Stat label="Field assessments" value={summary.surveys.fieldAssessmentsCompleted}/>
      <Stat label="Self assessments" value={summary.surveys.selfAssessmentsCompleted}/>
    </div>}

    <div className="workspace-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-wrap gap-1">
          {TABS.map(item=><button key={item.key} type="button" onClick={()=>{setTab(item.key);setPage(1);setPaged(null);}} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab===item.key?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}
        </div>
        {tab!=='areas'&&tab!=='dashboard'&&summary&&<select aria-label="Category" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);setPaged(null);}}>
          {summary.categories.map(c=><option key={c.key} value={c.key}>{c.label} ({c.participants})</option>)}
        </select>}
      </div>

      <div className="p-4">
        {error&&<p role="alert" className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
        {loading&&<p role="status" className="text-sm text-slate-500">Loading...</p>}

        {!loading&&tab==='dashboard'&&dashboard&&<div className="space-y-4">
          <p className="text-xs text-slate-400">{dashboard.population}</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(dashboard.stages).map(([key,val])=><Stat key={key} label={words(key)} value={typeof val==='number'?val:val.count} hint={typeof val==='number'?undefined:`${val.percent}%`}/>)}
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Category</th><th>Total</th><th>Done</th><th>QC verified</th><th>QC pending</th><th>Completion</th></tr></thead>
            <tbody>{dashboard.categories.map(c=><tr key={c.category}><td>{c.category}</td><td>{c.total}</td><td>{c.done}</td><td>{c.approvedQcVerified}</td><td>{c.approvedQcPending}</td><td>{c.completionPercent}%</td></tr>)}</tbody></table></div>
        </div>}

        {!loading&&tab==='rankings'&&(!rankingGroup||rankingGroup.data.length===0
          ?<p className="text-sm text-slate-500">No QC-verified scores in this category yet.</p>
          :<>
            <p className="mb-2 text-xs text-slate-400">Showing top {rankingGroup.data.length} of {rankingGroup.participantsRanked} ranked · {rankings?.basis}</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Rank</th><th>Name</th><th>Ward</th><th>Score</th><th>%</th></tr></thead>
              <tbody>{rankingGroup.data.map(r=><tr key={r.participantId}><td><strong>#{r.rank}</strong></td><td>{text(r.name)}</td><td>{text(r.ward)}</td><td>{r.score} / {r.maxScore}</td><td>{r.percentage}%</td></tr>)}</tbody></table></div>
          </>)}

        {!loading&&tab==='areas'&&(!zones||zones.length===0
          ?<p className="text-sm text-slate-500">No zones found.</p>
          :<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{zones.map(z=><div key={z.id} className="rounded-xl border border-slate-100 p-3"><p className="font-bold text-slate-900">{z.name}</p><p className="mt-1 text-sm text-slate-500">{z.wards.length?z.wards.map(w=>w.name).join(', '):'No wards'}</p></div>)}</div>)}

        {!loading&&pagedConfig&&(!paged||paged.data.length===0
          ?<p className="text-sm text-slate-500">No records.</p>
          :<>
            {paged.basis&&<p className="mb-2 text-xs text-slate-400">{paged.basis}</p>}
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{pagedConfig.columns.map(c=><th key={c.header}>{c.header}</th>)}</tr></thead>
              <tbody>{paged.data.map((row,index)=><tr key={row.assessmentId||row.selfAssessmentId||row.participantId||row.id||index}>{pagedConfig.columns.map(c=><td key={c.header}>{c.value(row)}</td>)}</tr>)}</tbody></table></div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>Page {paged.page} of {paged.totalPages} · {paged.total} total</span>
              <div className="flex gap-2">
                <button className="workspace-secondary-button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button>
                <button className="workspace-secondary-button" disabled={page>=paged.totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
              </div>
            </div>
          </>)}
      </div>
    </div>
  </section>;
}
