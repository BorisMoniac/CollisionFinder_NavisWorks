import { Clash } from './domain';

export type MarkerLabelMode='selected'|'all'|'none';
export interface MarkerSettings {
  radius:number;
  navigationRadius:number;
  scale:number;
  offset:[number,number,number];
  labelMode:MarkerLabelMode;
  showStem:boolean;
  unreviewedColor:string;
  reviewedColor:string;
  selectedColor:string;
}

export const defaultSettings=():MarkerSettings=>({radius:2,navigationRadius:15,scale:1,offset:[0,0,0],labelMode:'selected',showStem:true,unreviewedColor:'#e1372d',reviewedColor:'#28b94b',selectedColor:'#f2c94c'});

export function markerPoint(clash:Clash,settings:MarkerSettings):[number,number,number]|undefined {
  return clash.point?.map((value,index)=>value*settings.scale+settings.offset[index]) as [number,number,number]|undefined;
}

export function validateSettings(settings:MarkerSettings):void {
  if(!Number.isFinite(settings.radius)||settings.radius<0.05||!Number.isFinite(settings.navigationRadius)||settings.navigationRadius<0.5||!Number.isFinite(settings.scale)||settings.scale<=0||!settings.offset.every(Number.isFinite)) throw Error('Размер знака и радиус камеры должны быть положительными, смещения — конечными числами.');
  if(!['selected','all','none'].includes(settings.labelMode)) throw Error('Выбран неверный режим подписей.');
  if(![settings.unreviewedColor,settings.reviewedColor,settings.selectedColor].every(color=>/^#[0-9a-f]{6}$/i.test(color))) throw Error('Цвет знака задан неверно.');
}

const baseLayerId='nashepo.collision360.markers.v4';
const selectedLayerId='nashepo.collision360.selected.v4';
type Shape=AnnotationShapeLine|AnnotationShapePolyline;
interface LayerState {signature:string}
const states=new WeakMap<object,LayerState>();

/** The vertical stem ends exactly at the clash point. There is intentionally no horizontal foot or callout. */
export function warningShapes(point:[number,number,number],radius:number,color:string,showStem:boolean,expanded=false):Shape[] {
  const [x,y,z]=point;
  const front=y-radius*.12;
  const bottom=z+radius*1.9;
  const top=z+radius*5;
  // activeShapes are a deliberately larger copy of the complete sign. This
  // makes its stem, triangle and edges one continuous click target in 3D.
  const grow=expanded?radius*.55:0;
  const half=radius*1.65+grow;
  const shapes:Shape[]=[];
  if(showStem) shapes.push({type:'line',a:[x,y,z],b:[x,y,bottom+radius*.08],color,width:Math.max(expanded?6:2,radius*(expanded?.34:.18))});
  shapes.push({type:'polyline',points:[[x-half-radius*.16,y,bottom-radius*.14-grow],[x+half+radius*.16,y,bottom-radius*.14-grow],[x,y,top+radius*.2+grow],[x-half-radius*.16,y,bottom-radius*.14-grow]],color:'#111111',fillColor:'#111111',width:expanded?8:4});
  shapes.push({type:'polyline',points:[[x-half+radius*.15,y,bottom+radius*.13],[x+half-radius*.15,y,bottom+radius*.13],[x,y,top-radius*.18],[x-half+radius*.15,y,bottom+radius*.13]],color,fillColor:color,width:expanded?5:2});
  const bar=radius*.13;
  shapes.push({type:'polyline',points:[[x-bar,front,z+radius*2.93],[x+bar,front,z+radius*2.93],[x+bar*.72,front,z+radius*4.13],[x-bar*.72,front,z+radius*4.13],[x-bar,front,z+radius*2.93]],color:'#ffffff',fillColor:'#ffffff',width:2});
  const dot=radius*.17;
  shapes.push({type:'polyline',points:[[x-dot,front,z+radius*2.55],[x,front,z+radius*2.38],[x+dot,front,z+radius*2.55],[x,front,z+radius*2.72],[x-dot,front,z+radius*2.55]],color:'#ffffff',fillColor:'#ffffff',width:2});
  return shapes;
}

function markerAnnotation(ctx:Context,clash:Clash,index:number,settings:MarkerSettings,onSelect:(id:string)=>void,color:string,withLabel:boolean):AnnotationSimple {
  const point=markerPoint(clash,settings)!;
  const state=clash.excluded?'  [ИСКЛЮЧЕНА]':clash.reviewed?'  [ОТРАБОТАНА]':'';
  const caption=`#${index+1}  ${clash.name||'Коллизия'}${state}`;
  const activate=()=>{onSelect(clash.id);focusMarker(ctx,clash,settings);};
  const annotation:AnnotationSimple={id:clash.id,type:'simple',position:[point[0],point[1]-settings.radius*.2,point[2]+settings.radius*5.35],shapes:warningShapes(point,settings.radius,color,settings.showStem),activeShapes:warningShapes(point,settings.radius,color,settings.showStem,true),attachment:'above',activateCommand:activate,dblCommand:activate};
  if(withLabel) Object.assign(annotation,{label:caption,description:clash.group||clash.status||'Без статуса',labelColor:color===settings.selectedColor?'#171717':'#ffffff',labelBackground:color});
  return annotation;
}

function baseSignature(clashes:Clash[],settings:MarkerSettings):string {
  return JSON.stringify({clashes:clashes.map(clash=>[clash.id,clash.enabled,clash.reviewed,clash.excluded,clash.name,clash.group,clash.status,clash.point]),settings:{...settings,labelMode:settings.labelMode==='all'?'all':'none'}});
}

export function showMarkers(ctx:Context,clashes:Clash[],settings:MarkerSettings,onSelect:(id:string)=>void,selectedId=''):string {
  validateSettings(settings);
  const cadview=ctx.cadview;
  if(!cadview) throw Error('Создайте или откройте проект Топоматик 360.');
  let base=cadview.annotations.get(baseLayerId);
  if(!base) base=cadview.annotations.create(baseLayerId,1000);
  const oldSelectedLayer=cadview.annotations.get(selectedLayerId);
  if(oldSelectedLayer) cadview.annotations.release(oldSelectedLayer);
  const selectedLayer=cadview.annotations.create(selectedLayerId,10000);
  const signature=baseSignature(clashes,settings);
  if(states.get(cadview as object)?.signature!==signature) {
    base.clear();
    clashes.forEach((clash,index)=>{
      if(!clash.enabled||!markerPoint(clash,settings))return;
      const color=clash.excluded?'#78818c':clash.reviewed?settings.reviewedColor:settings.unreviewedColor;
      base!.add<AnnotationSimple>(markerAnnotation(ctx,clash,index,settings,onSelect,color,settings.labelMode==='all'));
    });
  }
  const selectedIndex=clashes.findIndex(clash=>clash.id===selectedId);
  const selected=clashes[selectedIndex];
  if(selected?.enabled&&markerPoint(selected,settings)) selectedLayer.add<AnnotationSimple>(markerAnnotation(ctx,selected,selectedIndex,settings,onSelect,settings.selectedColor,settings.labelMode==='selected'));
  base.visible=true;selectedLayer.visible=true;
  states.set(cadview as object,{signature});
  cadview.invalidate();
  const enabled=clashes.filter(clash=>clash.enabled&&markerPoint(clash,settings)).length;
  const disabled=clashes.filter(clash=>!clash.enabled).length;
  return `Показано знаков: ${enabled}. Отключено: ${disabled}. Без координат: ${clashes.length-enabled-disabled}.`;
}

export function hideMarkers(ctx:Context):string {
  const cadview=ctx.cadview;
  if(cadview){for(const id of [baseLayerId,selectedLayerId]){const layer=cadview.annotations.get(id);if(layer)cadview.annotations.release(layer);}states.delete(cadview as object);cadview.invalidate();}
  return 'Знаки скрыты.';
}

export function focusMarker(ctx:Context,clash:Clash,settings:MarkerSettings):string {
  validateSettings(settings);
  const point=markerPoint(clash,settings);
  const cadview=ctx.cadview;
  if(!point) throw Error('В отчёте нет координат этой коллизии.');
  if(!cadview) throw Error('Откройте окно проекта Топоматик 360.');
  // A persisted manual value can be smaller than the rendered sign. Keep the
  // requested distance when it is usable, but never fly so close that the
  // warning triangle ends up outside the viewport.
  const radius=Math.max(settings.navigationRadius,settings.radius*9);
  const eye:[number,number,number]=[point[0]+radius*1.35,point[1]-radius*1.35,point[2]+radius*.8];
  const raw:[number,number,number]=[point[0]-eye[0],point[1]-eye[1],point[2]-eye[2]];
  const length=Math.hypot(...raw)||1;
  const direction:[number,number,number]=[raw[0]/length,raw[1]/length,raw[2]/length];
  if(cadview.camera?.id!=='3d')cadview.setCameraType('3d');
  cadview.lookAt(eye,direction,[0,0,1],true,point);
  return `Переход к ${clash.name} с дистанцией ${radius}.`;
}
