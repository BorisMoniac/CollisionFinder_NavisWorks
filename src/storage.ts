import { Report } from './domain';

export function normalizeReport(report:Report):Report {
  for(const test of report.tests||[]) for(const clash of test.clashes||[]) {
    clash.properties=clash.properties&&typeof clash.properties==='object'?clash.properties:{};
    clash.enabled=typeof clash.enabled==='boolean'?clash.enabled:true;
    clash.reviewed=Boolean(clash.reviewed);
    clash.excluded=Boolean(clash.excluded);
    clash.note=typeof clash.note==='string'?clash.note:'';
  }
  return report;
}

export function readSession(source: string): Report {
  const report=JSON.parse(source);
  const string=(value:unknown)=>typeof value==='string';
  if(report?.version!==1||!string(report.id)||!string(report.name)||!Array.isArray(report.tests)||!report.images||typeof report.images!=='object'||!Array.isArray(report.warnings)||!report.warnings.every(string)) throw Error('Неверный формат сессии.');
  const ids=new Set<string>();
  for(const test of report.tests) {
    if(!string(test.id)||!string(test.name)||!Array.isArray(test.clashes)) throw Error('Повреждена проверка в сессии.');
    for(const clash of test.clashes) {
      if(!['id','name','status','distance','description','date','image','group','note'].every(key=>string(clash[key]))||typeof clash.reviewed!=='boolean'||(clash.enabled!==undefined&&typeof clash.enabled!=='boolean')||(clash.excluded!==undefined&&typeof clash.excluded!=='boolean')||(clash.properties!==undefined&&(!clash.properties||typeof clash.properties!=='object'||!Object.values(clash.properties).every(string)))||!Array.isArray(clash.elements)||clash.elements.length!==2||ids.has(clash.id)) throw Error('Повреждена коллизия в сессии.');
      ids.add(clash.id);
      if(clash.point!==undefined&&(!Array.isArray(clash.point)||clash.point.length!==3||!clash.point.every(Number.isFinite))) throw Error('Неверные координаты.');
      for(const element of clash.elements) if(!element||!['guid','id','source','name'].every(key=>string(element[key]))||!element.properties||typeof element.properties!=='object'||!Object.values(element.properties).every(string)) throw Error('Повреждены свойства объекта.');
    }
  }
  for(const value of Object.values(report.images)) if(!string(value)||!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(value as string)) throw Error('Неподдерживаемое изображение в сессии.');
  return normalizeReport(report as Report);
}
