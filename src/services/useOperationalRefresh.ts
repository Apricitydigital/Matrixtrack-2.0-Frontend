import {useEffect,useState} from 'react';
import {expireOperationalReads} from './readCache';
import {TARGETS_CHANGED_EVENT} from './targetEvents';

/** Refresh live read-only figures while visible, and when returning to the workspace. */
export function useOperationalRefresh(scope:string,enabled=true) {
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let last=Date.now();
    const update=(force:boolean)=>{if(document.hidden||!force&&Date.now()-last<5000)return;last=Date.now();expireOperationalReads();setRevision(value=>value+1);};
    const refresh=()=>update(false),targetsChanged=()=>update(true);
    const timer=window.setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    window.addEventListener(TARGETS_CHANGED_EVENT,targetsChanged);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener(TARGETS_CHANGED_EVENT,targetsChanged);};
  },[scope,enabled]);
  return revision;
}
