import { useEffect, useRef, useState } from 'react';
import type { City } from '../types';
import { emptyCoverage, loadInspectionCoverage } from './inspectionCoverage';
import {useOperationalRefresh} from './useOperationalRefresh';

export function useInspectionCoverage(city:City,from:string,to:string,revision:number,enabled=true,compact=false) {
  const [state,setState]=useState({key:'',data:emptyCoverage(),loading:true});
  const [refreshing,setRefreshing]=useState(false);
  const focusRevision=useOperationalRefresh(city.id,enabled&&!state.loading&&!refreshing);
  const modules=city.enabledModules.join(',');
  // Scope key excludes the automatic refresh counter, so a background refresh never blanks the page.
  const key=JSON.stringify([city.id,modules,from,to,revision,compact]);
  const loadedKey=useRef('');
  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController(),background=loadedKey.current===key;
    setRefreshing(true);
    if(!background)setState({key,data:emptyCoverage(),loading:true});
    loadInspectionCoverage(city,from,to,controller.signal,compact).then(data=>{if(!controller.signal.aborted){loadedKey.current=key;setState({key,data,loading:false});}}).catch(error=>{
      if(controller.signal.aborted)return;
      if(background){setState(previous=>({...previous,data:{...previous.data,errors:[...previous.data.errors.filter(message=>!message.startsWith('Live refresh failed:')),`Live refresh failed: ${error instanceof Error?error.message:'Coverage unavailable'}. Showing the last loaded figures.`]}}));return;}
      setState({key,data:{...emptyCoverage(),failedModules:[...city.enabledModules],errors:[error instanceof Error?error.message:'Coverage unavailable.']},loading:false});
    }).finally(()=>{if(!controller.signal.aborted)setRefreshing(false);});
    return()=>controller.abort();
  },[city.id,modules,from,to,revision,enabled,compact,focusRevision]);
  return state.key===key?state:{data:emptyCoverage(),loading:true};
}
