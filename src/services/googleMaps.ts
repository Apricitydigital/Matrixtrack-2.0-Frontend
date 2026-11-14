/// <reference types="google.maps" />

type MapsWindow=Window & {google?:{maps:typeof google.maps};matrixtrackGoogleMapsReady?:()=>void;gm_authFailure?:()=>void};
let loading:Promise<typeof google.maps>|undefined;
export const GOOGLE_MAPS_AUTH_ERROR='matrixtrack:google-maps-auth-error';

/** Both map screens share one on-demand Google Maps script and the browser key. */
export function loadGoogleMaps(key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY):Promise<typeof google.maps>{
  if(typeof window==='undefined')return Promise.reject(new Error('Google Maps needs a browser.'));
  if(!key?.trim())return Promise.reject(new Error('Google Maps is not configured. Please contact your administrator.'));
  const target=window as MapsWindow;
  if(target.google?.maps?.Map)return Promise.resolve(target.google.maps);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
    const script=document.createElement('script');let settled=false;
    const previousAuthFailure=target.gm_authFailure;
    const finish=(error?:Error)=>{
      if(settled)return;settled=true;clearTimeout(timer);
      delete target.matrixtrackGoogleMapsReady;
      if(error){script.remove();loading=undefined;target.gm_authFailure=previousAuthFailure;reject(error);}
      else resolve(target.google!.maps);
    };
    const timer=setTimeout(()=>finish(new Error('Google Maps took too long to load. Please refresh.')),20000);
    target.matrixtrackGoogleMapsReady=()=>target.google?.maps?.Map?finish():finish(new Error('Google Maps could not be opened. Please refresh.'));
    target.gm_authFailure=()=>{
      window.dispatchEvent(new Event(GOOGLE_MAPS_AUTH_ERROR));
      finish(new Error('Google Maps could not be authorized. Please contact your administrator.'));
      previousAuthFailure?.();
    };
    script.id='matrixtrack-google-maps';script.async=true;script.defer=true;
    script.src=`https://maps.googleapis.com/maps/api/js?${new URLSearchParams({key:key.trim(),loading:'async',callback:'matrixtrackGoogleMapsReady',v:'quarterly'})}`;
    const nonce=document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;if(nonce)script.nonce=nonce;
    script.onerror=()=>finish(new Error('Google Maps could not load. Check your connection and refresh.'));
    document.head.appendChild(script);
  });
  return loading;
}
