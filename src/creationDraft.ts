import type { Master } from './types';
import type { Recommendation } from './recommendations';
import { refreshRecommendations } from './recommendations';
import type { VariantLayout } from './variantLayout';
import { layoutFor } from './variantLayout';
import { normalizeDoc } from './storage';
const KEY='resume-tool:creation-draft:v1';
export interface CreationDraft { jobId?:string; company:string; role:string; jd:string; rows:Recommendation[]|null; step:'job'|'select'; design:VariantLayout }
export function saveCreationDraft(draft:CreationDraft):boolean {
 try { localStorage.setItem(KEY,JSON.stringify(draft)); return true; } catch { return false; }
}
export function clearCreationDraft():boolean {
 try { localStorage.removeItem(KEY); return true; } catch { return false; }
}
export function loadCreationDraft(master:Master):CreationDraft|null {
 try {
  const raw=localStorage.getItem(KEY);if(!raw)return null;
  const d=JSON.parse(raw);
  if(!d||typeof d.company!=='string'||typeof d.role!=='string'||typeof d.jd!=='string')return null;
  const rows=Array.isArray(d.rows)?d.rows.filter((r:Recommendation)=>r&&typeof r.id==='string'&&typeof r.section==='string'&&typeof r.selected==='boolean'&&Array.isArray(r.bullets)&&r.bullets.every(b=>b&&typeof b.id==='string')):null;
  return {jobId:typeof d.jobId==='string'?d.jobId:undefined,company:d.company,role:d.role,jd:d.jd,rows:rows?refreshRecommendations(master,d.jd,rows):null,step:d.step==='select'&&rows?'select':'job',design:layoutFor(normalizeDoc({...d.design,master:{}}))};
 } catch {return null;}
}
