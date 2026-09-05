import { Clash, ClashTest, Report, ElementRef, emptyElement, elementFrom, hash, imageKey, normalize } from './domain';
const text=(el: Element|null|undefined) => el?.textContent?.replace(/\s+/g,' ').trim() ?? '';
const blank=(id: string): Clash => ({id,name:'',status:'',distance:'',description:'',date:'',image:'',group:'',elements:[emptyElement(),emptyElement()],properties:{},enabled:true,reviewed:false,excluded:false,note:''});
function point(s: string): Clash['point'] {
  const values=['X','Y','Z'].map(axis=>s.match(new RegExp(axis+'\\s*:\\s*([-+]?\\d+(?:[.,]\\d+)?(?:[eE][-+]?\\d+)?)','i'))?.[1]);
  return values.every(v=>v!==undefined) ? values.map(v=>Number(v!.replace(',','.'))) as [number,number,number] : undefined;
}
export function parseReport(source: string, name: string): Report {
  if(source.length>100*1024*1024) throw Error('Отчёт больше 100 МБ. Разделите его на несколько проверок.');
  const report: Report={version:1,id:hash(source),name,tests:[],images:{},warnings:[]};
  if(/<\s*(?:\w+:)?(?:batchtest|clashtests|clashresults)\b/i.test(source)) parseXml(source,report);
  else parseHtml(source,report);
  if(!report.tests.length) throw Error('Не найдены проверки Navisworks. Выберите отчёт HTML (табличный) или XML.');
  const clashes=report.tests.flatMap(t=>t.clashes);
  const missing=clashes.filter(c=>c.elements.some(e=>!e.guid)).length;
  if(missing) report.warnings.push(`У ${missing} коллизий нет IFC GUID одного или обоих объектов. Для привязки потребуется совпадение ID и имени модели.`);
  return report;
}
function parseHtml(source: string, report: Report) {
  // Parse in a detached template: imported scripts and images never run or load.
  const template=document.createElement('template'); template.innerHTML=source;
  let testName='Проверка';
  for(const table of template.content.querySelectorAll('table')) {
    if(table.matches('.testSummaryTable')) {testName=text(table.querySelector('.testName'))||testName; continue;}
    if(!table.matches('.mainTable')) continue;
    const test: ClashTest={id:`${report.id}:t${report.tests.length}`,name:testName,clashes:[]};
    const rows=Array.from(table.rows);
    const header=rows.find(r=>Array.from(r.cells).some(c=>c.matches('.item1Header')));
    if(!header) {report.warnings.push(`Не распознаны колонки проверки «${testName}».`); continue;}
    const columns=Array.from(header.cells).flatMap(cell=>Array.from({length:cell.colSpan},()=>({name:text(cell),side:cell.matches('.item1Header')?1:cell.matches('.item2Header')?2:0})));
    let group='';
    for(const row of rows.filter(r=>r.matches('.contentRow,.childRow,.childRowLast,.clashGroupRow'))) {
      const c=blank(`${test.id}:c${test.clashes.length}`);
      const props: [Record<string,string>,Record<string,string>]=[{},{}]; let col=0;
      for(const cell of Array.from(row.cells)) {
        const def=columns[col]; col+=cell.colSpan; if(!def) continue;
        const value=text(cell); const k=normalize(def.name);
        if(def.side) props[def.side-1][def.name]=value;
        else {
          c.properties[def.name]=value;
          if(/наименованиеконфликта|clashname/.test(k)) c.name=value;
        else if(/статус|status/.test(k)) c.status=value;
        else if(/расстояние|distance/.test(k)) c.distance=value;
        else if(/описание|description/.test(k)) c.description=value;
        else if(/датаобнаружения|datefound/.test(k)) c.date=value;
        else if(/точкаконфликта|clashpoint/.test(k)) c.point=point(value);
        }
        const src=cell.querySelector('img')?.getAttribute('src'); if(src) c.image=imageKey(src);
      }
      if(row.matches('.clashGroupRow')) {group=c.name; continue;}
      if(row.matches('.contentRow')) group='';
      c.group=group; c.elements=[elementFrom(props[0]),elementFrom(props[1])];
      if(c.name) test.clashes.push(c);
      if(row.matches('.childRowLast')) group='';
    }
    report.tests.push(test);
  }
}
function parseXml(source: string, report: Report) {
  if(/<!DOCTYPE|<!ENTITY/i.test(source)) throw Error('XML с DTD/ENTITY не поддерживается. Экспортируйте стандартный XML Navisworks.');
  const doc=new DOMParser().parseFromString(source,'application/xml');
  if(doc.querySelector('parsererror')) throw Error('XML повреждён: проверьте закрывающие теги и кодировку.');
  for(const node of doc.querySelectorAll('clashtest')) {
    const test: ClashTest={id:`${report.id}:t${report.tests.length}`,name:node.getAttribute('name')||'Проверка',clashes:[]};
    for(const result of node.querySelectorAll('clashresult')) {
      const c=blank(`${test.id}:c${test.clashes.length}`);
      for(const k of ['name','status','distance'] as const) c[k]=result.getAttribute(k)||'';
      c.description=text(result.querySelector('description')); c.image=imageKey(result.getAttribute('href')||'');
      c.group=result.closest('clashgroup')?.getAttribute('name')||'';
      const date=result.querySelector('createddate date'); c.date=date?['year','month','day'].map(k=>date.getAttribute(k)||'').join('-'):'';
      const pos=result.querySelector('clashpoint pos3f');
      if(pos && ['x','y','z'].every(k=>pos.hasAttribute(k)&&Number.isFinite(Number(pos.getAttribute(k))))) c.point=['x','y','z'].map(k=>Number(pos.getAttribute(k))) as [number,number,number];
      c.properties={Name:c.name,Status:c.status,Distance:c.distance,Description:c.description,'Clash point':c.point?.join('; ')||''};
      const refs: ElementRef[]=Array.from(result.querySelectorAll('clashobjects clashobject')).map(obj=>{
        const props: Record<string,string>={};
        for(const p of obj.querySelectorAll('objectattribute,smarttag')) {
          const key=text(p.querySelector('name')); if(key) props[key]=text(p.querySelector('value'));
        }
        const ref=elementFrom(props);
        const path=Array.from(obj.querySelectorAll('pathlink node')).map(text);
        if(!ref.source) ref.source=path.find(s=>/\.(ifc|smdx|rvt|nwc|nwd)$/i.test(s))||'';
        if(!ref.name) ref.name=text(obj.querySelector('name'))||path.at(-1)||'';
        return ref;
      });
      c.elements=[refs[0]||emptyElement(),refs[1]||emptyElement()]; test.clashes.push(c);
    }
    report.tests.push(test);
  }
}
