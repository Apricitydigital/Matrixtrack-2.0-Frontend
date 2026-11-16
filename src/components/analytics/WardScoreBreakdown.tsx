import React,{useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {WorkforceEvidenceDrawer,WORKFORCE_FACTORS} from './WorkforceEvidenceDrawer';
import {amount,humanLabel} from '../../services/insights';
import {rankingEvidence,rankingFormula,scoreCalculation} from '../../services/wardRankingEvidence';
import {CardInfo} from '../common/CardInfo';
import {WardActionEvidence} from './WardActionEvidence';

export function WardScoreBreakdown({factor,wardId}:{factor:any;wardId?:string}) {
 const [selectedFactor,setSelectedFactor]=useState('');
 const cell=(key:string,content:React.ReactNode)=>wardId&&factor.key==='workforce'&&WORKFORCE_FACTORS[key]?<button className="wf-factor-link" onClick={()=>setSelectedFactor(key)} aria-label={`View ${WORKFORCE_FACTORS[key]} details`}>{content}<ArrowUpRight size={12}/></button>:content;
 const {parts,earned,available}=scoreCalculation(factor);
 const directWorkforce=factor.key==='workforce'&&available>0&&Math.abs(available-factor.maxScore)<.001;
 const evidence=rankingEvidence(factor.key,factor.metrics||{});
 const primary=evidence.primary.slice(0,4);
 const extra=[...evidence.primary.slice(4).map(p=>[p.id,p.value] as [string,unknown]),...evidence.additional];
 return <div className="factor-evidence compact-score-evidence">
  <div><header className="compact-score-heading"><h3>{factor.label}</h3><strong>{factor.applicable===false?'N/A':`${amount(factor.score,2)} / ${amount(factor.maxScore,2)}`}</strong></header>
   {factor.applicable===false?<p>No applicable work.</p>:<>
    {factor.metrics?.cleanlinessPolicy==='INSPECTION_20_CLEANLINESS_60_QUALITY_20'&&<p className="compact-score-note">20% inspections · 60% cleanliness · 20% quality/completion. SI decisions override AI. Unreviewed reports without a usable AI result receive no clean credit.</p>}
    {parts.length>0&&<table className="compact-score-table"><thead><tr><th>Factor</th><th>Actual / Required</th><th>Marks</th></tr></thead><tbody>{parts.map(p=><tr key={p.key}><td>{cell(p.key,humanLabel(p.key))}</td><td>{cell(p.key,rankingFormula(factor.key,p.key,factor.metrics||{}).split(': ').pop()||`${amount(p.percentage,2)}%`)}</td><td>{cell(p.key,`${amount(p.score,2)} / ${amount(p.maxScore,2)}`)}</td></tr>)}</tbody></table>}
    <div className="compact-score-total"><span>Score calculation</span><strong>{directWorkforce?parts.map(p=>amount(p.score,2)).join(' + '):available>0?`${amount(earned,4)} / ${amount(available,4)} \u00d7 ${amount(factor.maxScore,2)}`:`${amount(factor.percentage,2)}% \u00d7 ${amount(factor.maxScore,2)}`} = {amount(factor.score,2)}</strong><CardInfo title="Score calculation">Applicable factors only. Final marks use the server calculation; displayed values may be rounded.</CardInfo></div>
   </>}
  </div>
  {factor.applicable!==false&&<div><div className="factor-metrics">{primary.map(({id,value,label,help})=><div key={id}><span>{label||humanLabel(id)}{help&&<CardInfo title={label}>{help}</CardInfo>}</span><strong>{typeof value==='boolean'?(value?'Yes':'No'):amount(value,2)}</strong></div>)}</div>
   {extra.length>0&&<details className="ranking-extra-metrics"><summary>More details</summary>{extra.map(([key,value])=><p key={key}>{humanLabel(key)}<b>{typeof value==='boolean'?(value?'Yes':'No'):amount(value,2)}</b></p>)}</details>}
   {factor.metrics?.cleanlinessPolicy==='INSPECTION_20_CLEANLINESS_60_QUALITY_20'&&<p className="compact-score-note">Clean credit: {amount(factor.metrics.cleanlinessClean,0)} / {amount(factor.metrics.cleanlinessSubmitted,0)} submitted reports. {amount(factor.metrics.cleanlinessUnassessed,0)} without a result; {amount(factor.metrics.cleanlinessUnclear,0)} unclear AI results included in AI not clean. Drafts excluded.</p>}
   {factor.key==='workforce'&&<small className="compact-score-note">Counts include each attendance date.</small>}
   {factor.key==='actionOfficer'&&<details className="ranking-extra-metrics"><summary>Action details</summary><WardActionEvidence factor={factor}/></details>}
  </div>}
 {selectedFactor&&wardId&&<WorkforceEvidenceDrawer wardId={wardId} factor={selectedFactor} onClose={()=>setSelectedFactor('')}/>}
 </div>;
}
