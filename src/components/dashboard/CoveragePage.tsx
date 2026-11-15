import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import type { OperationalModuleId } from '../../types';
import { CoverageDetail, type Scope, type OpenReports } from './panelBodies';
import { MODULE_LABELS } from '../../services/presentation';
type Named={id:string;name:string;zoneId?:string};
export function CoveragePage({data,loading,modules,zones,wards,scope={},onBack,onOpen}:{data:InspectionCoverage;loading:boolean;modules:OperationalModuleId[];zones:Named[];wards:Named[];scope?:Scope;onBack:()=>void;onOpen:OpenReports}) {
  useEffect(()=>{document.querySelector('main')?.scrollTo({top:0,behavior:'instant'});},[]);
  return <div className="commissioner-home" data-coverage-page><section className="home-section">
    <div className="home-section-heading"><div><span>ASSET COVERAGE</span><h1>{scope.module?`${MODULE_LABELS[scope.module as OperationalModuleId]} coverage`:'Inspection coverage'}</h1><p>{data.from} to {data.to} | Selected zones and wards</p></div><button type="button" className="coverage-details-button" onClick={onBack}><ArrowLeft size={15}/>Back to dashboard</button></div>
    {loading?<p role="status">Loading coverage...</p>:<div className="dp-body"><CoverageDetail data={data} modules={modules} zones={zones} wards={wards} scope={scope} onOpen={onOpen}/></div>}
    {!loading&&data.errors.length>0&&<p className="coverage-data-note" role="status">Some coverage data is N/A. {data.errors.join(' ')}</p>}
  </section></div>;
}
