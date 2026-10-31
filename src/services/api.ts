// Database credentials belong to the existing backend, never to this Vite app.
import {cachedRead,clearReadCache,primeReadCache,readCacheKey,readCacheTtl} from './readCache';
import {applyFixedWardWeights} from './wardScoring';
export {clearReadCache};
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/backend').replace(/\/+$/, '');
let cityContext:string|undefined;
export function setApiCityContext(id?:string){if(cityContext!==id){clearReadCache();cityContext=id;}}
const TOKEN_KEY = 'matrixtrack_command_access_token';
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => {clearReadCache();sessionStorage.setItem(TOKEN_KEY, token);};
export const clearToken = () => {cityContext=undefined;clearReadCache();sessionStorage.removeItem(TOKEN_KEY);};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token=getToken(),ttl=readCacheTtl(path);
  if((!init.method||init.method.toUpperCase()==='GET')&&token&&ttl>0&&init.cache!=='no-store')return cachedRead(readCacheKey(path,`${token}\ncity:${cityContext||''}`),ttl,signal=>request<T>(path,{...init,signal}),init.signal || undefined);
  return request<T>(path,init);
}
export function primeApiRead(path:string,value:any){const token=getToken();if(token)primeReadCache(readCacheKey(path,`${token}\ncity:${cityContext||''}`),value,readCacheTtl(path));}
async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if(cityContext&&/^\/(city|modules|cleanliness-issues|ward-ranking)(?:\/|\?|$)/.test(path))headers.set('x-city-id',cityContext);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(25000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store', signal });
    signal.throwIfAborted();
  } catch (error) {
    if(init.signal?.aborted)throw init.signal.reason || error;
    throw new ApiError(0, `Backend se connection nahi hua (${API_BASE_URL}). Check that the backend is running. ${error instanceof Error ? error.message : ''}`);
  }
  const raw = await response.text();
  let body: any;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      clearToken();
      window.dispatchEvent(new Event('matrixtrack:session-expired'));
    }
    throw new ApiError(response.status, body?.error || body?.message || `Request failed (${response.status})`);
  }
  if (raw && body === null) throw new ApiError(502, 'Backend returned an invalid JSON response. Check the API URL.');
  if(init.method&&!['GET','HEAD'].includes(init.method.toUpperCase()))clearReadCache();
  return (path.split('?')[0]==='/ward-ranking'&&body ? applyFixedWardWeights(body) : body) as T;
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
