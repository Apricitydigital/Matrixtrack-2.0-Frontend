export interface LocatedItem {key:string;point:[number,number];}
/** Focus the dense city register initially; Fit all continues to include distant records. */
export function cityFocusPoints(items:LocatedItem[]):[number,number][] {
 const points=items.map(item=>item.point);if(points.length<10)return points;
 const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const lat=median(points.map(p=>p[0])),lng=median(points.map(p=>p[1]));
 const near=points.filter(p=>Math.hypot((p[0]-lat)*111,(p[1]-lng)*111*Math.cos(lat*Math.PI/180))<=12);
 return near.length>=points.length*.6?near:points;
}
/** Every location belongs to exactly one screen cell, regardless of viewport or zoom. */
export function mapClusters<T extends LocatedItem>(items:T[],project:(point:[number,number])=>{x:number;y:number},size=48):T[][] {
 const groups=new Map<string,T[]>();for(const item of items){const p=project(item.point),key=`${Math.floor(p.x/size)}:${Math.floor(p.y/size)}`;const group=groups.get(key)||[];group.push(item);groups.set(key,group);}return [...groups.values()];
}
