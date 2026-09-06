import {copyFileSync,existsSync,mkdirSync,readdirSync,unlinkSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const pluginUrl='https://borismoniac.github.io/CollisionFinder_NavisWorks/';
const installUrl=`https://360.topomatic.ru/?extensionInstallPath=${encodeURIComponent(pluginUrl)}`;

writeFileSync(resolve(root,'dist','index.html'),`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>НашеПО · Коллизии для Топоматик 360</title>
  <style>
    :root{color-scheme:dark;font:17px/1.55 system-ui,sans-serif;background:#11151b;color:#eef2f7}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px}main{width:min(780px,100%);padding:42px;border:1px solid #303947;border-radius:18px;background:#1a2029;box-shadow:0 18px 60px #0008}h1{margin:0 0 8px;font-size:clamp(28px,5vw,46px)}p{color:#bac5d3}.address-label{display:block;margin:28px 0 7px;color:#eef2f7;font-weight:700}.address{display:grid;grid-template-columns:1fr auto;gap:8px}.address input{min-width:0;padding:12px 14px;border:1px solid #455265;border-radius:9px;background:#0d1117;color:#eef2f7;font:15px ui-monospace,Consolas,monospace}.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0 28px}.button,button{display:inline-block;padding:12px 18px;border:1px solid transparent;border-radius:9px;background:#f2c94c;color:#16191e;text-decoration:none;font:inherit;font-weight:750;cursor:pointer}.secondary{background:#2a3442;color:#eef2f7}ol{padding-left:24px}small{color:#8794a4}small a{color:#c9d3df}@media(max-width:620px){main{padding:26px}.address{grid-template-columns:1fr}.address input{font-size:12px}}
  </style>
</head>
<body><main>
  <small>Версия 0.5.5</small>
  <h1>НашеПО · Коллизии</h1>
  <p>Плагин для загрузки HTML/XML-отчётов Navisworks, просмотра коллизий и навигации по их координатам в Топоматик 360.</p>
  <label class="address-label" for="plugin-url">Адрес плагина</label>
  <div class="address"><input id="plugin-url" value="${pluginUrl}" readonly><button id="copy-url" type="button">Копировать</button></div>
  <div class="buttons"><a class="button" href="${installUrl}">Открыть установку в веб-версии</a><a class="button secondary" href="https://github.com/BorisMoniac/CollisionFinder_NavisWorks">Исходный код</a></div>
  <ol><li>Откройте в настольном Топоматик 360 раздел <b>Плагины</b>.</li><li>Выберите <b>Установить плагин</b>.</li><li>Скопируйте адрес выше, вставьте его в поле и подтвердите установку.</li><li>После первой установки перезапустите приложение. В веб-версии обновите страницу Топоматик 360.</li><li>Откройте нижнюю вкладку <b>Коллизии</b>.</li></ol>
  <p><small>Разработчик: <a href="https://nashepo.ru/">НашеПО</a> · <a href="https://t.me/RoburFan">Telegram-сообщество</a></small></p>
</main><script>const input=document.getElementById('plugin-url'),button=document.getElementById('copy-url');button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(input.value)}catch{input.select();document.execCommand('copy')}button.textContent='Скопировано';setTimeout(()=>button.textContent='Копировать',1600)})</script></body></html>\n`,'utf8');

const published=resolve(root,'docs');
const publishedJs=resolve(published,'js');
if(existsSync(publishedJs))for(const entry of readdirSync(publishedJs,{withFileTypes:true}))if(entry.isFile())unlinkSync(resolve(publishedJs,entry.name));
function copyTree(source,target) {
  mkdirSync(target,{recursive:true});
  for(const entry of readdirSync(source,{withFileTypes:true})) {
    const from=resolve(source,entry.name);
    const to=resolve(target,entry.name);
    if(entry.isDirectory())copyTree(from,to);
    else copyFileSync(from,to);
  }
}
copyTree(resolve(root,'dist'),published);
writeFileSync(resolve(published,'.nojekyll'),'','utf8');
