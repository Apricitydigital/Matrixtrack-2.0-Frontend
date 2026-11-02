import React,{useCallback,useEffect,useState} from 'react';
import {RankingGatewayApi,type RankingGatewayHealth} from '../../services/rankingGateway';

/** Super-admin only: connection status of the external ranking API (key is never shown in full). */
export function RankingApiHealthPage(){
  const [health,setHealth]=useState<RankingGatewayHealth|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{setHealth(await RankingGatewayApi.health());}
    catch(err:any){setError(err?.message||'Could not check the ranking API');}
    finally{setBusy(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  const refreshData=async()=>{
    setBusy(true);
    try{await RankingGatewayApi.clearCache();}catch{/* the re-check below reports any failure */}
    await load();
  };

  const label=!health?'Checking...':!health.configured?'Not configured':health.connected?'Connected':'Connection failed';
  const tone=!health?'text-slate-500':health.connected?'text-emerald-700':'text-red-700';

  return <section className="space-y-5">
    <div className="workspace-page-heading flex flex-wrap items-start justify-between gap-4">
      <div><span className="workspace-eyebrow">INTEGRATIONS</span><h1>Ranking API (Swachhta Parv)</h1><p>Ward Ranking data comes from this external API through the MatrixTrack gateway.</p></div>
      <div className="flex gap-2">
        <button className="workspace-secondary-button" onClick={refreshData} disabled={busy}>Refresh data</button>
        <button className="workspace-secondary-button" onClick={load} disabled={busy}>Test connection</button>
      </div>
    </div>
    {error&&<p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl text-sm">{error}</p>}
    {health&&<div className="workspace-panel grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><p className="text-xs font-bold uppercase text-slate-400">Status</p><p className={`font-bold ${tone}`}>{label}</p>{health.error&&<p className="mt-1 text-xs text-red-700">{health.error}</p>}</div>
      <div><p className="text-xs font-bold uppercase text-slate-400">Organization</p><p className="font-semibold text-slate-800">{health.organization?.name||'-'}</p><p className="text-xs text-slate-400">Key {health.apiKeyHint||'-'}</p></div>
      <div><p className="text-xs font-bold uppercase text-slate-400">Scopes</p><p className="font-semibold text-slate-800">{health.client?.scopes?.join(', ')||'-'}</p></div>
      <div><p className="text-xs font-bold uppercase text-slate-400">Limits</p><p className="font-semibold text-slate-800">{health.client?.rateLimitPerMinute??'-'} / min{health.rateLimit?.remaining?` (${health.rateLimit.remaining} left)`:''}</p><p className="text-xs text-slate-400">Used this month: {health.client?.usageThisMonth??'-'}{health.client?.expiresAt?` · Key expires ${health.client.expiresAt.slice(0,10)}`:''}</p></div>
    </div>}
  </section>;
}
