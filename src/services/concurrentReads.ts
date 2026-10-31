/** Start the next read as soon as a slot is free, without waiting for a whole batch. */
export async function concurrentReads<T>(tasks:(()=>Promise<T>)[],limit:number):Promise<PromiseSettledResult<T>[]> {
  const results:PromiseSettledResult<T>[]=new Array(tasks.length);let next=0;
  const worker=async()=>{while(next<tasks.length){const index=next++;try{results[index]={status:'fulfilled',value:await tasks[index]()};}catch(reason){results[index]={status:'rejected',reason};}}};
  await Promise.all(Array.from({length:Math.min(tasks.length,Math.max(1,Math.floor(limit)))},worker));
  return results;
}
