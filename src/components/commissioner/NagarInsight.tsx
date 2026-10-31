import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, CalendarDays, ChevronDown, History, LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { City, User, Ward, Zone } from '../../types';
import { answerInsight, instantInsight, insightTopic, loadInsightContext, type InsightAnswer, type InsightContext } from '../../services/commissionerAssistant';
import { questionPeriod } from '../../services/insightDates';
import { readInsightHistory, saveInsightExchange, subscribeInsightHistory } from '../../services/insightHistory';

type Message={id:string;role:'user'|'assistant';text:string;at:string;answer?:InsightAnswer;};
const suggestions=['Are we meeting our targets?','How many inspections yesterday?','Which wards are leading?','What is pending review?'];
export function NagarInsight(props:{user:User;activeRole:string;city:City;zones:Zone[];wards:Ward[];from:string;to:string;onNavigate:(page:string)=>void}) {
  if(props.user.role!=='COMMISSIONER'||props.activeRole!=='COMMISSIONER'||props.user.cityId!==props.city.id)return null;
  return <InsightPanel {...props}/>;
}
function InsightPanel({user,city,zones,wards,from,to,onNavigate}:{user:User;city:City;zones:Zone[];wards:Ward[];from:string;to:string;onNavigate:(page:string)=>void}) {
  const [open,setOpen]=useState(false),[question,setQuestion]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[period,setPeriod]=useState({from,to});
  const [messages,setMessages]=useState<Message[]>(()=>readInsightHistory(user,city.id).slice(-8).flatMap(row=>[{id:row.id+'-q',role:'user' as const,text:row.question,at:row.askedAt},{id:row.id+'-a',role:'assistant' as const,text:row.answer.text,at:row.answeredAt,answer:row.answer}]));
  const input=useRef<HTMLTextAreaElement>(null),launcher=useRef<HTMLButtonElement>(null),end=useRef<HTMLDivElement>(null),request=useRef<AbortController|null>(null),busy=useRef(false),cache=useRef(new Map<string,{context:InsightContext;at:number}>());
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{if(open)input.current?.focus();},[open]);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest',behavior:'instant'});},[open,messages,loading]);
  useEffect(()=>subscribeInsightHistory(()=>{if(!readInsightHistory(user,city.id).length)setMessages([]);}),[user.id,city.id]);
  const close=()=>{setOpen(false);launcher.current?.focus();};
  const ask=async(value:string)=>{
    const text=value.trim();if(!text||busy.current)return;
    const id=crypto.randomUUID(),askedAt=new Date().toISOString();busy.current=true;setQuestion('');setError('');
    setMessages(previous=>[...previous,{id:id+'-q',role:'user',text,at:askedAt}]);
    let selected=period,answer:InsightAnswer;
    try{
      const instant=instantInsight(text);
      if(instant)answer=instant;
      else{
        selected=questionPeriod(text,period);setPeriod(selected);setLoading(true);
        const key=[selected.from,selected.to,insightTopic(text),text.toLowerCase()].join(':');const saved=cache.current.get(key);
        let context=saved&&Date.now()-saved.at<30000?saved.context:null;
        if(!context){const c=new AbortController();request.current=c;context=await loadInsightContext(user,city,zones,wards,selected.from,selected.to,c.signal,text);if(c.signal.aborted)return;cache.current.set(key,{context,at:Date.now()});if(cache.current.size>20)cache.current.delete(cache.current.keys().next().value!);}
        answer=answerInsight(text,context);
      }
    }catch(e){if(request.current?.signal.aborted)return;answer={text:e instanceof Error&&(e.name==='InsightScopeError'||/Please (enter|choose|ask)/.test(e.message))?e.message:'I could not retrieve the figures for that period. Please try again shortly or choose another date.',source:'Nagar Insight'};}
    finally{busy.current=false;setLoading(false);}
    const answeredAt=new Date().toISOString();setMessages(previous=>[...previous,{id:id+'-a',role:'assistant',text:answer.text,at:answeredAt,answer}]);
    try{saveInsightExchange(user,city.id,{id,question:text,answer,askedAt,answeredAt,...selected});}catch{setError('Your reply is available here, but chat history could not be saved in this browser.');}
    input.current?.focus();
  };
  const time=(value:string)=>new Date(value).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'});
  return <div className="nagar-insight no-print">
    {open&&<section className="insight-conversation" role="dialog" aria-modal="false" aria-labelledby="nagar-insight-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
      <header><span className="insight-avatar"><Sparkles size={24}/></span><div><span>COMMISSIONER'S CITY GUIDE</span><h2 id="nagar-insight-title">Nagar Insight</h2><p><i/>{city.name}</p></div><button aria-label="Close Nagar Insight" onClick={close}><X size={20}/></button></header>
      <div className="insight-period-controls"><span><CalendarDays size={15}/>Review dates</span><label>From<input type="date" aria-label="Assistant start date" value={period.from} disabled={loading} onChange={e=>setPeriod(p=>({...p,from:e.target.value}))}/></label><label>To<input type="date" aria-label="Assistant end date" value={period.to} disabled={loading} onChange={e=>setPeriod(p=>({...p,to:e.target.value}))}/></label><button aria-label="Open chat history" onClick={()=>{onNavigate('comm_chat_history');close();}}><History size={17}/></button></div>
      <div className="insight-messages" role="log" aria-live="polite" aria-relevant="additions text">
        {!messages.length&&<div className="insight-welcome"><span><BookOpen size={23}/></span><h3>What would you like to know?</h3><p>Ask about inspections, targets, coverage, wards, attendance or plants. Include a date, such as yesterday or 31/10/2026.</p></div>}
        {messages.map(message=><article className={`insight-message ${message.role}`} key={message.id}><span>{message.role==='user'?'You':'Nagar Insight'}<time dateTime={message.at}>{time(message.at)}</time></span><p>{message.text}</p>{message.answer?.page&&<button className="insight-source-link" onClick={()=>{onNavigate(message.answer!.page!);close();}}>{message.answer.label}<ArrowUpRight size={15}/></button>}</article>)}
        {loading&&<div className="insight-loading" role="status"><LoaderCircle size={17} className="animate-spin"/>Checking this question...</div>}
        {error&&<div className="insight-load-error" role="status">{error}</div>}<div ref={end}/>
      </div>
      {!messages.length&&<div className="insight-suggestions" aria-label="Suggested MatrixTrack questions">{suggestions.map(text=><button disabled={loading} key={text} onClick={()=>{void ask(text);}}>{text}<ArrowUpRight size={14}/></button>)}</div>}
      <form onSubmit={e=>{e.preventDefault();void ask(question);}}><label className="sr-only" htmlFor="insight-question">Ask Nagar Insight a MatrixTrack question</label><div><textarea ref={input} id="insight-question" rows={2} maxLength={1200} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about your city or a specific date..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void ask(question);}}}/><button type="submit" disabled={!question.trim()||loading} aria-label="Send question"><Send size={19}/></button></div></form>
    </section>}
    <button ref={launcher} className="insight-launcher" aria-label={open?'Minimize Nagar Insight':'Open Nagar Insight'} aria-expanded={open} aria-haspopup="dialog" onClick={()=>open?close():setOpen(true)}><span>{open?<ChevronDown size={24}/>:<MessageCircle size={24}/>}</span><span><strong>Nagar Insight</strong><small>Your city, explained</small></span>{!open&&<Sparkles size={17}/>}</button>
  </div>;
}
