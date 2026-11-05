import { useEffect, useState } from 'react';
import type { City } from '../types';
import { emptyCoverage, loadInspectionCoverage } from './inspectionCoverage';
import {useOperationalRefresh} from './useOperationalRefresh';

export function useInspectionCoverage(city:City,from:string,to:string,revision:number,enabled=true,compact=false) {
  const [state,setState]=useState({key:'',data:emptyCoverage(),loading:true});
  const focusRevision=useOperationalRefresh(city.id,enabled&&!state.loading);
  const modules=city.enabledModules.join(',');
  const key=JSON.stringify([city.id,modules,from,to,revision,compact,focusRevision]);
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
