const loaders:Record<string,()=>Promise<unknown>>={
 ca_logs:()=>import('../pages/superadmin/ActivityLogs'),
 ca_dashboard:()=>import('../pages/cityadmin/CityDashboard'),
 ca_map:()=>import('../components/map/OperationalMap'),
 ca_zones_wards:()=>import('../pages/cityadmin/ZonesWards'),
 ca_geo_hierarchy:()=>import('../pages/cityadmin/ZonesWards'),
 ca_beats:()=>import('../pages/cityadmin/AreasBeats'),
 ca_assignments:()=>import('../pages/cityadmin/AreasBeats'),
 ca_module_dir:()=>import('../pages/OperationalSupportPages'),
 ca_targets:()=>import('../pages/TargetsWorkspace'),
 ca_municipal_users:()=>import('../pages/cityadmin/PersonnelDirectory'),
 ca_employees:()=>import('../pages/cityadmin/PersonnelDirectory'),
 ca_registration_mgmt:()=>import('../pages/superadmin/RegistrationRequests'),
 ca_attendance:()=>import('../pages/commissioner/CommissionerAttendance'),
 ca_user_perf:()=>import('../pages/commissioner/UserPerformance'),
 ca_ward_ranking:()=>import('../pages/cityadmin/WardRankingPage'),
 ca_iec_oversight:()=>import('../pages/commissioner/CleanlinessOversight'),
 ca_exec_summary:()=>import('../pages/commissioner/ReportsExports'),
 prod_plant:()=>import('../pages/commissioner/PlantProcessing')
};
const jobs=new Map<string,Promise<unknown>>();
/** Warm only the requested page's code on navigation intent, never API data. */
export function preloadCityAdminPage(pageId:string){
 if(typeof navigator!=='undefined'&&(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData)return;
 const key=pageId.startsWith('mod_')?'module':/ca_(inspections|daily_reports|attention|inspection_perf)$/.test(pageId)?'reports':pageId;
 const loader=key==='module'?()=>import('../pages/modules/ModuleWorkspace'):key==='reports'?()=>import('../pages/commissioner/CommissionerWorkspace'):loaders[key];
 if(!loader||jobs.has(key))return;
 jobs.set(key,loader().catch(()=>{jobs.delete(key);}));
}
