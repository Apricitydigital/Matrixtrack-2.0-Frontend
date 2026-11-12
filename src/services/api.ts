// Database credentials belong to the existing backend, never to the browser application.
import {cachedRead,clearReadCache,primeReadCache,readCacheKey,readCacheTtl} from './readCache';
import {TARGETS_CHANGED_EVENT} from './targetEvents';
import {applyFixedWardWeights} from './wardScoring';
export {clearReadCache};
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/backend').replace(/\/+$/, '');
let cityContext:string|undefined;
const cityModules=new Map<string,string[]>();
export function setApiCityModules(id:string,keys:string[]){cityModules.set(id,keys);clearReadCache();}
export function setApiCityContext(id?:string){if(cityContext!==id){clearReadCache();cityContext=id;}}
const TOKEN_KEY = 'matrixtrack_command_access_token';
const REFRESH_KEY = 'matrixtrack_command_refresh_token';
let sessionVersion = 0;
let refreshing: Promise<void> | null = null;
export const getSessionVersion = () => sessionVersion;
export const setRefreshToken = (token?: string) => token ? sessionStorage.setItem(REFRESH_KEY, token) : sessionStorage.removeItem(REFRESH_KEY);
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => {sessionVersion++;cityContext=undefined;cityModules.clear();clearReadCache();sessionStorage.setItem(TOKEN_KEY, token);sessionStorage.removeItem(REFRESH_KEY);};
export const clearToken = () => {sessionVersion++;cityContext=undefined;cityModules.clear();clearReadCache();sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(REFRESH_KEY);};

async function ensureFreshToken() {
  const token = getToken(), refreshToken = sessionStorage.getItem(REFRESH_KEY);
  if (!token || !refreshToken) return;
  let expires = 0;
  try { expires = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { return; }
  if (expires > Date.now() + 60_000) return;
  if (!refreshing) {
    const version = sessionVersion;
    refreshing = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({refreshToken}), signal: AbortSignal.timeout(15000) });
      if (version !== sessionVersion) return;
      if (!response.ok) {
        if (response.status === 401) { clearToken(); window.dispatchEvent(new Event('matrixtrack:session-expired')); }
        throw new ApiError(response.status, 'Unable to renew your session. Please sign in again.');
      }
      const data = await response.json();
      if (version !== sessionVersion) return;
      if (!data.token || !data.refreshToken) throw new ApiError(502, 'Invalid session response.');
      sessionStorage.setItem(TOKEN_KEY, data.token); setRefreshToken(data.refreshToken); clearReadCache();
    })().finally(() => {refreshing = null;});
  }
  await refreshing;
}

export function revokeCurrentSession() {
  const token = getToken();
  if (token) void fetch(`${API_BASE_URL}/auth/logout`, {method:'POST', headers:{Authorization:`Bearer ${token}`}, keepalive:true}).catch(() => {});
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token=getToken(),ttl=readCacheTtl(path),scope=new Headers(init.headers).get('x-city-id')||cityContext||'';
  if((!init.method||init.method.toUpperCase()==='GET')&&token&&ttl>0&&init.cache!=='no-store')return cachedRead(readCacheKey(path,`${token}\ncity:${scope}`),ttl,signal=>request<T>(path,{...init,signal}),init.signal || undefined);
  return request<T>(path,init);
}
export function primeApiRead(path:string,value:any){const token=getToken();if(token)primeReadCache(readCacheKey(path,`${token}\ncity:${cityContext||''}`),value,readCacheTtl(path));}
async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const version = sessionVersion;
  if (!path.startsWith('/auth/login')) await ensureFreshToken();
  if (version !== sessionVersion) throw new ApiError(401, 'Your session has changed.');
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if(cityContext&&!headers.has('x-city-id')&&/^\/(city|modules|cleanliness-issues|ward-ranking)(?:\/|\?|$)/.test(path))headers.set('x-city-id',cityContext);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(25000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store', signal });
    signal.throwIfAborted();
  } catch (error) {
    if(init.signal?.aborted)throw init.signal.reason || error;
    throw new ApiError(0, 'Unable to connect to the service. Please check your connection and try again. If the problem continues, contact your administrator.');
  }
  const raw = await response.text();
  let body: any;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && token===getToken()) {
      clearToken();
      window.dispatchEvent(new Event('matrixtrack:session-expired'));
    }
    throw new ApiError(response.status, body?.error || body?.message || `Request failed (${response.status})`);
  }
  if (raw && body === null) throw new ApiError(502, 'Backend returned an invalid JSON response. Check the API URL.');
  if(init.method&&!['GET','HEAD'].includes(init.method.toUpperCase())){
    clearReadCache();
    if(/^\/city\/targets(?:\/|\?|$)/.test(path)&&typeof window!=='undefined')window.dispatchEvent(new Event(TARGETS_CHANGED_EVENT));
  }
  return (path.split('?')[0]==='/ward-ranking'&&body ? applyFixedWardWeights(body,cityModules.get(headers.get('x-city-id')||body.cityId||cityContext||'')) : body) as T;
}

export const writeApi = (path: string, method: string, body?: unknown) =>
  api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Fetch every page; failures never masquerade as empty data.
export async function pages(path: string, key: string, pageSizeKey = 'limit'): Promise<any[]> {
  const result: any[] = [];
  let page = 1;
  while (true) {
    const response = await api(`${path}${path.includes('?') ? '&' : '?'}page=${page}&${pageSizeKey}=100`);
    if (!Array.isArray(response?.[key])) throw new Error(`Unexpected response for ${path}: missing ${key}`);
    result.push(...response[key]);
    const totalPages = response.meta?.totalPages ?? response.pagination?.totalPages ?? response.totalPages ?? 1;
    if (page >= totalPages) break;
    page++;
    if (page > 1000) throw new Error(`Too many pages returned by ${path}`);
  }
  return result;
}
