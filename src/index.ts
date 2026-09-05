import { mountPanel } from './panel';
import { showMarkers,hideMarkers,focusMarker } from './markers';
function active(ctx:Context):Context {return new Proxy(ctx,{get(target,key){if(key==='app')return ctx.manager.activeApp;if(key==='cadview')return (ctx.manager.activeWindow as CadViewDocumentWindow|undefined)?.context;return Reflect.get(target,key);}});}
export default {
  open(ctx:Context){ctx.manager.revealView('nashepo.collision360/collision_panel');},
  async mount(ctx:Context){const el=ctx.el as HTMLElement;if(!el)return;const mount=document.createElement('div');mount.style.height='100%';el.replaceChildren(mount);
    await mountPanel(mount,{mode:'Топоматик 360 · локальные отчёты сохраняются в этом браузере',
      markers:(clashes,settings,onSelect,selectedId)=>showMarkers(active(ctx),clashes,settings,id=>{ctx.manager.revealView('nashepo.collision360/collision_panel');onSelect(id);},selectedId),
      hide:()=>hideMarkers(active(ctx)),focus:(clash,settings)=>focusMarker(active(ctx),clash,settings)
    });
  }
};
