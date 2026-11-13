import {matrixStore} from './store';
export const REPORT_BRAND='Powered by Apricity Digital Labs';
export function exportContext(filename='',note='') {
 const dates=(filename+' '+note).match(/\d{4}-\d{2}-\d{2}/g)||[],range=matrixStore.getDateRange();
 const from=dates[0]||range.from,to=dates[1]||dates[0]||range.to;
 const cityId=matrixStore.currentUser?.role==='HMS_SUPER_ADMIN'?matrixStore.selectedCityId:matrixStore.currentUser?.cityId;
 const city=matrixStore.getCities().find(c=>c.id===cityId)?.name||'Municipal operations';
 const generated=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
 return {from,to,city,generated,brand:REPORT_BRAND,basis:!/inspection|attendance|report/i.test(filename)&&/personnel|employee|credential|register|locations/i.test(filename)?'Current inventory / accounts snapshot':'Selected reporting dates'};
}
