import { ArchiveEntry, archiveImage, archiveText, readArchive } from './archive';
import { Report, imageKey } from './domain';
import { parseReport } from './parser';
import { readSession } from './storage';

export async function readClashPackage(buffer:ArrayBuffer):Promise<Report> {
  const entries=readArchive(buffer),manifestEntry=entries.find(entry=>entry.name.toLowerCase()==='manifest.json');
  let reviewName='review.json',reportName='';
  if(manifestEntry){
    const manifest=JSON.parse(archiveText(manifestEntry));
    if(manifest?.format!=='nashepo.clash-package'||manifest.version!==1)throw Error('Неподдерживаемый пакет коллизий.');
    reviewName=String(manifest.files?.review||reviewName);
    reportName=String(manifest.files?.report||'');
  }
  const review=find(entries,reviewName);
  let report:Report;
  if(review)report=readSession(archiveText(review));
  else{
    const source=find(entries,reportName)||entries.find(entry=>/\.(html?|xml)$/i.test(entry.name));
    if(!source)throw Error('В архиве не найден отчёт или review.json.');
    report=parseReport(archiveText(source),source.name);
  }
  await attachImages(report,entries);
  return report;
}

function find(entries:ArchiveEntry[],name:string) {
  const key=imageKey(name);
  return entries.find(entry=>imageKey(entry.name)===key)||entries.find(entry=>imageKey(entry.name).endsWith('/'+key));
}

async function attachImages(report:Report,entries:ArchiveEntry[]) {
  for(const key of new Set(report.tests.flatMap(test=>test.clashes.map(clash=>clash.image)).filter(Boolean))){
    const entry=find(entries,key);
    if(entry&&/\.(jpe?g|png|webp)$/i.test(entry.name))report.images[key]=await archiveImage(entry);
  }
}
