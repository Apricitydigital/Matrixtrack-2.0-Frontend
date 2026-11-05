import {useEffect,useState} from 'react';
import {expireOperationalReads} from './readCache';

/** Refresh live read-only figures while visible, and when returning to the workspace. */
export function useOperationalRefresh(scope:string,enabled=true) {
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let last=Date.now();
    const refresh=()=>{if(document.hidden||Date.now()-last<5000)return;last=Date.now();expireOperationalReads();setRevision(value=>value+1);};
    const timer=window.setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[scope,enabled]);
  return revision;
}
