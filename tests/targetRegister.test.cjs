const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {targetRegister,manualTargetIds,matchesTargetScope}=require('../src/services/targetRegister.ts');
test('SI daily sampling appears with saved Daroga targets and cannot enter bulk deletion',()=>{
 const daroga={id:'daroga',role:'SUPERVISOR',wardId:'ward'},sample={id:'si-sample:today',role:'QC',isSampling:true},manual={id:'manual-si',role:'QC'};
 const register=targetRegister({total:2,targets:[daroga,manual],samplingTargets:[sample]});
 assert.equal(register.samplingAvailable,true);assert.equal(register.rows.length,3);
 assert.deepEqual(register.rows.filter(row=>matchesTargetScope(row,'si')),[manual,sample]);
 assert.deepEqual(register.rows.filter(row=>matchesTargetScope(row,'ward')),[daroga]);
 assert.deepEqual(manualTargetIds([...register.rows,daroga]),['daroga','manual-si']);
});
test('older API responses retain manual rows and explicitly report sampling unavailable',()=>{
 assert.deepEqual(targetRegister({targets:[{id:'manual'}],total:1}),{rows:[{id:'manual'}],samplingAvailable:false});
 assert.throws(()=>targetRegister({targets:[{id:'manual'}],total:2}),/unavailable/);
 assert.throws(()=>targetRegister({targets:null}),/unavailable/);
});
