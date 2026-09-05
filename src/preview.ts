import {mountPanel} from './panel';
mountPanel(document.querySelector<HTMLElement>('#panel')!,{
 mode:'Локальный просмотр отчётов · 3D-знаки проверяются в Топоматик 360',
 markers:()=>{throw Error('Откройте плагин в Топоматик 360: http://localhost:9091 должен быть запущен.');},
 hide:()=> 'В автономном просмотрщике нет 3D-знаков.',
 focus:()=>{throw Error('Переход к знаку доступен внутри Топоматик 360.');}
});
