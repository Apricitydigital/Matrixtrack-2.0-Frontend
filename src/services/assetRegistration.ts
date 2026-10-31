import {writeApi} from './api';
import {assertCityAdmin,AREA_TYPES} from './citySetup';
import {parseCsv} from './csv';
import {matrixStore} from './store';
export type CsvAssetModule='toilets'|'litter_bins'|'ctu_gvp';
export const ASSET_HEADERS:Record<CsvAssetModule,string[]>={toilets:['Zone Name','Ward Name','Area Type','Area Name','Toilet Name / ID','Address','Toilet Type','Latitude','Longitude'],litter_bins:['Zone Name','Ward Name','Area Type','Area Name','Latitude','Longitude'],ctu_gvp:['Zone Name','Ward Name','Area Type','GVP Name','Latitude','Longitude']};
export function validateAssetCsv(cityId:string,module:CsvAssetModule,text:string){
  assertCityAdmin(cityId);const rows=parseCsv(text.replace(/^\uFEFF/,''));const headers=ASSET_HEADERS[module];
  if(rows.length<2)throw new Error('The file must include a header and at least one location.');
  if(rows[0].length!==headers.length||headers.some((h,i)=>rows[0][i].toLowerCase()!==h.toLowerCase()))throw new Error('Use the column order in the downloadable template.');
  const {zones,wards}=matrixStore.getData();
  rows.slice(1).forEach((row,index)=>{
    const fail=(reason:string)=>{throw new Error(`Row ${index+2}: ${reason}`);};
    if(row.length!==headers.length)fail('Incorrect number of columns.');
    // Existing bin/GVP parsers use simple comma splitting; reject unsupported quoted fields before any write.
    if(module!=='toilets'&&row.some(v=>/[",\r\n]/.test(v)))fail('Commas, quotes and line breaks are not supported in these fields.');
    const zone=zones.find(z=>z.cityId===cityId&&(z.name.toLowerCase()===row[0].toLowerCase()||`Zone ${z.zoneNumber}`.toLowerCase()===row[0].toLowerCase()));
    const ward=wards.find(w=>w.cityId===cityId&&w.zoneId===zone?.id&&(w.name.toLowerCase()===row[1].toLowerCase()||`Ward ${w.wardNumber}`.toLowerCase()===row[1].toLowerCase()));
    if(!zone||!ward)fail('Zone and Ward must match the city hierarchy.');
    // Submit canonical backend node names rather than displayName-decorated labels.
    if(zone)row[0]=zone.backendName||zone.name;if(ward)row[1]=ward.backendName||ward.name;
    if(!AREA_TYPES.includes(row[2].toUpperCase()))fail('Choose a valid Area type.');
    if(!row[3].trim()||(module==='toilets'&&!row[4].trim()))fail('Location name is required.');
    if(module==='toilets'&&!['CT','PT','URINALS'].includes(row[6].toUpperCase()))fail('Toilet type must be CT, PT or URINALS.');
    const lat=row.at(-2)!,lng=row.at(-1)!;if(!lat||!lng||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))||Math.abs(Number(lat))>90||Math.abs(Number(lng))>180||(Number(lat)===0&&Number(lng)===0))fail('Enter valid Latitude and Longitude.');
  });return rows;
}
export async function importAssetCsv(cityId:string,module:CsvAssetModule,text:string){
  const rows=validateAssetCsv(cityId,module,text),path={toilets:'toilet',litter_bins:'twinbin',ctu_gvp:'taskforce'}[module];
  const csvText=rows.map(row=>row.map(v=>/[",\r\n]/.test(v)?`"${v.replaceAll('"','""')}"`:v).join(',')).join('\n');
  const result=await writeApi(`/modules/${path}/bulk-import`,'POST',{csvText});await matrixStore.refreshCollections(['geography']);return {...result,requested:rows.length-1};
}
