import { Clash } from './domain';

export interface CollisionRow { clash:Clash; test:string; testId?:string; number:number }
export interface TableColumn { key:string; label:string; source:string }

const system:TableColumn[]=[
  {key:'system:number',label:'№',source:'Служебное'},
  {key:'system:enabled',label:'Показывать',source:'Служебное'},
  {key:'system:state',label:'Состояние работы',source:'Служебное'},
  {key:'system:reviewed',label:'Отработана',source:'Служебное'},
  {key:'system:excluded',label:'Исключена',source:'Служебное'},
  {key:'system:name',label:'Наименование конфликта',source:'Коллизия'},
  {key:'system:test',label:'Проверка',source:'Коллизия'},
  {key:'system:status',label:'Статус',source:'Коллизия'},
  {key:'system:group',label:'Группа',source:'Коллизия'},
  {key:'system:note',label:'Комментарий',source:'Коллизия'},
  {key:'system:point',label:'Точка конфликта',source:'Коллизия'},
  {key:'system:distance',label:'Расстояние',source:'Коллизия'},
  {key:'system:date',label:'Дата обнаружения',source:'Коллизия'},
  {key:'system:description',label:'Описание',source:'Коллизия'},
  {key:'e1:source',label:'Источник — элемент 1',source:'Элемент 1'},
  {key:'e1:name',label:'Имя — элемент 1',source:'Элемент 1'},
  {key:'e1:guid',label:'IFC GUID — элемент 1',source:'Элемент 1'},
  {key:'e1:id',label:'ID — элемент 1',source:'Элемент 1'},
  {key:'e2:source',label:'Источник — элемент 2',source:'Элемент 2'},
  {key:'e2:name',label:'Имя — элемент 2',source:'Элемент 2'},
  {key:'e2:guid',label:'IFC GUID — элемент 2',source:'Элемент 2'},
  {key:'e2:id',label:'ID — элемент 2',source:'Элемент 2'}
];

export const defaultVisibleColumnKeys=['system:number','system:state','system:name','system:test','system:status','system:group','system:note','e1:source','e1:guid','e2:source','e2:guid'];

export function tableColumns(rows:CollisionRow[]):TableColumn[] {
  const result=[...system];
  const seen=new Set(result.map(column=>column.key));
  const add=(key:string,label:string,source:string)=>{if(!seen.has(key)){seen.add(key);result.push({key,label,source});}};
  for(const {clash} of rows) {
    for(const key of Object.keys(clash.properties||{})) add(`clash:${key}`,key,'HTML · коллизия');
    clash.elements.forEach((element,index)=>{
      for(const key of Object.keys(element.properties||{})) add(`e${index+1}:prop:${key}`,key,`HTML · элемент ${index+1}`);
    });
  }
  return result;
}

export function columnValue(row:CollisionRow,key:string):string {
  const clash=row.clash;
  const values:Record<string,string>={
    'system:number':String(row.number),
    'system:enabled':clash.enabled?'Да':'Нет',
    'system:state':clash.excluded?'Исключена':clash.reviewed?'Отработана':'В работе',
    'system:reviewed':clash.reviewed?'Да':'Нет',
    'system:excluded':clash.excluded?'Да':'Нет',
    'system:name':clash.name,
    'system:test':row.test,
    'system:status':clash.status,
    'system:group':clash.group,
    'system:note':clash.note,
    'system:point':clash.point?.map(value=>Number(value.toFixed(3))).join('; ')||'',
    'system:distance':clash.distance,
    'system:date':clash.date,
    'system:description':clash.description,
    'e1:source':clash.elements[0].source,
    'e1:name':clash.elements[0].name,
    'e1:guid':clash.elements[0].guid,
    'e1:id':clash.elements[0].id,
    'e2:source':clash.elements[1].source,
    'e2:name':clash.elements[1].name,
    'e2:guid':clash.elements[1].guid,
    'e2:id':clash.elements[1].id
  };
  if(key in values)return values[key];
  if(key.startsWith('clash:'))return clash.properties[key.slice(6)]||'';
  const match=/^e([12]):prop:(.*)$/.exec(key);
  return match?clash.elements[Number(match[1])-1].properties[match[2]]||'':'';
}
