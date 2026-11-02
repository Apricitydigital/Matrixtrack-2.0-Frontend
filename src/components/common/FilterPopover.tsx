import React,{useEffect,useRef} from 'react';

/** Shared by filter popovers only; explanatory accordions remain open. */
export function useFilterDismiss<T extends HTMLElement>(ref:React.RefObject<T|null>,dismiss:(reason:'outside'|'escape')=>void,enabled=true){
  const handler=useRef(dismiss);handler.current=dismiss;
  useEffect(()=>{
    if(!enabled)return;
    const outside=(event:Event)=>{if(ref.current&&event.target instanceof Node&&!ref.current.contains(event.target))handler.current('outside');};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){handler.current('escape');}};
    document.addEventListener('pointerdown',outside,true);document.addEventListener('focusin',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',escape);};
  },[enabled,ref]);
}
export function FilterPopover({children,...props}:React.ComponentProps<'details'>){
  const ref=useRef<HTMLDetailsElement>(null);
  useFilterDismiss(ref,reason=>{if(ref.current?.open){ref.current.open=false;if(reason==='escape')ref.current.querySelector('summary')?.focus();}});
  return <details {...props} ref={ref}>{children}</details>;
}
