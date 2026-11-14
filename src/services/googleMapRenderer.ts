/// <reference types="google.maps" />
import {boundaryColor,geometryPoints,validCoordinates,type MapAsset} from './operationsMap';
import {cityFocusPoints,mapClusters} from './mapView';
import {MODULE_LABELS,statusLabel,statusTone} from './presentation';

export type MapBoundary={id:string;name:string;geometry:any;derived?:boolean;uploadedWardCount?:number;totalWardCount?:number};
export type MapEntry={key:string;point:[number,number];asset:MapAsset;geometry:[number,number][]};
const tones={red:'#cd626b',yellow:'#c9a04c',green:'#4e9c7e',neutral:'#91a0ad'};
const position=(point:[number,number])=>({lat:point[0],lng:point[1]});
export function mapEntries(assets:MapAsset[]):MapEntry[]{
  return assets.flatMap(asset=>{const geometry=geometryPoints(asset.geometry),point=asset.coordinates&&validCoordinates(...asset.coordinates)?asset.coordinates:geometry[Math.floor(geometry.length/2)];return point?[{key:asset.key,point,asset,geometry}]:[];});
}
export function fitGoogleMap(maps:typeof google.maps,map:google.maps.Map,points:[number,number][],maxZoom=16){
  if(!points.length)return;
  if(points.every(p=>p[0]===points[0][0]&&p[1]===points[0][1])){map.setCenter(position(points[0]));map.setZoom(maxZoom);return;}
  const bounds=new maps.LatLngBounds();points.forEach(p=>bounds.extend(position(p)));
  const listener=maps.event.addListenerOnce(map,'idle',()=>{if((map.getZoom()||0)>maxZoom)map.setZoom(maxZoom);});
  map.fitBounds(bounds,40);
  return listener;
}
function featureList(geometry:any):any[]{
  if(!geometry)return [];
  if(geometry.type==='FeatureCollection')return geometry.features.flatMap((f:any)=>featureList(f));
  if(geometry.type==='Feature')return featureList(geometry.geometry);
  return [{type:'Feature',properties:{},geometry}];
}
function polygonRings(geometry:any):number[][][]{
  if(geometry?.type==='Polygon')return geometry.coordinates;
  if(geometry?.type==='MultiPolygon')return geometry.coordinates.flat();
  return [];
}

