import React,{useEffect,useState} from 'react';
import { History, MessageCircle, Search, Trash2 } from 'lucide-react';
import type {City,User} from '../../types';
import {clearInsightHistory,readInsightHistory,subscribeInsightHistory} from '../../services/insightHistory';
export function ChatHistory({user,city}:{user:User;city:City}) {
 if(user.role!=='COMMISSIONER'||user.cityId!==city.id)return null;
 return <HistoryPage user={user} city={city}/>;
}
function HistoryPage({user,city}:{user:User;city:City}) {
 const [revision,setRevision]=useState(0),[query,setQuery]=useState(''),[error,setError]=useState(''),[limit,setLimit]=useState(20);
 useEffect(()=>subscribeInsightHistory(()=>setRevision(n=>n+1)),[]);
 const rows=readInsightHistory(user,city.id),filtered=[...rows].reverse().filter(row=>`${row.question} ${row.answer.text} ${row.from} ${row.to}`.toLowerCase().includes(query.toLowerCase()));
 const stamp=(value:string)=>new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Kolkata'});
 return <section className="chat-history-page" data-history-revision={revision}><div className="page-heading-row"><div><span className="page-eyebrow">NAGAR INSIGHT</span><h1>Chat history</h1><p>Questions and replies for {city.name}. Saved in this browser for your Commissioner account.</p></div><button disabled={!rows.length} className="workspace-secondary-button" onClick={()=>{if(!window.confirm('Clear this account’s chat history in this browser?'))return;try{clearInsightHistory(user,city.id);}catch{setError('Chat history could not be cleared. Please try again.');}}}><Trash2 size={16}/>Clear history</button></div>
 <label className="chat-history-search"><Search size={17}/><input aria-label="Search chat history" placeholder="Search questions, replies or review dates" value={query} onChange={e=>{setQuery(e.target.value);setLimit(20);}}/><span>{filtered.length} conversations</span></label>{error&&<p role="alert">{error}</p>}
 {filtered.length?<div className="chat-history-list">{filtered.slice(0,limit).map(row=><article key={row.id}><header><span><History size={15}/>{row.from}{row.from!==row.to?` to ${row.to}`:''}</span><time dateTime={row.askedAt}>{stamp(row.askedAt)} IST</time></header><div className="chat-history-question"><MessageCircle size={18}/><div><span>You asked</span><h2>{row.question}</h2></div></div><div className="chat-history-answer"><span>Nagar Insight <time dateTime={row.answeredAt}>{stamp(row.answeredAt)} IST</time></span><p>{row.answer.text}</p></div></article>)}</div>:<div className="chat-history-empty"><History size={32}/><h2>{rows.length?'No matching conversations':'Your conversations will appear here'}</h2><p>{rows.length?'Try another word or review date.':'Open Nagar Insight and ask your first city question.'}</p></div>}
 {filtered.length>limit&&<button className="workspace-secondary-button" onClick={()=>setLimit(n=>n+20)}>Load more conversations ({filtered.length-limit} remaining)</button>}
 </section>;
}
