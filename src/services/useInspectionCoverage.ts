import { useEffect, useState } from 'react';
import type { City } from '../types';
import { emptyCoverage, loadInspectionCoverage } from './inspectionCoverage';

export function useInspectionCoverage(city:City,from:string,to:string,revision:number) {
  const [state,setState]=useState({data:emptyCoverage(),loading:true});
  const modules=city.enabledModules.join(',');
  useEffect(()=>{
    const controller=new AbortController();setState({data:emptyCoverage(),loading:true});
    loadInspectionCoverage(city,from,to,controller.signal).then(data=>{if(!controller.signal.aborted)setState({data,loading:false});}).catch(error=>{
      if(!controller.signal.aborted)setState({data:{...emptyCoverage(),failedModules:[...city.enabledModules],errors:[error instanceof Error?error.message:'Coverage unavailable.']},loading:false});
    });
    return()=>controller.abort();
  },[city.id,modules,from,to,revision]);
  return state;
}
