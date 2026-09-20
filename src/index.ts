import { mountPanel } from './panel';
import { showMarkers,hideMarkers,focusMarker } from './markers';
function active(ctx:Context):Context {return new Proxy(ctx,{get(target,key){if(key==='app')return ctx.manager.activeApp;if(key==='cadview')return (ctx.manager.activeWindow as CadViewDocumentWindow|undefined)?.context;return Reflect.get(target,key);}});}
let manager: ApplicationManager | undefined;
let parent: HTMLElement | undefined;
let context: Context | undefined;
let current: object | undefined;
let timer: number | undefined;
let panels = new Map<object, {element: HTMLDivElement; ready: Promise<unknown>}>();
async function attach(ctx: Context) {
  const key = ctx.manager.activeApp || ctx.manager;
  current = key;
  let panel = panels.get(key);
  if (!panel) {
    const element = document.createElement('div');
    element.style.height = '100%';
    let markerView: CadViewContext | undefined;
    panel = {element, ready: mountPanel(element, {
      mode: 'Загрузите отчёт или откройте сохранённую сессию',
      markers: (clashes, settings, onSelect, selectedId) => {
        const live = active(ctx);
        if (key !== (ctx.manager.activeApp || ctx.manager)) return '';
        if (markerView && markerView !== live.cadview) hideMarkers({...ctx, cadview: markerView});
        markerView = live.cadview;
        return showMarkers(live, clashes, settings, id => {
          ctx.manager.revealView('nashepo.collision360/collision_panel'); onSelect(id);
        }, selectedId);
      },
      hide: () => {
        const result = hideMarkers({...ctx, cadview: markerView});
        markerView = undefined;
        return result;
      },
      focus: (clash, settings) => focusMarker(active(ctx), clash, settings),
    })};
    panels.set(key, panel);
  }
  parent?.replaceChildren(panel.element);
  await panel.ready;
}
export default {
  open(ctx:Context){ctx.manager.revealView('nashepo.collision360/collision_panel');},
  async mount(ctx:Context){const el=ctx.el as HTMLElement;if(!el)return;
    if (manager !== ctx.manager) {
      clearInterval(timer); panels = new Map(); manager = ctx.manager;
      timer = window.setInterval(() => {
        if (context && parent?.isConnected && current !== (context.manager.activeApp || context.manager))
          void attach(context);
      }, 200);
    }
    parent = el; context = ctx;
    await attach(ctx);
  }
};
