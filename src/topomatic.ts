import { Clash } from './domain';
import { ModelEntry, propertyIdentifiers, resolveElement } from './matching';
export function modelEntries(drawing: Drawing): ModelEntry<DwgLayer>[] {
  const entries: ModelEntry<DwgLayer>[]=[]; const visited=new Set<Drawing>(); const layers=new Set<DwgLayer>();
  function visit(d:Drawing){if(visited.has(d))return;visited.add(d);
    d.layers.forEach(layer=>{if(layers.has(layer))return;layers.add(layer);const ids=propertyIdentifiers(layer.typedProperties());entries.push({object:layer,guids:[layer.UUID,...ids.guids],ids:ids.ids,source:layer.modelName});});
    d.attachments.forEach(a=>{if(a.model)visit(a.model);});
  }visit(drawing);return entries;
}
export async function navigate(ctx: Context, clash: Clash, side: number): Promise<string> {
  const drawing=ctx.app?.model as Drawing|undefined;
  if(!drawing?.layers||!ctx.cadview)throw Error('Откройте IFC или SMDX в Топоматик 360 и сделайте окно модели активным.');
  const entries=modelEntries(drawing); const refs=side===0?clash.elements:[clash.elements[side-1]];
  const matches=refs.map(r=>resolveElement(r,entries));
  if(matches.some(m=>m.length>1))throw Error('Найдено несколько объектов с одинаковым идентификатором. Уточните состав открытой модели.');
  const found=matches.flat().map(m=>m.object);
  if(!found.length)throw Error(`Объекты не найдены среди ${entries.length} слоёв модели. Проверьте IFC GUID и соответствие отчёта открытым файлам.`);
  await ctx.manager.eval('ru.albatros.wdx/wdx:layers:activate',{layer:found[0]});
  await ctx.manager.broadcast('wdx:onView:layers:select' as Broadcast,{layers:found,cadview:ctx.cadview});
  return found.length===refs.length?`Выделено объектов: ${found.length}.`:`Найден только ${matches[0].length?'первый':'второй'} объект пары; другой отсутствует в модели.`;
}
