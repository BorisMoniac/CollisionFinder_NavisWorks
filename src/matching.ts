import { ElementRef, normalize } from './domain';
const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
export function guidKey(value: string): string {
  const s=value.trim();
  if(/^[0-3][0-9A-Za-z_$]{21}$/.test(s)) {let v=0n;for(const c of s)v=v*64n+BigInt(alphabet.indexOf(c));return v.toString(16).padStart(32,'0');}
  if(/^[{]?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[}]?$/.test(s))return s.replace(/[{}-]/g,'').toLowerCase();
  return s;
}
export interface ModelEntry<T> {object:T;guids:string[];ids:string[];source:string}
export function resolveElement<T>(ref: ElementRef, entries: ModelEntry<T>[]): ModelEntry<T>[] {
  if(ref.guid) {const key=guidKey(ref.guid);const hits=entries.filter(e=>e.guids.some(g=>guidKey(g)===key));if(hits.length)return hits;return [];}
  const file=(s:string)=>s.replace(/\\/g,'/').split('/').at(-1)!.replace(/\.(ifc|smdx|rvt|nwc|nwd)$/i,'').toLowerCase();
  if(!ref.id||!ref.source)return [];
  return entries.filter(e=>file(e.source)===file(ref.source)&&e.ids.includes(ref.id));
}
export function propertyIdentifiers(value: unknown): {guids:string[];ids:string[]} {
  const out={guids:[] as string[],ids:[] as string[]};const seen=new WeakSet<object>();
  function walk(v: unknown,key='',depth=0) {if(depth>12||v==null)return;
    if(typeof v==='string'||typeof v==='number'){const k=normalize(key);if(/ifcguid|globalid|^guid$|^uuid$/.test(k))out.guids.push(String(v));if(/^(object|element|объект)?id$|идентификаторэлемента/.test(k))out.ids.push(String(v));return;}
    if(typeof v!=='object'||seen.has(v))return;seen.add(v);
    const obj=v as Record<string,unknown>;
    if('$value' in obj)walk(obj.$value,typeof obj.$name==='string'?obj.$name:key,depth+1);
    for(const [k,w] of Object.entries(obj))if(!k.startsWith('$'))walk(w,k,depth+1);
  }walk(value);return out;
}
