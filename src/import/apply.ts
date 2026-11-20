import type { Doc, Master } from '../types';
import { editableVariantContent } from '../variants';
import { normalizeDoc } from '../storage';

export const BASIC_FIELDS = ['name','title','email','phone','city','summary'] as const;
export type BasicField = typeof BASIC_FIELDS[number];
/** Existing IDs, custom sections and every delivery version survive an append. */
export function appendImport(doc:Doc, incoming:Master, replaceBasics:BasicField[]):Doc {
  const basics={...doc.master.basics};
  for(const key of BASIC_FIELDS) if(incoming.basics[key].trim() && (!basics[key].trim() || replaceBasics.includes(key))) basics[key]=incoming.basics[key];
  const urls=new Set(basics.links.map(l=>l.url.trim().toLowerCase()));
  basics.links=[...basics.links,...incoming.basics.links.filter(l=>{const key=l.url.trim().toLowerCase();if(!key||urls.has(key))return false;urls.add(key);return true;})];
  const master:Master={...doc.master,basics};
  for(const key of ['work','sideProjects','research','publications','education','skills'] as const) {
    // A category hidden earlier must become accessible when the user imports content into it.
    Object.assign(master,{[key]:[...doc.master[key],...incoming[key]]});
  }
  master.customCategories=[...(doc.master.customCategories??[]),...(incoming.customCategories??[])];
  const names={work:'工作经历',sideProjects:'独立项目',research:'科研经历',publications:'发表论文',education:'教育经历',skills:'技能'};
  master.hiddenCategories=(master.hiddenCategories??[]).filter(name=>!Object.entries(names).some(([key,label])=>name===label&&incoming[key as keyof typeof names].length));
  return {...doc,master,variants:doc.variants.map(v=>v.content?v:{...v,content:editableVariantContent(doc.master,v)})};
}
export interface ImportUndo { before:Doc; after:Doc; wasDemo:boolean }
const UNDO_KEY='resume-tool:v3:import-undo';
export function saveImportUndo(value:ImportUndo):boolean {
  try{localStorage.setItem(UNDO_KEY,JSON.stringify(value));return true;}catch{return false;}
}
export function loadImportUndo():ImportUndo|null {
  try{const raw=JSON.parse(localStorage.getItem(UNDO_KEY)||'null');if(!raw?.before||!raw?.after)return null;return {before:normalizeDoc(raw.before),after:normalizeDoc(raw.after),wasDemo:raw.wasDemo===true};}catch{return null;}
}
export function clearImportUndo():void {try{localStorage.removeItem(UNDO_KEY);}catch{/* The current session still clears its undo action. */}}
