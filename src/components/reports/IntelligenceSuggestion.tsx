import React, {useState} from 'react';
import {intelligenceSuggestion} from '../../services/intelligenceSuggestion';
import {awaitingSi, intelligenceCounts, intelligenceFilter, INTELLIGENCE_LABELS} from '../../services/intelligenceMetrics';
export function IntelligenceSuggestion({report,compact=false,language='en'}:{report:any;compact?:boolean;language?:string}) {
  const ai=intelligenceSuggestion(report);
  const reasons=language==='hi'&&ai.reasonsHi.length?ai.reasonsHi:ai.reasons;
  return <aside className="intelligence-suggestion" data-outcome={ai.outcome}>
    <strong>{INTELLIGENCE_LABELS[ai.outcome]}</strong>{ai.confidencePercent!=null&&<span> · {ai.confidencePercent}% AI confidence</span>}
    {compact?<small>{reasons[0]}</small>:<><ul>{reasons.map((r,i)=><li key={i}>{r}</li>)}</ul><small>Visual evidence suggestion. The SI records the official decision.</small></>}
  </aside>;
}
export function IntelligenceSummary({reports,loading=false,unavailable=false,onSelect}:{reports:any[];loading?:boolean;unavailable?:boolean;onSelect?:(filter:string)=>void}) {
  const [selected,setSelected]=useState('');
  const counts=intelligenceCounts(reports);
  return <section className="intelligence-summary" aria-label="Intelligence cleanliness suggestions">
    <h3>Intelligence suggestions · awaiting SI review</h3><p>AI assesses visible cleanliness. These reports remain pending until an SI records a decision. Suggestions are separate from official Cleaned / Not cleaned counts.</p>
    <div className="intelligence-counts">{Object.entries(counts).map(([outcome,count])=><button key={outcome} data-outcome={outcome} disabled={loading||unavailable} onClick={()=>onSelect?onSelect(intelligenceFilter(outcome)):setSelected(selected===outcome?'':outcome)}><span>{INTELLIGENCE_LABELS[outcome]}</span><strong>{loading?'Updating…':unavailable?'Unavailable':count.toLocaleString()}</strong></button>)}</div>
    {!onSelect&&selected&&!loading&&!unavailable&&<div><h4>{INTELLIGENCE_LABELS[selected]} · supporting reports</h4>{reports.filter(r=>awaitingSi(r)&&intelligenceSuggestion(r).outcome===selected).map((r,i)=><article key={r.id||i}><b>{r.locationName||r.assetName||r.id}</b><IntelligenceSuggestion report={r}/></article>)}</div>}
    <small>Select a count to inspect the supporting reasons and confidence in its reports. Confidence is the model's estimate.</small>
  </section>;
}
