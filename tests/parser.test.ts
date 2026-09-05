// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseReport} from '../src/parser';
import {readSession} from '../src/storage';
import {reportHtml} from '../src/export';
import {guidKey,resolveElement} from '../src/matching';
import {markerPoint,defaultSettings,showMarkers,focusMarker,hideMarkers,warningShapes} from '../src/markers';
import {columnValue,tableColumns} from '../src/columns';
import {rowsForTests,subsetReport,summarize} from '../src/workflow';

const fixture=readFileSync('../ОТЧЕТЫ NAVISWORKS/ЗМ01-100-00.html','utf8');
const xml=`<?xml version="1.0"?><exchange><batchtest><clashtests><clashtest name="Проверка"><clashresults><clashgroup name="Группа А"><clashresults><clashresult name="Коллизия 1" status="new" distance="-0.1" href="img.jpg"><clashpoint><pos3f x="0" y="-1.5" z="4"/></clashpoint><clashobjects><clashobject><objectattribute><name>IfcGUID</name><value>3LBE45tFTCHgZsJcGxf7ep</value></objectattribute><pathlink><node>model.ifc</node></pathlink></clashobject><clashobject><objectattribute><name>GlobalId</name><value>3LBE45tFTCHgZsJcGxf7es</value></objectattribute></clashobject></clashobjects></clashresult></clashresults></clashgroup></clashresults></clashtest><clashtest name="Пустая"/></clashtests></batchtest></exchange>`;

describe('Реальный отчёт пользователя',()=>{
  it('читает все строки, проверки, GUID, координаты и исходные колонки HTML',()=>{
    const report=parseReport(fixture,'ЗМ01-100-00.html');
    const clash=report.tests[0].clashes[0];
    expect(report.tests.length).toBe((fixture.match(/class="testName"/g)||[]).length);
    expect(report.tests.flatMap(test=>test.clashes).length).toBe((fixture.match(/<tr class="(?:contentRow|childRow|childRowLast)">\s*<td/g)||[]).length);
    expect(report.tests[0].name).toBe('ВС-ВС');
    expect(clash.name).toBe('Конфликт12662');
    expect(clash.point).toEqual([-14299.027,15452.733,160.115]);
    expect(clash.elements[0].guid).toBe('3LBE45tFTCHgZsJcGxf7ep');
    expect(clash.elements[1].guid).toBe('3LBE45tFTCHgZsJcGxf7es');
    expect(clash.image).toBe('ЗМ01-100-00_files/cd000001.jpg');
    expect(Object.keys(clash.properties).length).toBeGreaterThan(3);
    expect(clash.enabled).toBe(true);
  });

  it('строит настраиваемую таблицу из полей коллизии и обоих элементов',()=>{
    const report=parseReport(fixture,'ЗМ01-100-00.html');
    const clash=report.tests[0].clashes[0];
    const row={clash,test:report.tests[0].name,number:1};
    const columns=tableColumns([row]);
    expect(columns.some(column=>column.key.startsWith('clash:'))).toBe(true);
    expect(columns.some(column=>column.key.startsWith('e1:prop:'))).toBe(true);
    expect(columns.some(column=>column.key.startsWith('e2:prop:'))).toBe(true);
    expect(columnValue(row,'system:name')).toBe('Конфликт12662');
    expect(columnValue(row,'e1:guid')).toBe('3LBE45tFTCHgZsJcGxf7ep');
  });

  it('сохраняет отключение, отработку, группу и комментарий в переносимой сессии',()=>{
    const report=parseReport(fixture,'test');
    const clash=report.tests[0].clashes[0];
    clash.enabled=false;clash.reviewed=true;clash.note='Решение';clash.group='Группа А';
    expect(readSession(JSON.stringify(report))).toEqual(report);
  });
});

