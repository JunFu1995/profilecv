import type { Master } from './types';
import { uid } from './id';
export interface MaterialTrashItem {id:string;label:string;path:(string|number)[];value:unknown;index:number;deletedAt:string}
/** 只捕获带稳定 ID 的数组条目，避免把正常文案编辑当成删除。 */
export function collectMaterialDeletions(before:Master,after:Master):Master {
 if(after.trashItems?.length===0&&((before.hiddenCategories?.length??0)>0&&(after.hiddenCategories?.length??0)===0||(before.trashItems?.length??0)>0))return after;
 const found:MaterialTrashItem[]=[];
 const walk=(a:unknown,b:unknown,path:(string|number)[])=>{
  if(Array.isArray(a)&&Array.isArray(b)){
   for(let index=0;index<a.length;index++){const value=a[index];if(!value||typeof value!=='object'||typeof value.id!=='string')continue;const other=b.find(x=>x?.id===value.id);if(!other)found.push({id:uid(),label:value.title||value.name||value.company||value.label||value.text||'未命名内容',path,value:structuredClone(value),index,deletedAt:new Date().toISOString()});else walk(value,other,[...path,`@${value.id}`]);}
  }else if(a&&b&&typeof a==='object'&&typeof b==='object')for(const key of Object.keys(a))if(!['trashItems','hiddenCategories','categoryNames'].includes(key))walk((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key],[...path,key]);
 };
 walk(before,after,[]);
 if(before.basics.photo&&!after.basics.photo)found.push({id:uid(),label:'个人照片',path:['basics','photo'],value:before.basics.photo,index:0,deletedAt:new Date().toISOString()});
 return {...after,trashItems:[...(after.trashItems??before.trashItems??[]),...found]};
}
export function restoreMaterialItem(master:Master,id:string):Master|null {
 const item=master.trashItems?.find(i=>i.id===id);if(!item)return null;
 const result=structuredClone(master);let target:unknown=result;
 for(const segment of item.path){
  if(typeof segment==='string'&&segment.startsWith('@'))target=Array.isArray(target)?target.find(x=>x.id===segment.slice(1)):undefined;
  else target=target&&typeof target==='object'?(target as Record<string,unknown>)[segment]:undefined;
  if(target===undefined&&item.path.at(-1)!==segment)return null;
 }
 if(item.path.join('.')==='basics.photo'){if(result.basics.photo)return null;result.basics.photo=item.value as string;}
 else {if(!Array.isArray(target))return null;const value=item.value as {id:string};if(target.some(x=>x.id===value.id))return null;target.splice(Math.min(item.index,target.length),0,item.value);}
 result.trashItems=result.trashItems?.filter(i=>i.id!==id);return result;
}
