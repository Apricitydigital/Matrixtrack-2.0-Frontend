type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:any)=>void)|null;onerror:((e:any)=>void)|null;onend:(()=>void)|null;start:()=>void;abort:()=>void};
type VoiceEnvironment={SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition;speechSynthesis?:SpeechSynthesis;SpeechSynthesisUtterance?:typeof SpeechSynthesisUtterance};
type VoiceCallbacks={transcript:(text:string)=>void;listening:(value:boolean)=>void;speaking:(value:boolean)=>void;error:(message:string)=>void};
export const voiceError=(code:string)=>({ 'not-allowed':'Microphone access was denied. Allow it in your browser settings or type your question.', 'service-not-allowed':'Voice recognition is unavailable in this browser. You can type your question.', 'audio-capture':'No microphone was found. Connect a microphone or type your question.', 'no-speech':'No speech was detected. Tap the microphone to try again.',network:'Voice recognition could not connect. Try again or type your question.', 'language-not-supported':'This voice language is unavailable. Try the other language or type your question.' }[code]||'Voice recognition could not start. You can still type your question.');
export function spokenText(text:string) {return text.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/[*#`]/g,'').replace(/\s+/g,' ').trim().slice(0,12000);}
/** Browser-managed audio only; no microphone blobs or audio recordings are stored by MatrixTrack. */
export class InsightVoice {
  private recognition:Recognition|null=null;
  private utterance:SpeechSynthesisUtterance|null=null;
  private disposed=false;
  private speechRun=0;
  constructor(private env:VoiceEnvironment,private callbacks:VoiceCallbacks){}
  get inputSupported(){return Boolean(this.env.SpeechRecognition||this.env.webkitSpeechRecognition);}
  get outputSupported(){return Boolean(this.env.speechSynthesis&&this.env.SpeechSynthesisUtterance);}
  listen(base:string,language:string) {
    if(this.disposed)return;
    this.stopListening();this.stopSpeaking();
    const Constructor=this.env.SpeechRecognition||this.env.webkitSpeechRecognition;
    if(!Constructor){this.callbacks.error('Voice input is unavailable in this browser. You can type your question.');return;}
    const recognition=new Constructor();this.recognition=recognition;recognition.lang=language;recognition.continuous=true;recognition.interimResults=true;
    let receivedSpeech=false;
    recognition.onresult=event=>{if(this.recognition!==recognition||this.disposed)return;const transcript=Array.from(event.results as ArrayLike<any>).map(r=>r[0]?.transcript||'').join(' ').trim();if(transcript)receivedSpeech=true;this.callbacks.transcript([base.trim(),transcript].filter(Boolean).join(' ').slice(0,1200));};
    recognition.onerror=event=>{if(this.recognition!==recognition)return;this.stopListening();if(event.error!=='aborted')this.callbacks.error(voiceError(event.error));};
    recognition.onend=()=>{if(this.recognition===recognition){this.recognition=null;this.callbacks.listening(false);if(!receivedSpeech)this.callbacks.error('No speech was detected. Check the selected language and microphone, then tap Speak again.');}};
    try{recognition.start();this.callbacks.listening(true);}catch{this.stopListening();this.callbacks.error(voiceError('start'));}
  }
  stopListening(){const r=this.recognition;this.recognition=null;if(r){r.onresult=null;r.onerror=null;r.onend=null;try{r.abort();}catch{}this.callbacks.listening(false);}}
  speak(text:string){
    if(this.disposed)return;
    this.stopListening();this.stopSpeaking();
    const synthesis=this.env.speechSynthesis,Utterance=this.env.SpeechSynthesisUtterance,clean=spokenText(text);
    if(!synthesis||!Utterance){this.callbacks.error('Spoken replies are unavailable in this browser. The full text reply is available here.');return;}
    if(!clean)return;
    const run=this.speechRun,chunks=clean.match(/.{1,220}(?:\s|$)|\S{1,220}/g)||[clean];
    const language=/[\u0900-\u097f]/.test(clean)?'hi-IN':'en-IN';
    const next=()=>{if(this.disposed||run!==this.speechRun)return;const chunk=chunks.shift();if(!chunk){this.utterance=null;this.callbacks.speaking(false);return;}const u=new Utterance(chunk);u.lang=language;u.rate=1;const voices=synthesis.getVoices();u.voice=voices.find(v=>v.lang.toLowerCase()===language.toLowerCase())||voices.find(v=>v.lang.startsWith(language.slice(0,2)))||null;this.utterance=u;u.onend=next;u.onerror=()=>{if(run!==this.speechRun)return;this.utterance=null;this.callbacks.speaking(false);this.callbacks.error('The spoken reply was interrupted. You can read the full reply or play it again.');};try{synthesis.speak(u);}catch{u.onerror?.({} as SpeechSynthesisErrorEvent);}};
    // Chrome can retain a paused speech queue across a previous utterance.
    if(synthesis.paused)synthesis.resume();
    this.callbacks.speaking(true);next();
  }
  stopSpeaking(){this.speechRun++;if(this.utterance){this.utterance.onend=null;this.utterance.onerror=null;this.utterance=null;this.env.speechSynthesis?.cancel();this.callbacks.speaking(false);}}
  stop(){this.stopListening();this.stopSpeaking();}
  dispose(){this.stop();this.disposed=true;}
}
