const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict'),{test}=require('node:test');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {InsightVoice,spokenText}=require('../src/services/insightVoice.ts');
function fixture(){
 const state={text:[],listening:[],speaking:[],errors:[],spoken:[],cancelled:0};
 class Recognition{constructor(){state.recognition=this;}start(){}abort(){this.aborted=true;}}
 class Utterance{constructor(text){this.text=text;}}
 const env={SpeechRecognition:Recognition,SpeechSynthesisUtterance:Utterance,speechSynthesis:{getVoices:()=>[{lang:'en-IN',name:'English'},{lang:'hi-IN',name:'Hindi'}],speak:u=>state.spoken.push(u),cancel:()=>state.cancelled++}};
 const controller=new InsightVoice(env,{transcript:t=>state.text.push(t),listening:l=>state.listening.push(l),speaking:s=>state.speaking.push(s),error:e=>state.errors.push(e)});
 return {state,controller};
}
test('voice dictation merges complete/interim results once and ignores late events after stopping',()=>{
 const {state,controller}=fixture();controller.listen('Ward 1','hi-IN');const r=state.recognition;assert.equal(r.lang,'hi-IN');assert.equal(r.continuous,true);
 r.onresult({results:[[{transcript:'inspection'}]]});r.onresult({results:[[{transcript:'inspection'}],[{transcript:'target'}]]});assert.equal(state.text.at(-1),'Ward 1 inspection target');
 const late=r.onresult;controller.stopListening();late({results:[[{transcript:'must be ignored'}]]});assert.equal(state.text.at(-1),'Ward 1 inspection target');assert.equal(r.aborted,true);assert.equal(state.listening.at(-1),false);
});
test('permission denial and missing browser speech support preserve typed chat with clear errors',()=>{
 const {state,controller}=fixture();controller.listen('','en-IN');state.recognition.onerror({error:'not-allowed'});assert.match(state.errors.at(-1),/access was denied/);assert.equal(state.listening.at(-1),false);
 const errors=[],unsupported=new InsightVoice({},{transcript:()=>{},listening:()=>{},speaking:()=>{},error:e=>errors.push(e)});assert.equal(unsupported.inputSupported,false);assert.equal(unsupported.outputSupported,false);unsupported.listen('','en-IN');unsupported.speak('Hello');assert.equal(errors.length,2);
});
test('spoken replies retain numeric text, select a matching voice and stop on disposal',()=>{
 const {state,controller}=fixture();controller.speak('**Action required:** 12. [Report](https://example.test/report) Action taken: 8.');assert.equal(state.spoken[0].lang,'en-IN');assert.match(state.spoken[0].text,/Action required: 12/);assert.doesNotMatch(state.spoken[0].text,/https/);
 state.spoken[0].onend();assert.equal(state.speaking.at(-1),false);controller.speak('निरीक्षण १२');assert.equal(state.spoken.at(-1).lang,'hi-IN');controller.dispose();assert.equal(state.cancelled,1);assert.equal(state.speaking.at(-1),false);const count=state.spoken.length;controller.speak('Ignore after unmount');assert.equal(state.spoken.length,count);
 assert.equal(spokenText('Coverage **10.8%** / 254 entities'),'Coverage 10.8% / 254 entities');
});
test('long replies are spoken in order without losing words or repeating chunks',()=>{
 const {state,controller}=fixture(),text=Array.from({length:140},(_,i)=>'entity'+i).join(' ');controller.speak(text);
 for(let i=0;i<state.spoken.length;i++)state.spoken[i].onend();assert.equal(state.spoken.map(u=>u.text).join('').replace(/\s+/g,' ').trim(),text);assert.equal(state.speaking.at(-1),false);
});

test('voice keeps listening for continuous Hindi dictation and reports an empty recognition session',()=>{const {state,controller}=fixture();controller.listen('','hi-IN');assert.equal(state.recognition.continuous,true);state.recognition.onend();assert.equal(state.listening.at(-1),false);assert.match(state.errors.at(-1),/selected language and microphone/);});

test('speaker resumes a paused browser speech queue before playback',()=>{
 let resumed=false,spoken=false;
 class Utterance{constructor(text){this.text=text;}}
 const controller=new InsightVoice({SpeechSynthesisUtterance:Utterance,speechSynthesis:{paused:true,resume(){resumed=true;},getVoices:()=>[],speak(){assert.equal(resumed,true);spoken=true;},cancel(){}}},{transcript(){},listening(){},speaking(){},error(){}});
 controller.speak('Action taken: 12');assert.equal(spoken,true);controller.dispose();
});
