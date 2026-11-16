const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {buildZoneRankings,zoneHighlights}=require('../src/services/zoneRanking.ts');
const zones=[1,2,3].map(id=>({id:`z${id}`,name:`Zone ${id}`,cityId:'city'}));
const ward=(id,zoneId)=>({id,name:`Ward ${id}`,zoneId,cityId:'city'});
const score=(wardId,finalScore,rankable=true)=>({wardId,finalScore,rankable});

test('zone scores weight wards equally regardless of zone size and include assessed zeroes',()=>{
 const ranked=buildZoneRankings(zones,[ward('a','z1'),ward('b','z1'),ward('c','z2'),ward('d','z3')],[score('a',100),score('b',0),score('c',60),score('d',20)]);
 assert.deepEqual(ranked.map(item=>[item.zone.id,item.score,item.rank]),[['z2',60,1],['z1',50,2],['z3',20,3]]);
 const h=zoneHighlights(ranked);assert.equal(h.best[0].zone.id,'z2');assert.equal(h.attention[0].zone.id,'z3');
});

test('missing rows, invalid scores and unassessed wards prevent official ranking',()=>{
 const ranked=buildZoneRankings(zones,[ward('a','z1'),ward('b','z1'),ward('c','z2'),ward('d','z3')],[score('a',100),score('c',0,false),score('d',NaN)]);
 const partial=ranked.find(item=>item.zone.id==='z1');assert.equal(partial.score,100);assert.equal(partial.total,2);assert.equal(partial.assessed,1);assert.equal(partial.rank,null);assert.equal(partial.wards[1].wardId,'b');
 assert.equal(ranked.find(item=>item.zone.id==='z2').score,null);assert.equal(ranked.find(item=>item.zone.id==='z3').score,null);
 assert.deepEqual(zoneHighlights(ranked),{best:[],attention:[]});
});

test('ties share ranks at displayed precision and never put a zone on both highlight lists',()=>{
 const ranked=buildZoneRankings(zones,[ward('a','z1'),ward('b','z2'),ward('c','z3')],[score('a',80.001),score('b',80.002),score('c',60)]);
 assert.deepEqual(ranked.map(item=>item.rank),[1,1,3]);assert.equal(zoneHighlights(ranked).best.length,2);
 const allTied=buildZoneRankings(zones,[ward('a','z1'),ward('b','z2')],[score('a',70),score('b',70)]);
 assert.equal(zoneHighlights(allTied).attention.length,0);
 assert.equal(zoneHighlights(ranked.slice(0,1)).attention.length,0);
});

test('empty zones and duplicate or foreign API rows cannot inflate coverage',()=>{
 const ranked=buildZoneRankings(zones,[ward('a','z1')],[score('a',20),score('a',40),score('foreign',100)]);
 assert.equal(ranked[0].score,40);assert.equal(ranked[0].total,1);assert.equal(ranked[0].assessed,1);
 assert.equal(ranked[1].total,0);assert.equal(ranked[1].score,null);assert.equal(ranked[1].rank,null);
});
