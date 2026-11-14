import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Crosshair,Expand,MapPin} from 'lucide-react';
import {geometryPoints,type MapAsset} from '../../services/operationsMap';
import {loadGoogleMaps,GOOGLE_MAPS_AUTH_ERROR} from '../../services/googleMaps';
import {fitGoogleMap,mapEntries,renderGoogleMap,type MapBoundary} from '../../services/googleMapRenderer';
export type {MapBoundary} from '../../services/googleMapRenderer';
const NO_BOUNDARIES:MapBoundary[]=[];

export function CityMap({assets,selected,onSelect,compact=false,boundaries=NO_BOUNDARIES}:{assets:MapAsset[];selected?:string;onSelect:(asset:MapAsset)=>void;compact?:boolean;boundaries?:MapBoundary[]}){
  const host=useRef<HTMLDivElement>(null),map=useRef<google.maps.Map|null>(null),library=useRef<typeof google.maps|null>(null),onPick=useRef(onSelect);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const entries=useMemo(()=>mapEntries(assets),[assets]);onPick.current=onSelect;
  useEffect(()=>{
    let active=true,observer:ResizeObserver|undefined,frame=0,instance:google.maps.Map|undefined;
    setReady(false);setError('');
    const authError=()=>{if(active)setError('Google Maps could not be authorized. Please contact your administrator.');};window.addEventListener(GOOGLE_MAPS_AUTH_ERROR,authError);
    loadGoogleMaps().then(maps=>{
      if(!active||!host.current)return;library.current=maps;
      instance=new maps.Map(host.current,{center:{lat:22.5,lng:79},zoom:5,maxZoom:19,mapTypeId:'roadmap',mapTypeControl:!compact,streetViewControl:false,fullscreenControl:false,zoomControl:!compact,gestureHandling:compact?'none':'greedy',clickableIcons:false});map.current=instance;
      observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(active&&instance){const center=instance.getCenter();maps.event.trigger(instance,'resize');if(center)instance.setCenter(center);}});});observer.observe(host.current);setReady(true);
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Google Maps could not be opened. Please refresh.');});
    return()=>{active=false;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener(GOOGLE_MAPS_AUTH_ERROR,authError);if(instance)library.current?.event.clearInstanceListeners(instance);map.current=null;host.current?.replaceChildren();};
  },[compact]);
  useEffect(()=>{
    if(!ready||!library.current||!map.current)return;
    return renderGoogleMap(library.current,map.current,entries,boundaries,asset=>onPick.current(asset),compact);
  },[entries,boundaries,ready,compact]);
  useEffect(()=>{
    const instance=map.current,maps=library.current,entry=entries.find(e=>e.key===selected);if(!ready||!instance||!maps||!entry)return;
    if(entry.geometry.length){const listener=fitGoogleMap(maps,instance,entry.geometry,17);return ()=>listener?.remove();}else{instance.setCenter({lat:entry.point[0],lng:entry.point[1]});instance.setZoom(Math.max(instance.getZoom()||5,17));}
  },[selected,ready,entries]);
  const fit=()=>{if(map.current&&library.current)fitGoogleMap(library.current,map.current,[...entries.flatMap(e=>e.geometry.length?e.geometry:[e.point]),...boundaries.flatMap(b=>geometryPoints(b.geometry))]);};
  return <div className={`city-map-frame ${compact?'city-map-compact':''}`}><div ref={host} className="city-map-canvas" role="region" aria-label="Google city map with all module locations"/>{!ready&&!error&&<div className="map-loading"><MapPin size={24}/><span>Opening Google Maps...</span></div>}{error&&<div className="map-loading" role="alert">{error}</div>}{ready&&!error&&<div className="map-floating-controls"><button onClick={fit} title="Fit all locations" aria-label="Fit all locations"><Crosshair size={17}/></button>{!compact&&<button aria-label="Toggle full screen map" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void (host.current?.closest('.map-explorer')||host.current?.parentElement)?.requestFullscreen();}}><Expand size={17}/></button>}</div>}</div>;
}
