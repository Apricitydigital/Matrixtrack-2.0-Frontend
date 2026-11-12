import { targetState, TARGET_STATE_LABELS, type TargetEvidence, type TargetState } from './targetConfiguration';
export interface TargetDelivery {target:number|null;completed:number|null;percent:number|null;configuredPercent:number|null;remaining:number|null;met:boolean;state:TargetState;confirmed:boolean;stateLabel:string;available:boolean;fallback:boolean;targetBasis?:'current'|'historical';}

/** Configured targets use backend credit; the period baseline counts each registered location once per day. */
export function targetDelivery(figures?:({target?:number;completed?:number;targetPercent?:number;targetBasis?:'current'|'historical'}&TargetEvidence)|null,baseline?:{total:number|null;unique:number|null;covered?:number|null;required?:number|null;dailyCovered?:number|null}):TargetDelivery {
  const state=targetState(figures),confirmed=state==='configured';
  const fallback=Boolean(baseline&&!confirmed);
  const rawTarget=fallback?(baseline!.required!==undefined?baseline!.required:baseline!.total):figures?.target;
  const target=typeof rawTarget==='number'&&Number.isFinite(rawTarget)&&rawTarget>=0?rawTarget:null;
  const completed=typeof figures?.completed==='number'&&Number.isFinite(figures.completed)&&figures.completed>=0?figures.completed:null;
  const configured=target!=null&&target>0;
  const credited=fallback?(baseline!.dailyCovered!==undefined?baseline!.dailyCovered:baseline!.covered!==undefined?baseline!.covered:baseline!.unique):completed;
  const configuredPercent=!fallback&&typeof figures?.targetPercent==='number'&&Number.isFinite(figures.targetPercent)&&figures.targetPercent>=0&&figures.targetPercent<=100?figures.targetPercent:null;
  return {target,completed:credited,configuredPercent,state,confirmed,available:target!=null&&(confirmed||fallback),fallback,...(!fallback&&figures?.targetBasis?{targetBasis:figures.targetBasis}:{}),stateLabel:TARGET_STATE_LABELS[state],percent:configured&&credited!=null?credited/target*100:null,remaining:target!=null&&credited!=null?Math.max(0,target-credited):null,met:configured&&credited!=null&&credited>=target};
}

/** Never show a planning fallback while saved targets are still being read. */
export function targetReadState(delivery:TargetDelivery,ready:boolean):TargetDelivery{return ready?delivery:{...delivery,target:null,completed:null,percent:null,remaining:null,available:false,fallback:false,met:false,stateLabel:'Target source unavailable'};}

/** City report intake compares every submitted report to the target; officer scoring retains its own credit rules. */
export function reportTargetDelivery(delivery:TargetDelivery,received:number|null):TargetDelivery {
  const target=delivery.available?delivery.target:null,completed=received!=null&&Number.isFinite(received)&&received>=0?received:null;
  return {...delivery,target,completed,percent:target!=null&&target>0&&completed!=null?completed/target*100:null,remaining:target!=null&&completed!=null?Math.max(0,target-completed):null,met:target!=null&&target>0&&completed!=null&&completed>=target};
}
