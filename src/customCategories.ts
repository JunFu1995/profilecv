import type { CustomMaterialCategory, Master, Variant } from './types';

export const customCategoryLocateId = (categoryId: string) => `custom:${categoryId}`;
export const customItemLocateId = (categoryId: string, itemId: string) => `custom-item:${JSON.stringify([categoryId,itemId])}`;
export const customItemHasContent = (item: CustomMaterialCategory['items'][number]) =>
  !!(item.title.trim() || item.body.trim() || Object.values(item.values).some(value=>value.trim()));
export const availableCustomCategories = (master: Master) => (master.customCategories??[])
  .filter(c=>!master.hiddenCategories?.includes(customCategoryLocateId(c.id)));
export const customSelection = (categories: CustomMaterialCategory[]) => categories.map(c=>({categoryId:c.id,itemIds:c.items.map(i=>i.id)}));

export function resolveCustomCategories(master:Master, variant:Variant):CustomMaterialCategory[] {
  return (variant.custom??[]).flatMap(pick=>{
    const category=(master.customCategories??[]).find(c=>c.id===pick.categoryId);
    if(!category)return [];
    const items=pick.itemIds.flatMap(id=>category.items.find(i=>i.id===id)??[]);
    return items.length?[{...category,items}]:[];
  });
}

/** Local schema, values and order win; add only missing categories/fields/items. */
export function mergeCustomCategories(local:CustomMaterialCategory[], source:CustomMaterialCategory[]):CustomMaterialCategory[] {
  const merge=<T extends {id:string}>(a:T[],b:T[])=>[...a,...b.filter(x=>!a.some(y=>y.id===x.id))];
  return merge(local.map(c=>{
    const original=source.find(s=>s.id===c.id);
    return {...c,fields:merge(c.fields,original?.fields??[]),items:merge(c.items,original?.items??[])};
  }),source);
}

export function selectCustomItem(variant:Variant, categoryId:string, itemId:string):Variant {
  const picks=variant.custom??[];
  const category=picks.find(c=>c.categoryId===categoryId);
  if(category?.itemIds.includes(itemId))return variant;
  return {...variant,custom:category?picks.map(c=>c.categoryId===categoryId?{...c,itemIds:[...c.itemIds,itemId]}:c):[...picks,{categoryId,itemIds:[itemId]}]};
}
