import { useEffect } from 'react';
import { ChevronDownIcon, TrashIcon } from '@radix-ui/react-icons';
import type { CustomMaterialCategory } from '../types';
import { customCategoryLocateId, customItemLocateId } from '../customCategories';
import { fieldLocateId, registerLocate } from '../locate';
import { useMaterialDisclosure } from '../useMaterialDisclosure';
import { Field, AutoTextarea } from './ui';
import { ArchiveDragHandle } from './ArchiveDragHandle';
import { reorderItems, type DropPosition } from '../archiveReorder';
import { Hint } from './Hint';

function move<T>(items:T[],index:number,delta:number):T[]{
  const to=index+delta;if(to<0||to>=items.length)return items;
  const next=[...items];[next[index],next[to]]=[next[to],next[index]];return next;
}

function CustomItem({category,item,index,onChange,onRemove,onReorder}:{category:CustomMaterialCategory;item:CustomMaterialCategory['items'][number];index:number;onChange:(item:CustomMaterialCategory['items'][number])=>void;onRemove:()=>void;onReorder:(source:string,target:string,position:DropPosition)=>void}){
  const id=customItemLocateId(category.id,item.id);
  const [open,setOpen,itemProps]=useMaterialDisclosure(id,false);
  useEffect(()=>registerLocate(id,()=>setOpen(true)),[id]);
  return <article className="card variant-custom-item" data-locate={id} {...itemProps}>
    <div className="card-head"><ArchiveDragHandle id={id} label={item.title||`未命名内容 ${index+1}`} onReorder={onReorder}/><button type="button" className="custom-entry-toggle" aria-expanded={open} onClick={event=>setOpen(v=>!v,event.currentTarget)}><ChevronDownIcon/><strong>{item.title||`未命名内容 ${index+1}`}</strong></button><div className="card-actions">
      {!open && <button type="button" className="icon-btn danger" aria-label="从本版移除此内容" title="仅从本版移除，可从素材库补回" onClick={onRemove}><TrashIcon/></button>}
    </div></div>
    {open&&<div className="card-body">
      <Field hint={`仅修改当前投递版本。${category.bodyHint || ''}`} label={category.titleLabel||'标题'} locateId={fieldLocateId(id,'title')} value={item.title} onChange={title=>onChange({...item,title})}/>
      <div className="grid-2">{category.fields.map(field=><Field key={field.id} label={field.label||'未命名字段'} locateId={fieldLocateId(id,`value:${field.id}`)} value={item.values[field.id]??''} onChange={value=>onChange({...item,values:{...item.values,[field.id]:value}})}/>)}</div>
      <label className="field-block" data-locate={fieldLocateId(id,'body')}><span className="field-label">{category.bodyLabel||'正文'}</span><AutoTextarea value={item.body} onChange={body=>onChange({...item,body})} placeholder={category.bodyHint} minRows={3}/></label>
    </div>}
  </article>;
}

export function VariantCustomMaterials({categories,onChange,onSupplement}:{categories:CustomMaterialCategory[];onChange:(categories:CustomMaterialCategory[])=>void;onSupplement:(key:string)=>void}){
  const update=(category:CustomMaterialCategory)=>onChange(categories.map(c=>c.id===category.id?category:c));
  return <div className="variant-custom-categories">
    {categories.map((category,index)=><section className="variant-custom-category" key={category.id} id={`editor-custom-${category.id}`} data-locate={customCategoryLocateId(category.id)} aria-label={category.name||'未命名类别'}>
      <header className="section-head"><h2>{category.name||'未命名类别'} <span className="section-count">{category.items.length}</span></h2><button type="button" className="btn small" onClick={()=>onSupplement(`custom:${category.id}`)}>从素材库补充</button><div className="card-actions"><button type="button" className="icon-btn" aria-label="上移类别" disabled={index===0} onClick={()=>onChange(move(categories,index,-1))}>↑</button><button type="button" className="icon-btn" aria-label="下移类别" disabled={index===categories.length-1} onClick={()=>onChange(move(categories,index,1))}>↓</button><button type="button" className="icon-btn danger" aria-label={`从本版移除${category.name}类别`} onClick={()=>onChange(categories.filter(c=>c.id!==category.id))}><TrashIcon/></button></div></header>
      <Field label="类别名称" locateId={fieldLocateId(customCategoryLocateId(category.id),'name')} value={category.name} onChange={name=>update({...category,name})}/>
      {category.items.map((item,i)=><CustomItem key={item.id} category={category} item={item} index={i} onChange={next=>update({...category,items:category.items.map(x=>x.id===item.id?next:x)})} onRemove={()=>{const items=category.items.filter(x=>x.id!==item.id);onChange(items.length?categories.map(c=>c.id===category.id?{...category,items}:c):categories.filter(c=>c.id!==category.id));}} onReorder={(source,target,position)=>{
        const from=category.items.find(x=>customItemLocateId(category.id,x.id)===source);
        const to=category.items.find(x=>customItemLocateId(category.id,x.id)===target);
        if(from&&to)update({...category,items:reorderItems(category.items,from.id,to.id,position)});
      }}/>) }
    </section>)}
    <div className="variant-custom-add"><button type="button" className="btn" onClick={()=>onSupplement('custom')}>＋ 从素材库添加类别内容</button><Hint label="添加类别内容说明">奖项、证书等模板类别和自定义类别均可选入。</Hint></div>
  </div>;
}
