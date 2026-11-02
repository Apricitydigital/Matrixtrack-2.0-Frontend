import type {
  ProcessingUnitTotals,
  PlantQuantityKey,
  ProcessingPlantDashboardData,
  ProcessingPlantPerformanceRow,
  ProcessingPlantTrendPoint,
} from '../types/processingPlant';

const n = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const numericField=(row:any,keys:string[]):number|null=>{
  for(const key of keys){const value=row?.[key];if(typeof value!=='boolean'&&value!=null&&String(value).trim()!==''&&Number.isFinite(Number(value)))return Number(value);}
  return null;
};
const supplied=(row:any,keys:string[])=>numericField(row,keys)!=null;

const pick = <T = number>(
  obj: any,
  keys: string[],
  fallback: T = 0 as T
): T => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key] as T;
    }
  }
  return fallback;
};

export function normalizeDashboardPayload(payload: any): ProcessingPlantDashboardData {
  const source = payload?.data ?? payload ?? {};
  const summary = source.summary ?? source.kpis ?? source.overview ?? source;

  const totalReceived = n(pick(summary, ['totalReceived', 'received', 'receivedQuantity', 'totalInput']));
  const totalProcessed = n(pick(summary, ['totalProcessed', 'processed', 'processedQuantity', 'totalProcessedQuantity']));
  const totalRecovered = n(pick(summary, ['totalRecovered', 'recovered', 'recoveredQuantity', 'materialRecovered']));
  const totalReject = n(pick(summary, ['totalReject', 'reject', 'rejectQuantity', 'residual', 'residualQuantity']));
  const totalProcessLoss = n(pick(summary, ['totalProcessLoss', 'processLoss']));

  const efficiencyFromApi = n(pick(summary, ['efficiency', 'processingEfficiency', 'processingRate']));
  // the API value is authoritative (0 is a real value); only guess when it is absent
  const efficiency = summary?.efficiency !== undefined || summary?.processingEfficiency !== undefined
    ? efficiencyFromApi
    : (totalReceived > 0 ? (totalRecovered / totalReceived) * 100 : 0);

  const trendRaw = source.trend ?? source.dailyTrend ?? source.series ?? source.timeline ?? [];
  const trend: ProcessingPlantTrendPoint[] = Array.isArray(trendRaw)
    ? trendRaw.map((row: any) => ({
        date: String(pick(row, ['date', 'day', 'label'], '')),
        received: (supplied(row,['received', 'totalReceived', 'input'])?(numericField(row,['received', 'totalReceived', 'input'])??0):null),
        processed: (supplied(row,['processed', 'totalProcessed', 'output'])?(numericField(row,['processed', 'totalProcessed', 'output'])??0):null),
        recovered: (supplied(row,['recovered', 'totalRecovered'])?(numericField(row,['recovered', 'totalRecovered'])??0):null),
        reject: (supplied(row,['reject', 'totalReject', 'residual'])?(numericField(row,['reject', 'totalReject', 'residual'])??0):null),
        efficiency: (supplied(row,['efficiency', 'processingEfficiency'])?(numericField(row,['efficiency', 'processingEfficiency'])??0):null),
        units: row?.units && typeof row.units === 'object'
          ? Object.fromEntries(
              Object.entries(row.units as Record<string, any>).map(([unit, q]) => [
                unit,
                {
                  received: (supplied(q,['received'])?n(q?.received):null),
                  processed: (supplied(q,['processed'])?n(q?.processed):null),
                  recovered: (supplied(q,['recovered'])?n(q?.recovered):null),
                  reject: (supplied(q,['reject'])?n(q?.reject):null),
                  processLoss: (supplied(q,['processLoss'])?n(q?.processLoss):null),
                },
              ]),
            )
          : undefined,
      }))
    : [];

  const plantRaw = source.plantPerformance ?? source.plants ?? source.plantWise ?? source.byPlant ?? [];
  const plantPerformance: ProcessingPlantPerformanceRow[] = Array.isArray(plantRaw)
    ? plantRaw.map((row: any) => {
        const received = (numericField(row,['received', 'totalReceived', 'input'])??0);
        const processed = (numericField(row,['processed', 'totalProcessed', 'output'])??0);
        const capacity = pick(row, ['capacity', 'installedCapacity'], null);
        const receivedAvailable=row.receivedAvailable!==false&&supplied(row,['received','totalReceived','input']);
        const recoveredAvailable=row.recoveredAvailable!==false&&supplied(row,['recovered','totalRecovered']);
        const rejectAvailable=row.rejectAvailable!==false&&supplied(row,['reject','totalReject','residual']);
        const processLossAvailable=row.processLossAvailable!==false&&supplied(row,['processLoss']);
        const recovered=(numericField(row,['recovered','totalRecovered'])??0);
        const validDays=(v:unknown)=>typeof v!=='boolean'&&v!=null&&String(v).trim()!==''&&Number.isInteger(Number(v))&&Number(v)>=0?Number(v):undefined;
        const daysInRange=validDays(row.daysInRange),reported=validDays(row.daysReported);
        const daysReported=reported!=null&&(daysInRange==null||reported<=daysInRange)?reported:undefined;
        return {
          plantId: String(pick(row, ['plantId', 'id'], '')),
          plantName: String(pick(row, ['plantName', 'name'], 'Unnamed Plant')),
          plantType: String(pick(row, ['plantType', 'type'], '')),
          received,
          processed,
          recovered,
          receivedAvailable, recoveredAvailable, rejectAvailable,
          materialComparable:row.efficiencyAvailable!==false,
          processedAvailable:row.processedAvailable!==false&&supplied(row,['processed','totalProcessed','output']),
          reject: (numericField(row,['reject', 'totalReject', 'residual'])??0),
          processLoss: (numericField(row,['processLoss'])??0),
          processLossAvailable,
          balanceAvailable:receivedAvailable&&recoveredAvailable&&rejectAvailable&&processLossAvailable&&row.efficiencyAvailable!==false,
          efficiency:receivedAvailable&&recoveredAvailable&&received>0?recovered/received*100:0,
          efficiencyAvailable:row.efficiencyAvailable!==false&&receivedAvailable&&recoveredAvailable&&received>0,
          reportingGranularity: row?.reportingGranularity === 'MONTHLY' ? 'MONTHLY' : 'DAILY',
          monthly: Array.isArray(row?.monthly)
            ? row.monthly.map((m: any) => ({
                month: String(m?.month ?? ''),
                days: n(m?.days),
                received: n(m?.received),
                processed: n(m?.processed),
                recovered: n(m?.recovered),
                reject: n(m?.reject),
                processLoss: n(m?.processLoss),
              }))
            : undefined,
          capacity: numericField(row,['capacity','installedCapacity']),
          utilization: numericField(row,['utilization','capacityUtilization']),
          reportingStatus: String(pick(row, ['reportingStatus', 'status'], '')),
          lastSubmissionAt: pick(row, ['lastSubmissionAt', 'lastReportedAt', 'updatedAt'], null) as string | null,
          unit: row?.unit ? String(row.unit).trim().toUpperCase() : undefined,
          daysReported,
          daysInRange,
        };
      })
    : [];

  const materialRaw = source.materialRecovery ?? source.recoveryMix ?? source.materials ?? source.byMaterial ?? [];
  const materialRecovery = Array.isArray(materialRaw)
    ? materialRaw.map((row: any) => ({
        name: String(pick(row, ['name', 'material', 'label', 'type'], 'Other')),
        quantity: (numericField(row,['quantity', 'value', 'recovered'])??0),
        percentage: (numericField(row,['percentage', 'share', 'percent'])??0),
      }))
    : [];

  const byUnitRaw = source.materialRecoveryByUnit && typeof source.materialRecoveryByUnit === 'object' ? source.materialRecoveryByUnit : {};
  const materialRecoveryByUnit = Object.fromEntries(
    Object.entries(byUnitRaw as Record<string, any>).map(([unit, list]) => [
      unit,
      Array.isArray(list)
        ? list.map((row: any) => ({
            name: String(pick(row, ['name', 'material', 'label'], 'Other')),
            quantity: (numericField(row,['quantity', 'value'])??0),
            percentage: (numericField(row,['percentage', 'share'])??0),
          }))
        : [],
    ]),
  );

  const otherOutputsRaw = source.otherOutputs ?? [];
  const otherOutputs = Array.isArray(otherOutputsRaw)
    ? otherOutputsRaw.map((row: any) => ({
        name: String(pick(row, ['name', 'label'], 'Other output')),
        unit: String(pick(row, ['unit'], '')),
        quantity: (numericField(row,['quantity', 'value'])??0),
      }))
    : [];

  return {
    totalReceived,
    totalProcessed,
    totalRecovered,
    totalReject,
    totalProcessLoss,
    efficiency,
    activePlants: n(pick(summary, ['activePlants', 'reportingPlants', 'plantsReporting'])),
    totalPlants: n(pick(summary, ['totalPlants', 'plantCount'])),
    reportingPlants: n(pick(summary, ['reportingPlants', 'plantsReporting'])),
    failedEntries: n(pick(summary, ['failedEntries', 'failedSubmissions', 'failed'])),
    receivedEntries: n(pick(summary, ['receivedEntries', 'receivedSubmissions'])),
    processedEntries: n(pick(summary, ['processedEntries', 'processedSubmissions'])),
    lastSubmissionAt: pick(summary, ['lastSubmissionAt', 'lastReportedAt'], null) as string | null,
    trend,
    materialRecovery,
    materialRecoveryByUnit,
    otherOutputs,
    plantPerformance,
    raw: payload,
  };
}

