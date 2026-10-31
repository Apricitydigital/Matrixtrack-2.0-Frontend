import {useEffect,useRef,useState} from 'react';
import type {BeatPoint} from '../../types';

/** GeoJSON stores Longitude first; Leaflet and the point editor use Latitude first. */
export function routeCoordinates(geometry:any):[number,number][] {
 if(!geometry)return [];
 if(geometry.type==='Feature')return routeCoordinates(geometry.geometry);
 if(geometry.type==='FeatureCollection')return (geometry.features||[]).flatMap(routeCoordinates);
 if(geometry.type==='GeometryCollection')return (geometry.geometries||[]).flatMap(routeCoordinates);
 const walk=(value:any):[number,number][]=>Array.isArray(value)&&typeof value[0]==='number'&&typeof value[1]==='number'?[[value[1],value[0]]]:Array.isArray(value)?value.flatMap(walk):[];
 return walk(geometry.coordinates).filter(([lat,lng])=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&(lat!==0||lng!==0));
}
export function BeatRouteMap({geometry,points,editable=false,onMove,onAdd}:{geometry:any;points:BeatPoint[];editable?:boolean;onMove?:(index:number,lat:number,lng:number)=>void;onAdd?:(lat:number,lng:number)=>void}){
 const host=useRef<HTMLDivElement>(null),callback=useRef(onMove),add=useRef(onAdd),[error,setError]=useState('');callback.current=onMove;add.current=onAdd;
 const viewport=useRef<{center:import('leaflet').LatLng;zoom:number}|undefined>(undefined);
 useEffect(()=>{
  let disposed=false,map:import('leaflet').Map|undefined;
  Promise.all([import('leaflet'),import('leaflet/dist/leaflet.css')]).then(([L])=>{
   if(disposed||!host.current)return;
   map=L.map(host.current,{scrollWheelZoom:false}).setView([20.59,78.96],4);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
   if(geometry)L.geoJSON(geometry,{style:{color:'#0284c7',weight:4}}).addTo(map);
   const valid=points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180&&(p.lat!==0||p.lng!==0));
   points.forEach((p,i)=>{if(!valid.includes(p))return;const marker=L.marker([p.lat,p.lng],{draggable:editable,icon:L.divIcon({className:'',html:`<span class="beat-point-label">${i+1}</span>`,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(map!);const label=document.createElement('span');label.textContent=p.label;marker.bindTooltip(label);marker.on('dragend',()=>{const v=marker.getLatLng();callback.current?.(i,v.lat,v.lng);});});
   const coords=[...routeCoordinates(geometry),...valid.map(p=>[p.lat,p.lng] as [number,number])];
   if(viewport.current)map.setView(viewport.current.center,viewport.current.zoom);
   else if(coords.length)map.fitBounds(L.latLngBounds(coords),{padding:[28,28],maxZoom:18});else map.setView([20.59,78.96],4);
   if(editable)map.on('click',e=>add.current?.(e.latlng.lat,e.latlng.lng));
   requestAnimationFrame(()=>{if(!disposed)map?.invalidateSize();});
  }).catch(()=>{if(!disposed)setError('Unable to display the route map. Point coordinates remain available below.');});
  return ()=>{disposed=true;if(map){viewport.current={center:map.getCenter(),zoom:map.getZoom()};map.remove();}};
 },[geometry,points,editable]);
 return <div>{error&&<p role="alert">{error}</p>}<div ref={host} className="beat-map" aria-label="Beat route and inspection points map"/></div>;
}