describe('XML и ошибки',()=>{
  it('сохраняет вложенные группы, нулевые координаты и пустые проверки',()=>{const report=parseReport(xml,'a.xml');expect(report.tests).toHaveLength(2);const clash=report.tests[0].clashes[0];expect(clash.group).toBe('Группа А');expect(clash.point).toEqual([0,-1.5,4]);expect(clash.elements[0].source).toBe('model.ifc');expect(clash.elements[1].guid).toBe('3LBE45tFTCHgZsJcGxf7es');});
  it('не подставляет 0 вместо отсутствующих координат',()=>expect(parseReport(xml.replace(' z="4"',''),'a.xml').tests[0].clashes[0].point).toBeUndefined());
  it('отклоняет поврежденный XML, DTD и посторонний HTML',()=>{expect(()=>parseReport('<batchtest>','x.xml')).toThrow();expect(()=>parseReport('<!DOCTYPE a>'+xml,'x.xml')).toThrow();expect(()=>parseReport('<html>hello</html>','x.html')).toThrow();});
  it('не выполняет HTML из отчёта и экранирует экспорт',()=>{const report=parseReport(xml,'<script>alert(1)</script>');report.tests[0].clashes[0].note='<img src=x onerror=alert(1)>';const html=reportHtml(report);expect(html).not.toContain('<script>alert(1)');expect(html).toContain('&lt;img');expect(html).toContain('Поиск по отчёту');const altered=JSON.parse(JSON.stringify(report));altered.images.x='javascript:alert(1)';expect(()=>readSession(JSON.stringify(altered))).toThrow();});
});

describe('Знаки и идентификаторы',()=>{
  it('не теряет регистр IFC GUID и переводит сжатый GUID в UUID',()=>{expect(guidKey('0000000000000000000000')).toBe('0'.repeat(32));expect(guidKey('3$$$$$$$$$$$$$$$$$$$$$')).toBe('f'.repeat(32));expect(guidKey('3LBE45tFTCHgZsJcGxf7ep')).not.toBe(guidKey('3LBE45tFTCHgZsJcGxf7eP'));});
  it('не связывает одинаковые ID из разных моделей',()=>{const ref={guid:'',id:'123',source:'a.ifc',name:'',properties:{}};const entries=[{object:1,guids:[],ids:['123'],source:'a.smdx'},{object:2,guids:[],ids:['123'],source:'b.ifc'}];expect(resolveElement(ref,entries).map(item=>item.object)).toEqual([1]);expect(resolveElement({...ref,guid:'missing'},entries)).toEqual([]);});

  it('рисует цельный знак Robur, белое восклицание, жёлтый выбор и зелёный статус',()=>{
    const clash=parseReport(xml,'x.xml').tests[0].clashes[0];
    clash.reviewed=true;
    const transformed={...defaultSettings(),radius:1,scale:.001,offset:[10,20,30] as [number,number,number]};
    expect(markerPoint(clash,transformed)).toEqual([10,19.9985,30.004]);
    const layers=new Map<string,{items:AnnotationSimple[];layer:AnnotationLayer}>();
    const annotations={get:(id:string)=>layers.get(id)?.layer,create:(id:string)=>{const items:AnnotationSimple[]=[];const layer={add(annotation:AnnotationSimple){items.push(annotation);return annotation;},clear(){items.length=0;},visible:false} as unknown as AnnotationLayer;layers.set(id,{items,layer});return layer;},release:vi.fn()};
    const cadview={annotations,invalidate:vi.fn(),setCameraType:vi.fn(),lookAt:vi.fn()};
    const context={cadview} as unknown as Context;
    expect(showMarkers(context,[clash],defaultSettings(),()=>{},clash.id)).toContain('1');
    const layerLists=[...layers.values()].map(value=>value.items);
    expect(layerLists).toHaveLength(2);
    const selectedLabel=layerLists[1][0];
    expect(selectedLabel.label).toContain('Коллизия 1');
    expect(selectedLabel.label).toContain('ОТРАБОТАНА');
    expect(selectedLabel.labelBackground).toBe('#f2c94c');
    expect(selectedLabel.shapes!.some(shape=>shape.type==='polyline'&&shape.fillColor==='#f2c94c')).toBe(true);
    expect(selectedLabel.shapes!.filter(shape=>shape.type==='polyline'&&shape.fillColor==='#ffffff')).toHaveLength(2);
    expect(warningShapes([0,0,0],1,'#ff0000',true).filter(shape=>shape.type==='line')).toHaveLength(1);
    showMarkers(context,[clash],defaultSettings(),()=>{},'');
    expect(layerLists[0][0].shapes!.some(shape=>shape.type==='polyline'&&shape.fillColor==='#28b94b')).toBe(true);
    expect([...layers.values()].at(-1)!.items).toHaveLength(0);
  });

  it('не рисует отключённую коллизию, приближает справа спереди и удаляет свой слой',()=>{
    vi.useFakeTimers();
    const clash=parseReport(xml,'x.xml').tests[0].clashes[0];
    clash.enabled=false;
    const layers=new Map<string,{items:AnnotationSimple[];layer:AnnotationLayer}>();const released:unknown[]=[];
    const annotations={get:(id:string)=>layers.get(id)?.layer,create:(id:string)=>{const items:AnnotationSimple[]=[];const layer={add(annotation:AnnotationSimple){items.push(annotation);return annotation;},clear(){items.length=0;},visible:false} as unknown as AnnotationLayer;layers.set(id,{items,layer});return layer;},release:(value:unknown)=>released.push(value)};
    const cadview={annotations,invalidate:vi.fn(),setCameraType:vi.fn(),lookAt:vi.fn()};
    const context={cadview} as unknown as Context;
    expect(showMarkers(context,[clash],defaultSettings(),()=>{},clash.id)).toContain('Отключено: 1');
    expect([...layers.values()].flatMap(value=>value.items)).toHaveLength(0);
    clash.enabled=true;focusMarker(context,clash,defaultSettings());
    expect(cadview.setCameraType).toHaveBeenCalledWith('3d');
    expect(cadview.lookAt).toHaveBeenCalledTimes(1);
    const [eye,direction,up,,pivot]=cadview.lookAt.mock.calls[0];
    expect(Math.hypot(eye[0]-pivot[0],eye[1]-pivot[1],eye[2]-pivot[2])).toBeGreaterThan(defaultSettings().radius*9);
    expect(eye[0]).toBeGreaterThan(pivot[0]);expect(eye[1]).toBeLessThan(pivot[1]);expect(eye[2]).toBeGreaterThan(pivot[2]);
    expect(direction[0]).toBeLessThan(0);expect(direction[1]).toBeGreaterThan(0);expect(up).toEqual([0,0,1]);
    hideMarkers(context);expect(released).toHaveLength(2);
    vi.useRealTimers();
  });
});

