const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {RegisteredAttendance}=require('../src/pages/commissioner/RegisteredAttendance.tsx');
const {CommissionerAttendance}=require('../src/pages/commissioner/CommissionerAttendance.tsx');
const {reconciliationCounts,reconciliationSheets}=require('../src/services/attendanceReconciliation.ts');
const spreadsheet=require('../src/services/spreadsheets.ts');
const {matrixStore}=require('../src/services/store.ts');
const city={id:'city',name:'Ujjain',cityCode:'UJN'},zones=[{id:'z',cityId:'city',name:'Zone 6'}],wards=[{id:'w',cityId:'city',zoneId:'z',name:'Ward 44'}];
const employees=Array.from({length:45},(_,i)=>({userId:`u${i}`,name:`Employee ${i+1}`,employeeId:`EMP-${i+1}`,zoneIds:['z'],wardIds:['w'],zones:['Zone 6'],wards:['Ward 44'],state:i<35?'matched':'not_found',reason:i<35?'Unique identifier match':'No matching attendance row found',matchMethod:i<35?'Employee ID':null,attendanceId:i<35?`EMP-${i+1}`:null,attendanceName:i<35?`Employee ${i+1}`:null,status:i<35?'PRESENT':null,inTime:null,outTime:null,sheetLocation:'',locationStatus:'not_available',locationWarnings:[]}));
const data={cityId:'city',date:'2026-11-14',hasAttendanceData:true,registrationBasis:'Current accounts',unmatchedSheetRecords:0,ambiguousSheetRecords:0,employees};
function find(node,fn){if(!node||typeof node!=='object')return;if(fn(node))return node;for(const c of React.Children.toArray(node.props?.children)){const found=find(c,fn);if(found)return found;}}
function harness(fixture=data){
 const original={useState:React.useState,useEffect:React.useEffect,useMemo:React.useMemo};
 const slots=['','','','','matched',{...fixture,requestKey:JSON.stringify(['city','',0,matrixStore.loadRevision])},false,'',0,false,''];
 return {render(){let index=0;React.useState=initial=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};React.useEffect=()=>{};React.useMemo=fn=>fn();try{return RegisteredAttendance({city,zones,wards});}finally{Object.assign(React,original);}},close(){Object.assign(React,original);}};
}
test('ward coverage shows 45 / 35 / 10 and clicking missing opens exactly ten employees',()=>{
 const h=harness();try{
  let tree=h.render(),html=renderToStaticMarkup(tree);
  assert.match(html,/35 matched \+ 10 not found \+ 0 to review = 45 registered/);
  global.document={getElementById:()=>null};find(tree,n=>n.type==='button'&&n.props.className==='recon-count recon-missing').props.onClick();
  tree=h.render();html=renderToStaticMarkup(tree);
  const register=html.slice(html.indexOf('id="registered-attendance-register"'));
  assert.match(register,/Employee 36/);assert.match(register,/Employee 45/);assert.doesNotMatch(register,/>Employee 1</);assert.match(register,/10 employees/);
 }finally{h.close();delete global.document;}
});
test('Excel export includes every missing employee and records the full registered scope',async()=>{
 const h=harness(),saved=spreadsheet.downloadAuditWorkbook;let workbook;
 spreadsheet.downloadAuditWorkbook=async(filename,sheets)=>{workbook={filename,sheets};};
 try{
  const tree=h.render();find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Download missing employees')).props.onClick();
  assert.match(workbook.filename,/2026-11-14\.xlsx$/);
  const missing=workbook.sheets.find(s=>s.name==='Attendance not found');assert.equal(missing.rows.length,10);assert.equal(missing.rows[9][1],'Employee 45');
  assert.ok(workbook.sheets.find(s=>s.name==='Scope and totals').rows.some(r=>r[0]==='Registered'&&r[1]===45));
 }finally{spreadsheet.downloadAuditWorkbook=saved;h.close();}
});
test('summary partitions employees and distinguishes absent matches, review and unavailable data',()=>{
 const rows=[{...employees[0],status:'ABSENT'},{...employees[1],state:'review'},{...employees[2],state:'not_found'},{...employees[3],state:'no_data'}];
 const c=reconciliationCounts(rows);assert.equal(c.registered,c.matched+c.missing+c.review+c.noData);assert.equal(c.present,0);
 const sheets=reconciliationSheets('Ujjain','2026-11-14',rows,'Ward 44');assert.equal(sheets.find(s=>s.name==='Attendance not found').rows.length,1);assert.equal(sheets.find(s=>s.name==='Needs review').rows.length,1);
});
test('municipal roles are visible in the matched register and Excel export',()=>{
 const municipal={...employees[0],name:'Municipal officer',roles:['SUPERVISOR','QC']};
 const h=harness({...data,employees:[municipal]});
 try{const html=renderToStaticMarkup(h.render());assert.match(html,/Registered people/);assert.match(html,/Daroga, SI/);
  const sheet=reconciliationSheets('Ujjain','2026-11-14',[municipal],'All zones').find(s=>s.name==='Matched attendance');
  assert.equal(sheet.rows[0][sheet.headers.indexOf('Registered roles')],'Daroga, SI');
 }finally{h.close();}
});
test('missing export includes employees on subsequent pages and respects geography and search',()=>{
 const extra=Array.from({length:15},(_,i)=>({...employees[44],userId:`extra-${i}`,name:`Missing ${i}`,employeeId:`M-${i}`}));
 const h=harness({...data,employees:[...employees,...extra]});let workbook;const saved=spreadsheet.downloadAuditWorkbook;
 spreadsheet.downloadAuditWorkbook=async(filename,sheets)=>{workbook={filename,sheets};};
 try{
  let tree=h.render();find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Download missing employees')).props.onClick();
  assert.equal(workbook.sheets.find(s=>s.name==='Attendance not found').rows.length,25);
  find(tree,n=>n.props?.['aria-label']==='Search registered attendance').props.onChange({target:{value:'M-14'}});
  tree=h.render();find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Download missing employees')).props.onClick();
  assert.equal(workbook.sheets.find(s=>s.name==='Attendance not found').rows.length,1);
  find(tree,n=>n.props?.['aria-label']==='Registered attendance ward').props.onChange({target:{value:'another-ward'}});
  tree=h.render();assert.equal(find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Download missing employees')).props.disabled,true);
 }finally{spreadsheet.downloadAuditWorkbook=saved;h.close();}
});
test('changing attendance date hides the previous result and disables exports until the new result arrives',()=>{
 const h=harness();try{
  let tree=h.render();find(tree,n=>n.props?.['aria-label']==='Reconciliation date').props.onChange({target:{value:'2026-11-13'}});
  tree=h.render();const html=renderToStaticMarkup(tree);assert.doesNotMatch(html,/35 matched \+ 10 not found/);
  assert.equal(find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Download missing employees')).props.disabled,true);
 }finally{h.close();}
});
test('no source data disables missing download and explains that absence is not inferred',()=>{
 const h=harness({...data,hasAttendanceData:false,employees:employees.map(r=>({...r,state:'no_data'}))});
 try{const tree=h.render(),html=renderToStaticMarkup(tree);assert.match(html,/No attendance sheet records received/);assert.match(html,/Employees are not marked missing or absent/);assert.equal(find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).includes('Download missing employees')).props.disabled,true);}finally{h.close();}
});
test('Attendance navigation opens the new registered-employee page',()=>{
 const saved=React.useState;let tab='overview';React.useState=()=>[tab,value=>{tab=value;}];
 try{let tree=CommissionerAttendance({city,zones,wards});find(tree,n=>n.type==='button'&&n.props.children==='Matched with registered employees').props.onClick();tree=CommissionerAttendance({city,zones,wards});assert.ok(find(tree,n=>n.type===RegisteredAttendance));}finally{React.useState=saved;}
});
