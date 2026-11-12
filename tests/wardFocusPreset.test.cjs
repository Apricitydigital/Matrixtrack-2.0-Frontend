const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {wardFocusPreset}=require('../src/services/wardFocusPreset.ts');
const pairs=[[1,[12,10,11,13]],[2,[20,4,6]],[3,[23,33]],[4,[44,52]],[5,[38,40]],[6,[35,48]]];
const zones=pairs.map(([zoneNumber])=>({id:`z${zoneNumber}`,cityId:'city',zoneNumber}));
const wards=pairs.flatMap(([z,numbers])=>numbers.map(wardNumber=>({id:`w${wardNumber}`,cityId:'city',zoneId:`z${z}`,wardNumber})));

test('sheet preset resolves only its 15 wards and 6 zones, excluding other geography',()=>{
 const result=wardFocusPreset('city',[...zones,{id:'other-zone',cityId:'other',zoneNumber:1}],[...wards,{id:'extra',cityId:'city',zoneId:'z1',wardNumber:99},{...wards[0],id:'other-ward',cityId:'other'}]);
 assert.deepEqual(result,{zoneIds:zones.map(z=>z.id),wardIds:wards.map(w=>w.id)});
});
test('missing, ambiguous or incorrectly mapped geography cannot become a partial or all-area preset',()=>{
 assert.equal(wardFocusPreset('city',zones,wards.slice(1)),null);
 assert.equal(wardFocusPreset('city',zones,wards.map((w,i)=>i===0?{...w,zoneId:'z2'}:w)),null);
 assert.equal(wardFocusPreset('city',zones,[...wards,{...wards[0],id:'duplicate'}]),null);
 assert.equal(wardFocusPreset('other',zones,wards),null);
});
