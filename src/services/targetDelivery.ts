import { targetState, TARGET_STATE_LABELS, type TargetEvidence, type TargetState } from './targetConfiguration';
export interface TargetDelivery {target:number|null;completed:number|null;percent:number|null;configuredPercent:number|null;remaining:number|null;met:boolean;state:TargetState;confirmed:boolean;stateLabel:string;available:boolean;fallback:boolean;}

/** Configured targets use credited counts; full-coverage fallback counts registered locations once. */
export function targetDelivery(figures?:({target?:number;completed?:number;targetPercent?:number}&TargetEvidence)|null,baseline?:{total:number|null;unique:number|null;covered?:number|null}):TargetDelivery {
  const state=targetState(figures),confirmed=state==='configured';
  const fallback=Boolean(baseline&&!confirmed);
  const rawTarget=fallback?baseline!.total:figures?.target;
  const target=typeof rawTarget==='number'&&Number.isFinite(rawTarget)&&rawTarget>=0?rawTarget:null;
  const completed=typeof figures?.completed==='number'&&Number.isFinite(figures.completed)&&figures.completed>=0?figures.completed:null;
  const configured=target!=null&&target>0;
  const credited=fallback?(baseline!.covered!==undefined?baseline!.covered:baseline!.unique):completed;
  const configuredPercent=!fallback&&typeof figures?.targetPercent==='number'&&Number.isFinite(figures.targetPercent)&&figures.targetPercent>=0&&figures.targetPercent<=100?figures.targetPercent:null;
  return {target,completed:credited,configuredPercent,state,confirmed,available:target!=null&&(confirmed||fallback),fallback,stateLabel:TARGET_STATE_LABELS[state],percent:configured&&credited!=null?credited/target*100:null,remaining:target!=null&&credited!=null?Math.max(0,target-credited):null,met:configured&&credited!=null&&credited>=target};
}
