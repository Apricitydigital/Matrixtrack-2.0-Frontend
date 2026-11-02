export const naturalCompare=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});

const beatFields:Record<string,[string,string]>={
 totalBeats:['Registered beats','Current beat inventory; independent of the selected number of days.'],
 beatsDue:['Planned beat visits','Registered beats × inclusive selected days. This is the total requirement, not the remaining work.'],
 beatsChecked:['Submitted beat visits','One submitted report per beat per operational day. Drafts are excluded.'],
 beatsNotChecked:['Visits awaiting submission','Planned visits minus submitted visits. Includes unfinished drafts.'],
 totalPointsExpected:['Planned point captures','Configured points across registered beats × selected days.'],
 pointsCaptured:['Point captures saved','Captured beat points, including unfinished Draft reports. Different days count separately.'],
 beatsInProgress:['Draft visits started','Draft beat reports with at least one point captured. These are already included in visits awaiting submission.'],
 completeBeatCoverage:['Visits with all points','Submitted beat visits capturing every configured point. Three points may permit submission without completing all five.'],
};

export function rankingEvidence(key:string,metrics:Record<string,unknown>) {
 const entries=Object.entries(metrics||{}).filter(([,v])=>typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v));
 if(key!=='beat')return {primary:entries.slice(0,8).map(([id,value])=>({id,value,label:'',help:''})),additional:entries.slice(8)};
 return {primary:Object.entries(beatFields).filter(([id])=>metrics[id]!==undefined).map(([id,[label,help]])=>({id,label,help,value:metrics[id]})),additional:entries.filter(([id])=>!beatFields[id])};
}
