const loaders:Record<string,()=>Promise<unknown>>={
  ulb_dashboard:()=>import('../pages/ulbofficer/UlbDashboard'),
  ulb_map:()=>import('../components/map/OperationalMap'),
  ulb_reports:()=>import('../pages/ulbofficer/UlbWorkspace'),
  ulb_pending:()=>import('../pages/ulbofficer/UlbWorkspace'),
  ulb_approved:()=>import('../pages/ulbofficer/UlbWorkspace'),
  ulb_rejected:()=>import('../pages/ulbofficer/UlbWorkspace'),
  ulb_action_req:()=>import('../pages/ulbofficer/UlbWorkspace'),
  ulb_action_taken:()=>import('../pages/ulbofficer/UlbWorkspace'),
  ulb_inspection_perf:()=>import('../pages/ulbofficer/UlbWorkspace'),
  ulb_iec_issues:()=>import('../pages/ulbofficer/IecCleanlinessIssuesPage'),
  ulb_attendance:()=>import('../pages/commissioner/CommissionerAttendance'),
  ulb_user_perf:()=>import('../pages/commissioner/UserPerformance'),
  ulb_ward_ranking:()=>import('../pages/cityadmin/WardRankingPage'),
  prod_plant:()=>import('../pages/commissioner/PlantProcessing')
};
const pending=new Map<string,Promise<unknown>>();
export function preloadUlbPage(pageId:string){
  if(typeof navigator!=='undefined'&&(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData)return;
  const loader=loaders[pageId];if(!loader||pending.has(pageId))return;
  // Warm code only; API reads and authorization still run when the page opens.
  const job=loader().catch(()=>{pending.delete(pageId);});pending.set(pageId,job);
}
