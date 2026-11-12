import type {City} from '../types';
import {loadInspectionCoverage,type InspectionCoverage,type InspectionVisit} from './inspectionCoverage';

/** Hydrate only the clicked report's module/day; never open a compact row as full evidence. */
export async function coverageReportDetail(city:Pick<City,'id'>,coverage:InspectionCoverage,visit:InspectionVisit,signal:AbortSignal) {
  if(!coverage.compact)return visit.raw;
  const at=Date.parse(visit.submittedAt||'');
  if(!Number.isFinite(at))throw Error('This report has no valid submission date.');
  const date=new Date(at+330*60000).toISOString().slice(0,10);
  const details=await loadInspectionCoverage({...city,enabledModules:[visit.module]},date,date,signal,false);
  if(details.failedModules.length)throw Error('Unable to load this report’s evidence. Please try again.');
  const exact=details.visits.find(row=>row.id===visit.id);
  if(!exact?.raw||exact.raw.cityId&&exact.raw.cityId!==city.id)throw Error('This report is unavailable in the selected city.');
  return exact.raw;
}
