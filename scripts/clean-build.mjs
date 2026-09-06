import {existsSync,mkdirSync,renameSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=resolve(fileURLToPath(new URL('..',import.meta.url)));
const trashRoot=resolve(projectRoot,'.local','build-trash',String(Date.now()));

for(const name of ['dist','docs']) {
  const target=resolve(projectRoot,name);
  if(!target.startsWith(projectRoot+sep)) throw new Error(`Недопустимый путь сборки: ${target}`);
  if(existsSync(target)) {
    mkdirSync(trashRoot,{recursive:true});
    renameSync(target,resolve(trashRoot,name));
  }
}
