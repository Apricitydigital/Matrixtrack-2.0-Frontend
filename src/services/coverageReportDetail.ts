import type {City} from '../types';
import {loadInspectionCoverage,type InspectionCoverage,type InspectionVisit} from './inspectionCoverage';
import {mergeBeatReport} from './ulbReportRegister';

/** Hydrate only the clicked report's module/day; never open a compact row as full evidence. */
export async function coverageReportDetail(city:Pick<City,'id'>,coverage:InspectionCoverage,visit:InspectionVisit,signal:AbortSignal) {
  if(!coverage.compact)return visit.raw;
  const at=Date.parse(visit.submittedAt||'');
  if(!Number.isFinite(at))throw Error('This report has no valid submission date.');
  const date=new Date(at+330*60000).toISOString().slice(0,10);
  const details=await loadInspectionCoverage({...city,enabledModules:[visit.module]},date,date,signal,false);
  if(details.failedModules.length)throw Error('Unable to load this report’s evidence. Please try again.');
  if(visit.module==='sweeping' && (visit.sourceReportIds?.length||0)>1){
    const sources=visit.sourceReportIds!.map(id=>details.visits.find(row=>row.id===id));
    if(sources.some(row=>!row?.raw||row.raw.cityId&&row.raw.cityId!==city.id||row.assetId!==visit.assetId))throw Error('Some beat report evidence is unavailable in the selected city.');
    return mergeBeatReport(sources as InspectionVisit[]).raw;
  }
  const exact=details.visits.find(row=>row.id===visit.id);
  if(!exact?.raw||exact.raw.cityId&&exact.raw.cityId!==city.id)throw Error('This report is unavailable in the selected city.');
  return exact.raw;
}
