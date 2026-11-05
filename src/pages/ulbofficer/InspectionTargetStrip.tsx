import React,{useMemo} from 'react';
import type {City,Zone} from '../../types';
import type {InspectionCoverage} from '../../services/inspectionCoverage';
import {applyPerformanceTargets,ulbInspectionSummary,useCityPulse} from '../../services/commissioner';
import {targetDelivery,targetReadState,reportTargetDelivery} from '../../services/targetDelivery';
import {ulbScopeData} from '../../services/ulbDashboard';
import {InspectionTargetProgress} from '../../components/analytics/InspectionTargetProgress';

interface Props {city:City;zones:Zone[];coverage:InspectionCoverage;loading:boolean;from:string;to:string;zoneIds:string[];wardIds:string[];revision:number;onInspect:()=>void}

/**
 * Inspection target for the ULB Inspection Performance page: target, reports received and reports still needed,
 * calculated exactly like the Operations Dashboard so both pages show the same numbers.
 */
export function InspectionTargetStrip({city,zones,coverage,loading,from,to,zoneIds,wardIds,revision,onInspect}:Props){
  const pulse=useCityPulse(city.id,from,to,[],'',revision,['official','performance']);
  const zoneKey=zoneIds.join(','),wardKey=wardIds.join(',');
  const data=useMemo(()=>({...ulbScopeData(coverage,{zoneIds,wardIds})}),[coverage,zoneKey,wardKey]);
  const official=useMemo(()=>{const cityZones=zones.filter(z=>z.cityId===city.id&&(!zoneIds.length||zoneIds.includes(z.id)));const summary=ulbInspectionSummary(coverage,cityZones,wardIds);return summary&&pulse.performance?.SUPERVISOR?applyPerformanceTargets(summary,pulse.performance.SUPERVISOR,wardIds):summary;},[coverage,pulse.performance,zones,zoneKey,wardKey]);
  const source=targetReadState(targetDelivery(official?.totals,data.completedCounts),Boolean(official&&pulse.performance?.SUPERVISOR));
  const mismatch=source.completed!=null&&data.completedCounts.inspections!=null&&source.completed>data.completedCounts.inspections;
  const delivery=mismatch?{...source,available:false,completed:null,percent:null,remaining:null,stateLabel:'Target scope needs verification'}:source;
  return <InspectionTargetProgress from={from} to={to} delivery={delivery} received={data.completedCounts.inspections} loading={loading||pulse.pending>0&&!official} onInspect={onInspect}/>;
}