describe('Рабочие наборы и массовый отчёт',()=>{
  it('считает остаток выбранной проверки и экспортирует только отмеченные коллизии',()=>{
    const report=parseReport(fixture,'ЗМ01-100-00.html');
    const first=report.tests[0];
    first.clashes[0].reviewed=true;
    const rows=rowsForTests(report,new Set([first.id]));
    expect(rows).toHaveLength(first.clashes.length);
    expect(summarize(rows).remaining).toBe(first.clashes.length-1);
    const ids=new Set(first.clashes.slice(0,2).map(clash=>clash.id));
    const selected=subsetReport(report,ids);
    expect(selected.tests.flatMap(test=>test.clashes)).toHaveLength(2);
    expect(selected.tests.flatMap(test=>test.clashes).every(clash=>ids.has(clash.id))).toBe(true);
  });

  it('исключает коллизию из остатка и формирует отчёт с поиском и фильтрами',()=>{
    const report=parseReport(xml,'a.xml');
    const clash=report.tests[0].clashes[0];
    clash.excluded=true;
    expect(summarize(rowsForTests(report,new Set())).remaining).toBe(0);
    expect(summarize(rowsForTests(report,new Set())).excluded).toBe(1);
    const html=reportHtml(report);
    expect(html).toContain('<th>№</th><th>Коллизия</th><th>Проверка</th><th>Состояние</th>');
    expect(html).toContain('data-state="Исключена"');
    expect(html).toContain('Все проверки');
  });
});
