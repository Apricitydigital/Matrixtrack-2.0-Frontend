import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
interface Photo {url:string;caption:string;timestamp:string;type?:string;}
interface Props {isOpen:boolean;onClose:()=>void;images:Photo[];initialIndex?:number;}
export function ImageLightbox({isOpen,onClose,images,initialIndex=0}:Props) {
  const [index,setIndex]=useState(initialIndex),[scale,setScale]=useState(1),[rotation,setRotation]=useState(0),[pan,setPan]=useState({x:0,y:0}),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  const close=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
  const current=images[Math.min(index,Math.max(0,images.length-1))];
  const reset=()=>{setScale(1);setRotation(0);setPan({x:0,y:0});};
  const move=(delta:number)=>{setIndex(i=>(i+delta+images.length)%images.length);reset();setFailed(false);};
  useEffect(()=>{setIndex(Math.min(initialIndex,Math.max(0,images.length-1)));reset();setFailed(false);},[initialIndex,isOpen,images.length]);
  useEffect(()=>{
    if(!isOpen)return;const previous=document.activeElement as HTMLElement;close.current?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();onClose();}
      if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
      if(e.key==='Tab'){const focusable=[...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    };
    window.addEventListener('keydown',key,true);return()=>{window.removeEventListener('keydown',key,true);previous?.focus();};
  },[isOpen,images.length,onClose]);
  if(!isOpen||!current||typeof document==='undefined')return null;
  const zoom=(delta:number)=>{setScale(s=>Math.min(4,Math.max(.5,s+delta)));setPan({x:0,y:0});};
  const time=current.timestamp&&Number.isFinite(Date.parse(current.timestamp))?new Date(current.timestamp).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'';
  return createPortal(<div ref={dialog} data-image-lightbox role="dialog" aria-modal="true" aria-label="Photographic evidence" className="evidence-viewer">
    <header><div><span>PHOTOGRAPHIC EVIDENCE</span><strong>{index+1} <small>/ {images.length}</small></strong></div><div className="evidence-controls"><button aria-label="Zoom out" onClick={()=>zoom(-.25)} disabled={scale<=.5}><ZoomOut size={19}/></button><span>{Math.round(scale*100)}%</span><button aria-label="Zoom in" onClick={()=>zoom(.25)} disabled={scale>=4}><ZoomIn size={19}/></button><button aria-label="Rotate image" onClick={()=>setRotation(r=>(r+90)%360)}><RotateCw size={18}/></button><button aria-label="Reset image" onClick={reset}><RotateCcw size={18}/></button><a href={current.url} target="_blank" rel="noreferrer" aria-label="Open original image"><ExternalLink size={18}/></a><button ref={close} aria-label="Close image viewer" onClick={onClose}><X size={22}/></button></div></header>
    <div className={`evidence-stage ${scale>1?'is-zoomed':''}`} onPointerDown={e=>{if(scale<=1||e.button!==0||(e.target as HTMLElement).closest('button,a'))return;drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)setPan({x:drag.current.px+e.clientX-drag.current.x,y:drag.current.py+e.clientY-drag.current.y});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
      {images.length>1&&<button className="evidence-prev" aria-label="Previous image" onClick={()=>move(-1)}><ChevronLeft size={25}/></button>}
      {failed?<div className="evidence-image-error"><ImageOff size={36}/><h3>This image couldn't be loaded</h3><p>Try again or open the original file.</p><button onClick={()=>{setFailed(false);setRetry(n=>n+1);}}>Try again</button><a href={current.url} target="_blank" rel="noreferrer">Open original <ExternalLink size={13}/></a></div>:<img key={`${current.url}-${retry}`} src={current.url} alt={current.caption || `Inspection photograph ${index+1}`} draggable={false} onError={()=>setFailed(true)} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${scale}) rotate(${rotation}deg)`}}/>}
      {images.length>1&&<button className="evidence-next" aria-label="Next image" onClick={()=>move(1)}><ChevronRight size={25}/></button>}
    </div><footer><div><strong>{current.caption||`Inspection photograph ${index+1}`}</strong><span>{current.type ? current.type.charAt(0).toUpperCase()+current.type.slice(1):'Evidence'}{time?` · ${time} IST`:''}</span></div>{images.length>1&&<div className="evidence-thumbnails">{images.map((photo,i)=><button key={`${photo.url}-${i}`} aria-label={`Show photograph ${i+1}`} aria-pressed={index===i} onClick={()=>{setIndex(i);reset();setFailed(false);}}><img src={photo.url} alt="" loading="lazy"/></button>)}</div>}</footer>
  </div>,document.body);
}
