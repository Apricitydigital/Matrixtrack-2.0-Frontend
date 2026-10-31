import React, {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
const key='matrixtrack-theme';
export function initialTheme(): 'light'|'dark' {
  try{return localStorage.getItem(key)==='dark'?'dark':'light';}catch{return 'light';}
}
export function initializeTheme(){if(typeof document!=='undefined')document.documentElement.dataset.theme=initialTheme();}
export function ThemeToggle(){
  const [theme,setTheme]=useState(initialTheme);
  useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
  const toggle=()=>{const next=theme==='light'?'dark':'light';setTheme(next);try{localStorage.setItem(key,next);}catch{ /* Storage is optional. */ }};
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme==='light'?'dark':'light'} theme`} title={`Switch to ${theme==='light'?'dark':'light'} theme`}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>}<span>{theme==='light'?'Dark':'Light'}</span></button>;
}
