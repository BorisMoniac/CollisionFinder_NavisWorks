export interface ElementRef { guid: string; id: string; source: string; name: string; properties: Record<string, string> }
export interface Clash { id: string; name: string; status: string; distance: string; description: string; date: string; point?: [number, number, number]; image: string; group: string; elements: [ElementRef, ElementRef]; properties: Record<string,string>; enabled: boolean; reviewed: boolean; excluded: boolean; note: string }
export interface ClashTest { id: string; name: string; clashes: Clash[] }
export interface Report { version: 1; id: string; name: string; tests: ClashTest[]; images: Record<string, string>; warnings: string[] }
export const emptyElement = (): ElementRef => ({guid:'',id:'',source:'',name:'',properties:{}});
export const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function hash(s: string): string { let h=2166136261; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619); return (h>>>0).toString(16); }
export function imageKey(s: string): string { try { s=decodeURIComponent(s); } catch {} return s.trim().replace(/\\/g,'/').replace(/^\.\//,''); }
export function elementFrom(properties: Record<string,string>): ElementRef {
  const entries=Object.entries(properties);
  const find=(re: RegExp) => entries.find(([k])=>re.test(normalize(k)))?.[1] ?? '';
  return {guid:find(/ifcguid|globalid/), id:find(/^(объект)?id$|elementid|идентификаторэлемента/).replace(/^.*?:\s*/,''), source:find(/файлиcточника|файлисточника|sourcefile/), name:find(/ifcname|^name$|^имя$/), properties};
}
