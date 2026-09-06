import {copyFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const apxName='nashepo.collision360.apx';
const pluginUrl='https://borismoniac.github.io/CollisionFinder_NavisWorks/';
const installUrl=`https://360.topomatic.ru/?extensionInstallPath=${encodeURIComponent(pluginUrl)}`;
copyFileSync(resolve(root,'apx',apxName),resolve(root,'dist',apxName));

writeFileSync(resolve(root,'dist','index.html'),`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>НашеПО · Коллизии для Топоматик 360</title>
  <style>
    :root{color-scheme:dark;font:17px/1.55 system-ui,sans-serif;background:#11151b;color:#eef2f7}body{margin:0;min-height:100vh;display:grid;place-items:center}main{width:min(760px,calc(100% - 40px));padding:40px;border:1px solid #303947;border-radius:18px;background:#1a2029;box-shadow:0 18px 60px #0008}h1{margin:0 0 8px;font-size:clamp(28px,5vw,46px)}p{color:#bac5d3}code{padding:.12em .35em;border-radius:5px;background:#0d1117}.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}.button{display:inline-block;padding:12px 18px;border-radius:9px;background:#f2c94c;color:#16191e;text-decoration:none;font-weight:750}.secondary{background:#2a3442;color:#eef2f7}ol{padding-left:24px}small{color:#8794a4}
  </style>
</head>
<body><main>
  <small>Версия 0.5.0</small>
  <h1>НашеПО · Коллизии</h1>
  <p>Плагин для загрузки HTML/XML-отчётов Navisworks, просмотра коллизий и навигации по их координатам в Топоматик 360.</p>
  <div class="buttons"><a class="button" href="${installUrl}">Установить в Топоматик 360</a><a class="button secondary" href="./${apxName}" download>Скачать APX</a><a class="button secondary" href="https://github.com/BorisMoniac/CollisionFinder_NavisWorks">Исходный код</a></div>
  <ol><li>Нажмите <b>Установить в Топоматик 360</b>.</li><li>Подтвердите подключение в открывшемся разделе плагинов.</li><li>После установки откройте нижнюю вкладку <b>Коллизии</b> и загрузите отчёт или сохранённую сессию.</li></ol>
  <p><small>APX предназначен для установки из файла в настольном приложении Топоматик 360.</small></p>
</main></body></html>\n`,'utf8');
