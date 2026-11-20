import type { Master, Variant } from './types';
import { SECTION_KEYS, toggleBullet, toggleGroup, supplementSource, assignProjectsToWork, assignProjectsToIndependent, editableVariantContent, updateVariantContent } from './variants';

/** 先确定项目归属，再解析选中内容，避免带入原公司或覆盖本版文案。 */
export function applyVariantSupplement(master:Master,current:Variant,selected:Variant,projectIds:string[],target?:{kind:'work';workId:string}|{kind:'independent'}):Variant {
 let source=supplementSource(master,current);
 if(target?.kind==='work')source=assignProjectsToWork(source,target.workId,projectIds);
 else if(target?.kind==='independent')source=assignProjectsToIndependent(source,projectIds);
 return updateVariantContent(selected,editableVariantContent(source,{...selected,content:source}));
}

/** 只撤销该次新增的引用，保留之后对既有内容的修改；移除的改写仍可恢复。 */
export function undoSupplement(current:Variant,before:Variant,after:Variant,master:Master):Variant {
 if(current.id!==after.id)return current;
 let next=current;
 for(const section of SECTION_KEYS)for(const group of after[section]){
  const old=before[section].find(g=>g.groupId===group.groupId);
  if(!old){next=toggleGroup(next,master,section,group.groupId,false);continue;}
  for(const b of group.bullets)if(!old.bullets.some(x=>x.bulletId===b.bulletId))next=toggleBullet(next,section,group.groupId,b.bulletId,false);
 }
 for(const section of ['publications','skills'] as const){
  const added=new Set(after[section].filter(id=>!before[section].includes(id)));
  next={...next,[section]:next[section].filter(id=>!added.has(id))};
 }
 const oldCustom=before.custom??[];
 const addedCustom=after.custom??[];
 next={...next,custom:(next.custom??[]).map(c=>({...c,itemIds:c.itemIds.filter(id=>!addedCustom.find(a=>a.categoryId===c.categoryId)?.itemIds.includes(id)||!!oldCustom.find(b=>b.categoryId===c.categoryId)?.itemIds.includes(id))})).filter(c=>c.itemIds.length)};
 return next;
}
