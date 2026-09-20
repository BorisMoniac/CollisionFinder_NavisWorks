import { unzipSync } from 'fflate';

export interface ArchiveEntry {
  name:string;
  data:Uint8Array;
}

const allowed=/\.(?:html?|xml|json|jpe?g|png|webp)$/i;

export function readArchive(buffer:ArrayBuffer):ArchiveEntry[] {
  const unpacked=unzipSync(new Uint8Array(buffer),{
    filter:file=>allowed.test(file.name)&&file.originalSize<=100*1024*1024,
  });
  const entries=Object.entries(unpacked).map(([name,data])=>({name:clean(name),data})).filter(entry=>entry.name);
  if(entries.length>5000)throw Error('В архиве слишком много файлов.');
  if(entries.reduce((sum,entry)=>sum+entry.data.length,0)>300*1024*1024)throw Error('Распакованные данные превышают 300 МБ.');
  return entries;
}

export const archiveText=(entry:ArchiveEntry)=>new TextDecoder().decode(entry.data);

export async function archiveImage(entry:ArchiveEntry):Promise<string> {
  const extension=entry.name.split('.').pop()?.toLowerCase(),type=extension==='png'?'image/png':extension==='webp'?'image/webp':'image/jpeg';
  const buffer=entry.data.buffer.slice(entry.data.byteOffset,entry.data.byteOffset+entry.data.byteLength) as ArrayBuffer;
  return await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result as string);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(new Blob([buffer],{type}));
  });
}

function clean(value:string):string {
  const parts=value.replace(/\\/g,'/').split('/').filter(Boolean);
  if(parts.includes('..'))throw Error('Архив содержит небезопасный путь.');
  return parts.join('/');
}