export function formatMetric(value: number, suffix = ' MT') {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value || 0)}${suffix}`;
}

export function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function lastNDaysRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - Math.max(days - 1, 0));
  return { from: dateInputValue(from), to: dateInputValue(to) };
}


/**
 * Totals per unit family (MT for solid waste, KL / ML for liquid plants), built from the
 * plant rows. Quantities in different units cannot be added, so every family is separate.
 * Only families that have some data are returned, MT first.
 */
export function plantQuantity(row:ProcessingPlantPerformanceRow,key:PlantQuantityKey):number|null {
  if(key==='recovered'&&(row.materialComparable===false||row.materialComparable==null&&row.efficiencyAvailable===false))return null;
  const value=row[key];
  return row[`${key}Available`]===false||typeof value!=='number'||!Number.isFinite(value)?null:value;
}
export function computeUnitTotals(rows: ProcessingPlantPerformanceRow[]): ProcessingUnitTotals[] {
  const keys:PlantQuantityKey[]=['received','processed','recovered','reject','processLoss'];
  const units=[...new Set(rows.map(row=>row.unit||'MT'))];
  return units.map(unit=>{
    const scoped=rows.filter(row=>(row.unit||'MT')===unit);
    const values=Object.fromEntries(keys.map(key=>[key,scoped.map(row=>plantQuantity(row,key)).filter((value):value is number=>value!=null)])) as Record<PlantQuantityKey,number[]>;
    const sums=Object.fromEntries(keys.map(key=>[key,values[key].reduce((total,value)=>total+value,0)])) as Record<PlantQuantityKey,number>;
    const available=Object.fromEntries(keys.map(key=>[key,values[key].length>0])) as Record<PlantQuantityKey,boolean>;
    const partial=Object.fromEntries(keys.map(key=>[key,values[key].length>0&&values[key].length<scoped.filter(row=>key!=='recovered'||!(row.materialComparable===false||row.materialComparable==null&&row.efficiencyAvailable===false)).length])) as Record<PlantQuantityKey,boolean>;
    const comparable=scoped.filter(row=>row.efficiencyAvailable!==false&&(plantQuantity(row,'received')??0)>0&&plantQuantity(row,'recovered')!=null);
    const received=comparable.reduce((total,row)=>total+row.received,0),recovered=comparable.reduce((total,row)=>total+row.recovered,0);
    const balanceComplete=scoped.length>0&&scoped.every(row=>row.balanceAvailable!==false&&row.efficiencyAvailable!==false&&['received','recovered','reject','processLoss'].every(key=>plantQuantity(row,key as PlantQuantityKey)!=null));
    return {unit,...sums,available,partial,scopePlants:scoped.length,comparablePlants:comparable.length,
      hasProcessLoss:available.processLoss,unreconciledBalance:balanceComplete?sums.received-sums.recovered-sums.reject-sums.processLoss:null,
      efficiency:received>0?recovered/received*100:0,hasEfficiency:received>0,
      plants:scoped.filter(row=>keys.some(key=>(plantQuantity(row,key)??0)>0)).length};
  }).sort((a,b)=>a.unit===b.unit?0:a.unit==='MT'?-1:b.unit==='MT'?1:a.unit.localeCompare(b.unit));
}

/** Unknown reporting counts remain unknown; they are never classified as unreported. */
export function plantReporting(rows:ProcessingPlantPerformanceRow[]) {
  return {total:rows.length,reported:rows.filter(row=>row.daysReported!=null&&row.daysReported>0).length,unknown:rows.filter(row=>row.daysReported==null).length};
}

export function plantEntriesPage(response:any,page:number,size:number) {
  const rows=Array.isArray(response?.data)?response.data:response?.data?.items??response?.items;
  if(!Array.isArray(rows))throw Error('Submission register returned an invalid response.');
  const meta=response.meta??response.pagination??response.data?.meta??response;
  const count=(value:unknown)=>value!=null&&String(value).trim()!==''&&typeof value!=='boolean'&&Number.isInteger(Number(value))&&Number(value)>=0?Number(value):null;
  const total=count(meta.total),pages=count(meta.totalPages);
  if(total!=null&&rows.length>0&&total<(page-1)*size+rows.length)throw Error('Submission rows do not match the reported total. Refresh this register.');
  return {rows,total,pages:pages==null?total==null?null:Math.max(1,Math.ceil(total/size)):Math.max(1,pages)};
}

/** Never display other plants' totals if the server ignores an active filter. */
export function scopePlantDashboard(data:ProcessingPlantDashboardData,plantId='',plantType=''):ProcessingPlantDashboardData {
  if(!plantId&&!plantType)return data;
  const rows=data.plantPerformance.filter(row=>(!plantId||row.plantId===plantId)&&(!plantType||row.plantType?.trim().toUpperCase()===plantType.trim().toUpperCase()));
  if(rows.length===data.plantPerformance.length)return data;
  // Aggregate trend/material rows cannot be attributed to an individual plant without source evidence.
  return {...data,plantPerformance:rows,scopeMismatch:true,trend:[],materialRecovery:[],materialRecoveryByUnit:{},otherOutputs:[]};
}
