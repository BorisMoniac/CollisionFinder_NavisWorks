import {createServer} from 'vite';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
await mkdir(path.join(root,'.local'),{recursive:true});
await build({entryPoints:['src/parser.ts'],bundle:true,platform:'node',format:'esm',outfile:'.local/parser.mjs'});
const dom=new JSDOM();globalThis.document=dom.window.document;globalThis.DOMParser=dom.window.DOMParser;
const {parseReport}=await import(pathToFileURL(path.join(root,'.local/parser.mjs')).href);
// Only this user-supplied fixture is exposed, on a loopback-only server.
const fixtures=path.resolve(root,'..','ОТЧЕТЫ NAVISWORKS');
let cached;
async function sample(){if(cached)return cached;const name='ЗМ01-100-00.html';const report=parseReport(await readFile(path.join(fixtures,name),'utf8'),name);
 for(const key of new Set(report.tests.flatMap(t=>t.clashes.map(c=>c.image)).filter(Boolean))){const target=path.resolve(fixtures,key);if(!target.startsWith(fixtures+path.sep)||! /\.(jpg|jpeg|png|webp)$/i.test(target))continue;try{const b=await readFile(target);report.images[key]=`data:image/${/\.png$/i.test(key)?'png':/\.webp$/i.test(key)?'webp':'jpeg'};base64,${b.toString('base64')}`;}catch{}}
 cached=report;return report;
}
const server=await createServer({configFile:false,root,server:{host:'127.0.0.1',port:4173,strictPort:true,cors:{origin:['https://360.topomatic.ru','http://localhost:4173','http://127.0.0.1:4173']}},plugins:[{name:'local-fixture',configureServer(s){s.middlewares.use('/sample',async(req,res)=>{try{res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(await sample()));}catch(error){res.statusCode=500;res.end(JSON.stringify({error:error.message}));}});}}]});
await server.listen();console.log('Локальная проверка: http://localhost:4173/preview.html');
