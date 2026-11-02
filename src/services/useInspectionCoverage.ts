import { useEffect, useState } from 'react';
import { expireInspectionReads } from './readCache';
import type { City } from '../types';
import { emptyCoverage, loadInspectionCoverage } from './inspectionCoverage';

export function useInspectionCoverage(city:City,from:string,to:string,revision:number,enabled=true,compact=false) {
  const [focusRevision,setFocusRevision]=useState(0);
  useEffect(()=>{if(!enabled)return;let last=Date.now();const refresh=()=>{if(document.hidden||Date.now()-last<5000)return;last=Date.now();expireInspectionReads();setFocusRevision(n=>n+1);};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[enabled,city.id]);
  const modules=city.enabledModules.join(',');
  const key=JSON.stringify([city.id,modules,from,to,revision,compact,focusRevision]);
  const [state,setState]=useState({key:'',data:emptyCoverage(),loading:true});
  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();setState({key,data:emptyCoverage(),loading:true});
    loadInspectionCoverage(city,from,to,controller.signal,compact).then(data=>{if(!controller.signal.aborted)setState({key,data,loading:false});}).catch(error=>{
      if(!controller.signal.aborted)setState({key,data:{...emptyCoverage(),failedModules:[...city.enabledModules],errors:[error instanceof Error?error.message:'Coverage unavailable.']},loading:false});
    });
    return()=>controller.abort();
  },[city.id,modules,from,to,revision,enabled,compact,focusRevision]);
  return state.key===key?state:{data:emptyCoverage(),loading:true};
}