/** Native Google overlays preserve polygon holes, RYG routes, and accessible clustered pins. */
export function renderGoogleMap(maps:typeof google.maps,map:google.maps.Map,entries:MapEntry[],boundaries:MapBoundary[],onSelect:(asset:MapAsset)=>void,compact=false){
  const routes=new maps.Data({map}),borders=new maps.Data({map}),tooltip=new maps.InfoWindow({disableAutoPan:true}),picker=new maps.InfoWindow();
  const listeners:google.maps.MapsEventListener[]=[],dashes:google.maps.Polyline[]=[];
  const byKey=new Map(entries.map(e=>[e.key,e.asset]));
  routes.setStyle(feature=>{const color=feature.getProperty('color') as string;return {strokeColor:color,fillColor:color,strokeWeight:4,strokeOpacity:.95,fillOpacity:.16,zIndex:3};});
  for(const entry of entries){
    try{for(const feature of routes.addGeoJson({type:'FeatureCollection',features:featureList(entry.asset.geometry)})){feature.setProperty('assetKey',entry.key);feature.setProperty('color',tones[statusTone(entry.asset.state)]);}}catch{/* A malformed route must not hide its location pin. */}
  }
  listeners.push(routes.addListener('click',(event:google.maps.Data.MouseEvent)=>{const asset=byKey.get(event.feature.getProperty('assetKey') as string);if(asset)onSelect(asset);}));
  const tip=(label:string,where:google.maps.LatLng|null)=>{if(!where)return;const text=document.createElement('span');text.textContent=label;tooltip.setContent(text);tooltip.setPosition(where);tooltip.open({map,shouldFocus:false});};
  borders.setStyle(feature=>({strokeColor:feature.getProperty('color') as string,fillColor:feature.getProperty('color') as string,strokeWeight:3,strokeOpacity:feature.getProperty('derived')?0:1,fillOpacity:.04,zIndex:1}));
  for(const boundary of boundaries){
    const color=boundaryColor(boundary.id),label=boundary.name+(boundary.derived?` (from ${boundary.uploadedWardCount}/${boundary.totalWardCount} wards)`:'');
    for(const feature of borders.addGeoJson({type:'FeatureCollection',features:featureList(boundary.geometry)})){feature.setProperty('color',color);feature.setProperty('label',label);feature.setProperty('derived',!!boundary.derived);}
    if(boundary.derived)for(const ring of polygonRings(boundary.geometry)){
      const line=new maps.Polyline({map,path:ring.map(p=>({lat:p[1],lng:p[0]})),strokeOpacity:0,zIndex:2,icons:[{icon:{path:'M 0,-1 0,1',strokeColor:color,strokeWeight:3,strokeOpacity:1,scale:3},offset:'0',repeat:'12px'}]});
      dashes.push(line);listeners.push(line.addListener('mouseover',(event:google.maps.MapMouseEvent)=>tip(label,event.latLng)),line.addListener('mouseout',()=>tooltip.close()));
    }
  }
  listeners.push(borders.addListener('mouseover',(event:google.maps.Data.MouseEvent)=>tip(event.feature.getProperty('label') as string,event.latLng)),borders.addListener('mouseout',()=>tooltip.close()));

  class Pin extends maps.OverlayView{
    constructor(private point:[number,number],private button:HTMLButtonElement){super();this.setMap(map);}
    onAdd(){this.getPanes()?.overlayMouseTarget.appendChild(this.button);maps.OverlayView.preventMapHitsAndGesturesFrom(this.button);}
    draw(){const pixel=this.getProjection()?.fromLatLngToDivPixel(new maps.LatLng(...this.point));if(pixel){this.button.style.left=`${pixel.x}px`;this.button.style.top=`${pixel.y}px`;}}
    onRemove(){this.button.remove();}
  }
  let pins:Pin[]=[];
  const renderPins=()=>{
    const projection=map.getProjection();if(!projection)return;
    pins.forEach(pin=>pin.setMap(null));pins=[];
    const zoom=map.getZoom()||5,scale=2**zoom;
    const clusters=mapClusters(entries,point=>{const pixel=projection.fromLatLngToPoint(new maps.LatLng(...point))!;return {x:pixel.x*scale,y:pixel.y*scale};},compact?46:48);
    for(const cluster of clusters){
      const first=cluster[0],point:[number,number]=[cluster.reduce((n,e)=>n+e.point[0],0)/cluster.length,cluster.reduce((n,e)=>n+e.point[1],0)/cluster.length];
      const button=document.createElement('button');button.type='button';button.className=`google-map-pin ${cluster.length===1?'module-map-marker':'city-cluster-marker'}`;
      button.dataset.locationCount=String(cluster.length);button.dataset.mapZoom=String(zoom);const span=document.createElement('span');button.appendChild(span);
      if(cluster.length===1){
        const a=first.asset;span.style.setProperty('--pin-color',tones[statusTone(a.state)]);span.textContent={sweeping:'S',toilets:'T',litter_bins:'B',nala:'N',ctu_gvp:'G'}[a.module]||'?';
        button.title=`${a.name} / ${MODULE_LABELS[a.module]} / ${statusLabel(a.state)}`;button.onclick=()=>onSelect(a);
      }else{
        const counts={red:0,yellow:0,green:0,neutral:0};cluster.forEach(e=>counts[statusTone(e.asset.state)]++);
        let angle=0;const segments=(Object.keys(counts) as (keyof typeof counts)[]).filter(t=>counts[t]).map(t=>{const start=angle;angle+=counts[t]/cluster.length*360;return `${tones[t]} ${start}deg ${angle}deg`;});
        span.style.setProperty('--cluster-color',segments.length===1?tones[statusTone(first.asset.state)]:`conic-gradient(${segments.join(',')})`);
        const number=document.createElement('b');number.textContent=String(cluster.length);span.appendChild(number);
        const labels={red:'Attention required',yellow:'Pending',green:'Approved',neutral:'Not reported'};
        button.title=`${cluster.length} locations. `+(Object.keys(counts) as (keyof typeof counts)[]).filter(t=>counts[t]).map(t=>`${labels[t]}: ${counts[t]}`).join(', ');
        button.onclick=()=>{
          if(zoom<18&&cluster.some(e=>e.point[0]!==first.point[0]||e.point[1]!==first.point[1])){const listener=fitGoogleMap(maps,map,cluster.map(e=>e.point),18);if(listener)listeners.push(listener);return;}
          const box=document.createElement('div');box.className='map-overlap-picker';const title=document.createElement('strong');title.textContent=`${cluster.length} locations in this area`;box.appendChild(title);
          const select=document.createElement('select');select.size=Math.min(7,cluster.length);select.setAttribute('aria-label','Choose overlapping location');cluster.forEach((entry,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${entry.asset.name} / ${MODULE_LABELS[entry.asset.module]}`;select.appendChild(option);});select.value='0';box.appendChild(select);
          const view=document.createElement('button');view.type='button';view.textContent='View location';view.onclick=()=>{onSelect(cluster[Number(select.value)].asset);picker.close();};box.appendChild(view);
          picker.setContent(box);picker.setPosition(position(point));picker.open({map,shouldFocus:true});
        };
      }
      button.setAttribute('aria-label',button.title);pins.push(new Pin(point,button));
    }
  };
  renderPins();listeners.push(map.addListener('zoom_changed',renderPins),maps.event.addListenerOnce(map,'idle',renderPins));
  const focus=boundaries.length?[...boundaries.flatMap(b=>geometryPoints(b.geometry)),...entries.map(e=>e.point)]:cityFocusPoints(entries);
  const fitListener=fitGoogleMap(maps,map,focus,15);if(fitListener)listeners.push(fitListener);
  return ()=>{listeners.forEach(listener=>listener.remove());pins.forEach(pin=>pin.setMap(null));dashes.forEach(line=>line.setMap(null));routes.setMap(null);borders.setMap(null);tooltip.close();picker.close();};
}
