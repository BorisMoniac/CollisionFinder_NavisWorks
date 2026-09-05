import { Report } from './domain';
import { CollisionRow } from './columns';

export interface WorkSummary {total:number;remaining:number;reviewed:number;excluded:number;disabled:number}

export function rowsForTests(report:Report|undefined,testIds:ReadonlySet<string>):CollisionRow[] {
  let number=0;
  return report?.tests.flatMap(test=>test.clashes.map(clash=>({clash,test:test.name,testId:test.id,number:++number}))).filter(row=>!testIds.size||testIds.has(row.testId))||[];
}

export function summarize(rows:CollisionRow[]):WorkSummary {
  const clashes=rows.map(row=>row.clash);
  return {total:clashes.length,remaining:clashes.filter(clash=>!clash.reviewed&&!clash.excluded).length,reviewed:clashes.filter(clash=>clash.reviewed&&!clash.excluded).length,excluded:clashes.filter(clash=>clash.excluded).length,disabled:clashes.filter(clash=>!clash.enabled).length};
}

export function subsetReport(report:Report,ids:ReadonlySet<string>):Report {
  if(!ids.size)return structuredClone(report);
  return {...structuredClone(report),tests:report.tests.map(test=>({...structuredClone(test),clashes:test.clashes.filter(clash=>ids.has(clash.id)).map(clash=>structuredClone(clash))})).filter(test=>test.clashes.length>0)};
}
