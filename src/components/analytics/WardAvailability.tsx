import React from 'react';
import {wardAssessmentReason,isAdministrativeWard} from '../../services/wardAvailability';
export function WardAvailability({rows}:{rows:any[]}) {
 const unassessed=rows.filter(isAdministrativeWard).filter(r=>r.rankable===false);
 if(!unassessed.length)return null;
 return <details className="ward-availability"><summary>Why {unassessed.length} wards are not assessed</summary><p>Not assessed is a data qualification state, not a zero score or proof that field work did not happen.</p><table><thead><tr><th>Ward</th><th>Zone</th><th>What is known</th></tr></thead><tbody>{unassessed.map(r=><tr key={r.wardId}><td>{r.wardName}</td><td>{r.zoneName||'Not mapped'}</td><td>{wardAssessmentReason(r)}</td></tr>)}</tbody></table></details>;
}
