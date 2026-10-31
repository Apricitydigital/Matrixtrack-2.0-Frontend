import React, { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { Crosshair, Expand, MapPin } from 'lucide-react';
import { geometryPoints, validCoordinates, type MapAsset } from '../../services/operationsMap';
import { cityFocusPoints, mapClusters } from '../../services/mapView';
import { MODULE_LABELS, statusLabel, statusTone } from '../../services/presentation';
const tones={red:'#cd626b',yellow:'#c9a04c',green:'#4e9c7e',neutral:'#91a0ad'};
export function CityMap({assets,selected,onSelect,compact=false}:{assets:MapAsset[];selected?:string;onSelect:(asset:MapAsset)=>void;compact?:boolean}) {
  const host=useRef<HTMLDivElement>(null),map=useRef<Leaflet.Map|null>(null),library=useRef<typeof Leaflet|null>(null),layers=useRef<Leaflet.FeatureGroup|null>(null),markers=useRef(new Map<string,Leaflet.Layer>()),onPick=useRef(onSelect);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[tilesFailed,setTilesFailed]=useState(false);
  const entries=useMemo(()=>assets.flatMap(asset=>{const geometry=geometryPoints(asset.geometry);const point=asset.coordinates&&validCoordinates(...asset.coordinates)?asset.coordinates:geometry[Math.floor(geometry.length/2)];return point?[{key:asset.key,point,asset,geometry}]:[];}),[assets]);
  onPick.current=onSelect;
  useEffect(()=>{let active=true;let observer:ResizeObserver|undefined;let frame=0;setReady(false);
    Promise.all([import('leaflet'),import('leaflet/dist/leaflet.css')]).then(([L])=>{
      if(!active||!host.current)return;library.current=L;const instance=L.map(host.current,{zoomControl:!compact,scrollWheelZoom:!compact,preferCanvas:true,zoomAnimation:true,markerZoomAnimation:true}).setView([22.5,79],5);map.current=instance;
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,keepBuffer:2,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(instance);
      let loaded=0;tiles.on('tileload',()=>{if(active){loaded++;setTilesFailed(false);}});tiles.on('tileerror',()=>{if(active&&!loaded)setTilesFailed(true);});
      layers.current=L.featureGroup().addTo(instance);observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(active)instance.invalidateSize({pan:false});});});observer.observe(host.current);setReady(true);
    }).catch(()=>{if(active)setError('The map could not be opened. Please refresh.');});
    return()=>{active=false;cancelAnimationFrame(frame);observer?.disconnect();map.current?.remove();map.current=null;};
  },[compact]);
  useEffect(()=>{
    const L=library.current,instance=map.current,group=layers.current;if(!ready||!L||!instance||!group)return;
    const renderer=L.canvas({padding:.5});
    const render=()=>{
      group.clearLayers();markers.current.clear();
      for(const entry of entries)if(entry.geometry.length){try{const a=entry.asset,color=tones[statusTone(a.state)],geo=a.geometry.type==='Feature'||a.geometry.type==='FeatureCollection'?a.geometry:{type:'Feature',properties:{},geometry:a.geometry};const line=L.geoJSON(geo as any,{style:{color,fillColor:color,weight:4,opacity:.95,fillOpacity:.16},renderer} as any).addTo(group);line.on('click',()=>onPick.current(a));markers.current.set(a.key,line);}catch{}}
      const clusters=mapClusters(entries,p=>instance.project(p,instance.getZoom()),compact?46:48);
      for(const cluster of clusters){
        const first=cluster[0],point:[number,number]=[cluster.reduce((n,e)=>n+e.point[0],0)/cluster.length,cluster.reduce((n,e)=>n+e.point[1],0)/cluster.length];
        let marker:Leaflet.Marker;
        if(cluster.length===1){const a=first.asset,label={sweeping:'S',toilets:'T',litter_bins:'B',nala:'N',ctu_gvp:'G'}[a.module];marker=L.marker(point,{title:`${MODULE_LABELS[a.module]}: ${a.name} / ${statusLabel(a.state)}`,keyboard:true,icon:L.divIcon({className:'module-map-marker',html:`<span style="--pin-color:${tones[statusTone(a.state)]}">${label}</span>`,iconSize:[30,38],iconAnchor:[15,34]})}).addTo(group);marker.on('click',()=>onPick.current(a));const tip=document.createElement('span');tip.textContent=`${a.name} / ${MODULE_LABELS[a.module]} / ${statusLabel(a.state)}`;marker.bindTooltip(tip,{direction:'top'});}
        else{
          // Mixed clusters show each status proportion rather than implying every location has one status.
          const counts={red:0,yellow:0,green:0,neutral:0};for(const entry of cluster)counts[statusTone(entry.asset.state)]++;
          let angle=0;const segments=(Object.keys(counts) as (keyof typeof counts)[]).filter(tone=>counts[tone]>0).map(tone=>{const start=angle;angle+=counts[tone]/cluster.length*360;return `${tones[tone]} ${start}deg ${angle}deg`;});
          const background=segments.length===1?tones[statusTone(first.asset.state)]:`conic-gradient(${segments.join(',')})`,labels={red:'Attention required',yellow:'Pending',green:'Approved',neutral:'Not reported'},summary=(Object.keys(counts) as (keyof typeof counts)[]).filter(tone=>counts[tone]>0).map(tone=>`${labels[tone]}: ${counts[tone]}`).join(', ');
          marker=L.marker(point,{title:`${cluster.length} locations. ${summary}. Zoom or choose a location.`,keyboard:true,icon:L.divIcon({className:'city-cluster-marker',html:`<span style="--cluster-color:${background}"><b>${cluster.length}</b></span>`,iconSize:[40,40],iconAnchor:[20,20]})}).addTo(group);
          marker.on('click',()=>{
            const bounds=L.latLngBounds(cluster.map(e=>e.point)),same=cluster.every(e=>e.point[0]===first.point[0]&&e.point[1]===first.point[1]);
            if(!same&&instance.getZoom()<18){instance.fitBounds(bounds,{padding:[55,55],maxZoom:18});return;}
            const box=document.createElement('div');box.className='map-overlap-picker';const title=document.createElement('strong');title.textContent=`${cluster.length} locations in this area`;box.append(title);const select=document.createElement('select');select.size=Math.min(7,cluster.length);select.setAttribute('aria-label','Choose overlapping location');cluster.forEach((entry,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${entry.asset.name} / ${MODULE_LABELS[entry.asset.module]}`;select.append(option);});select.value='0';box.append(select);const button=document.createElement('button');button.textContent='View location';button.onclick=()=>{onPick.current(cluster[Number(select.value)].asset);instance.closePopup();};box.append(button);marker.bindPopup(box,{maxWidth:350}).openPopup();
          });
        }
        const element=marker.getElement();if(element){element.dataset.locationCount=String(cluster.length);element.dataset.mapZoom=String(instance.getZoom());}
        for(const entry of cluster)if(!markers.current.has(entry.key))markers.current.set(entry.key,marker);
      }
    };
    render();instance.on('zoomend',render);
    if(entries.length){const points=cityFocusPoints(entries);instance.invalidateSize({pan:false});instance.fitBounds(L.latLngBounds(points),{padding:[40,40],maxZoom:15,animate:false});}
    return()=>{instance.off('zoomend',render);group.clearLayers();markers.current.clear();if(instance.hasLayer(renderer))instance.removeLayer(renderer);};
  },[entries,ready,compact]);
  useEffect(()=>{
    if(!selected||!map.current)return;const instance=map.current,layer=markers.current.get(selected) as any;if(!layer)return;
    const entry=entries.find(e=>e.key===selected);const frame=requestAnimationFrame(()=>{instance.invalidateSize({pan:false});const animate=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;const bounds=layer.getBounds?.();if(bounds?.isValid())instance.fitBounds(bounds,{padding:[48,48],maxZoom:17,animate});else if(entry)instance.setView(entry.point,Math.max(instance.getZoom(),17),{animate});});return()=>cancelAnimationFrame(frame);
  },[selected,ready,entries]);
  const fit=()=>{if(entries.length&&library.current)map.current?.fitBounds(library.current.latLngBounds(entries.flatMap(e=>e.geometry.length?e.geometry:[e.point])),{padding:[36,36],maxZoom:16});};
  return <div className={`city-map-frame ${compact?'city-map-compact':''}`}><div ref={host} className="city-map-canvas" role="region" aria-label="City map with all module locations"/>{!ready&&!error&&<div className="map-loading"><MapPin size={24}/><span>Opening map...</span></div>}{error&&<div className="map-loading">{error}</div>}{ready&&<div className="map-floating-controls"><button onClick={fit} title="Fit all locations" aria-label="Fit all locations"><Crosshair size={17}/></button>{!compact&&<button aria-label="Toggle full screen map" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void (host.current?.closest('.map-explorer') || host.current?.parentElement)?.requestFullscreen();}}><Expand size={17}/></button>}</div>}{tilesFailed&&<span className="map-tile-warning">Street tiles unavailable. Locations remain visible.</span>}</div>;
}
