import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

/** A separate control keeps help clicks independent of the card's navigation. */
export function CardInfo({title,children}:{title:string;children:React.ReactNode}) {
  const id=useId(),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null),pinned=useRef(false),focused=useRef(false);
  const [open,setOpen]=useState(false),[position,setPosition]=useState({left:0,top:0,ready:false});
  const cancel=()=>{if(timer.current)clearTimeout(timer.current);};
  const close=()=>{cancel();pinned.current=false;setOpen(false);};
  const leave=()=>{cancel();timer.current=setTimeout(()=>{if(!pinned.current&&!focused.current)setOpen(false);},160);};
  useEffect(()=>()=>cancel(),[]);
  useEffect(()=>{
    if(!open)return;
    const outside=(e:Event)=>{if(!trigger.current?.contains(e.target as Node)&&!panel.current?.contains(e.target as Node))close();};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};
    document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',key);};
  },[open]);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const anchor=trigger.current?.getBoundingClientRect(),box=panel.current?.getBoundingClientRect();
      if(!anchor||!box)return;
      const below=anchor.bottom+9;
      setPosition({left:Math.max(12,Math.min(anchor.right-box.width,window.innerWidth-box.width-12)),top:Math.max(12,below+box.height<=window.innerHeight-12?below:anchor.top-box.height-9),ready:true});
    };
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,children]);
  return <span className="card-info-control" onMouseEnter={()=>{cancel();setOpen(true);}} onMouseLeave={leave}>
    <button ref={trigger} type="button" className="card-info-trigger" aria-label={`About ${title}`} aria-expanded={open} aria-controls={open?id:undefined} aria-describedby={open?id:undefined}
      onFocus={()=>{focused.current=true;cancel();setOpen(true);}} onBlur={()=>{focused.current=false;leave();}}
      onClick={e=>{e.stopPropagation();cancel();pinned.current=!pinned.current;setOpen(pinned.current);}}><Info size={16} aria-hidden="true"/></button>
    {open&&createPortal(<div ref={panel} id={id} role="tooltip" className="card-info-popover" style={{left:position.left,top:position.top,visibility:position.ready?'visible':'hidden'}} onMouseEnter={cancel} onMouseLeave={leave}>
      <strong>{title}</strong><div>{children}</div>
    </div>,document.body)}
  </span>;
}

export function InfoCard({title,info,children}:{title:string;info:React.ReactNode;children:React.ReactElement<{className?:string}>}) {
  return <div className="info-card-frame">{React.cloneElement(children,{className:`${children.props.className||''} info-card-main`})}<CardInfo title={title}>{info}</CardInfo></div>;
}
