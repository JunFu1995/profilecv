import { publicationCardMeta } from '../publication';
import {availableCustomCategories,customItemHasContent,selectCustomItem} from '../customCategories';
import { useState } from 'react';
import type { Master, SectionKey, Variant } from '../types';
import { pickerGroups } from '../materialGroups';
import { SECTION_KEYS, SECTION_LABEL, toggleBullet, toggleGroup, toggleSkill } from '../variants';

const categories=[...SECTION_KEYS,'publications','skills'] as const;
const labels:Record<string,string>={...SECTION_LABEL,publications:'论文',skills:'技能'};
interface Choice { category:string; groupId:string; bulletId?:string }
const keyOf=(c:Choice)=>JSON.stringify([c.category,c.groupId,c.bulletId ?? '']);

export function SupplementDialog({master,variant,initialCategory,onApply,onClose,targetWorkId,onOpenMaster}:{master:Master;variant:Variant;initialCategory:string;onApply:(v:Variant, projectIds:string[])=>void;targetWorkId?:string;onOpenMaster?:()=>void;onClose:()=>void}){
 const [initialSection,initialGroup]=initialCategory.split(':');
 const category=initialCategory.startsWith('custom:')?initialCategory:initialSection;
 const independentProjects = category === 'projects' && !targetWorkId;
 const categoryLabels={...labels,...Object.fromEntries(availableCustomCategories(master).map(c=>[`custom:${c.id}`,c.name]))};
 const [query,setQuery]=useState('');
 const [chosen,setChosen]=useState<Record<string,Choice>>({});
 const toggle=(choice:Choice,on:boolean)=>setChosen(prev=>{const next={...prev};if(on)next[keyOf(choice)]=choice;else delete next[keyOf(choice)];return next;});
 const choices=Object.values(chosen);
 const apply=()=>{
  let next=variant;
  for(const c of choices){
   if(c.category.startsWith('custom:'))next=selectCustomItem(next,c.category.slice(7),c.groupId);
   else if(c.category==='skills')next=toggleSkill(next,c.groupId,true);
   else if(c.category==='publications'){if(!next.publications.includes(c.groupId))next={...next,publications:[...next.publications,c.groupId]};}
   else if(c.bulletId)next=toggleBullet(next,c.category as SectionKey,c.groupId,c.bulletId,true);
   else {
    next=toggleGroup(next,master,c.category as SectionKey,c.groupId,true);
    if(c.category==='projects') for(const b of pickerGroups(master,'projects').find(g=>g.id===c.groupId)?.bullets ?? []) next=toggleBullet(next,'projects',c.groupId,b.id,true);
   }
  }
  onApply(next, [...new Set(choices.filter(c=>c.category==='projects').map(c=>c.groupId))]);
 };
 const rows=categories.flatMap<{category:string;id:string;title:string;sub:string;bullets:{id:string;text:string}[];selected:number;total:number;preview?:string;picked?:boolean}>(cat=>{
  if(cat==='skills')return master.skills.filter(s=>!variant.skills.includes(s.id)).map(s=>({category:cat,id:s.id,title:s.label,sub:s.value,bullets:[],selected:0,total:0}));
  if(cat==='publications')return master.publications.filter(p=>!variant.publications.includes(p.id)).map(p=>({category:cat,id:p.id,title:p.title,sub:publicationCardMeta(p).level,bullets:[],selected:0,total:0}));
  return pickerGroups(master,cat).flatMap(g=>{
   const picked=variant[cat].find(p=>p.groupId===g.id);
   const bullets=g.bullets.filter(b=>!picked?.bullets.some(p=>p.bulletId===b.id));
   const moveProject = cat==='projects' && (targetWorkId ? !master.work.find(w=>w.id===targetWorkId)?.projects.some(p=>p.id===g.id) : independentProjects && master.work.some(w=>w.projects.some(p=>p.id===g.id)));
   if(picked && !bullets.length && !moveProject)return [];
   return [{category:cat,id:g.id,title:g.title,sub:g.sub,preview:g.preview,picked:!!picked,bullets,selected:picked?.bullets.length ?? 0,total:g.bullets.length}];
  });
 });
 for(const c of availableCustomCategories(master)) for(const item of c.items.filter(customItemHasContent)){
  if(variant.custom?.find(p=>p.categoryId===c.id)?.itemIds.includes(item.id))continue;
  rows.push({category:`custom:${c.id}`,id:item.id,title:item.title||c.name,sub:c.fields.map(f=>item.values[f.id]?.trim()?`${f.label}：${item.values[f.id]}`:'').filter(Boolean).join(' · '),preview:item.body,bullets:[],selected:0,total:0});
 }
 const shown=rows.filter(r=>(category==='all'||r.category===category||category==='custom'&&r.category.startsWith('custom:'))&&[r.title,r.sub,r.preview ?? '',...(r.category==='publications' ? master.publications.filter(p=>p.id===r.id).flatMap(p=>[p.venue,p.year,p.authors]) : []),...r.bullets.map(b=>b.text)].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 return <div className="modal-mask" role="dialog" aria-modal="true" aria-label="补充素材" onClick={onClose} onKeyDown={e=>{if(e.key==='Escape')onClose();}}>
  <div className="modal supplement-dialog" onClick={e=>e.stopPropagation()}>
   <header className="modal-head"><div><h2>补充{independentProjects ? "独立项目" : categoryLabels[category] ?? "素材"}</h2><p className="modal-sub">{targetWorkId ? `添加到「${master.work.find(w=>w.id===targetWorkId)?.company || '当前公司'}」。已在本版的项目会移动到这里，保留现有文案。` : independentProjects ? '添加到「独立项目」。公司项目将移到独立项目区，保留本版已编辑的内容，不修改素材库。' : '只添加所选内容，保留本版已有文案和顺序。'}</p></div><button className="btn" onClick={onClose}>取消</button></header>
   <div className="supplement-search"><input autoFocus aria-label="搜索待添加素材" placeholder="搜索经历、技术或成果" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <div className="modal-body supplement-list">
    {!shown.length && <p className="vempty">{query?'没有找到匹配素材，试试其他关键词。':'此类别暂无待添加素材。'}{!query && onOpenMaster && <button className="btn" onClick={onOpenMaster}>去素材库添加</button>}</p>}
    {shown.map(r=>{const entryChoices:Choice[]=r.category==='projects'?[{category:r.category,groupId:r.id}]:r.bullets.length?r.bullets.map(b=>({category:r.category,groupId:r.id,bulletId:b.id})):[{category:r.category,groupId:r.id}];const all=entryChoices.every(c=>!!chosen[keyOf(c)]);return <article className="supplement-card" key={r.category+r.id}>
      <div className="supplement-card-head"><div><strong>{r.title||'未命名素材'}</strong>{r.sub && <p>{r.sub}</p>}</div><label><input type="checkbox" checked={all} onChange={e=>{const on=e.target.checked;setChosen(prev=>{const next={...prev};for(const c of entryChoices){if(on)next[keyOf(c)]=c;else delete next[keyOf(c)];}return next;});}}/>选择{r.category==='projects'?'项目':r.bullets.length?'全部待添加要点':''}</label></div>
      <small>{categoryLabels[r.category]} · {r.category==='projects' ? r.picked ? '已在本版 · 保留现有文案' : '未选入本版 · 导入完整项目' : r.selected?`已选 ${r.selected} / ${r.total} 条`:'未选入本版'}{r.category!=='projects' && r.bullets.length?` · ${r.bullets.length} 条可添加`:''}</small>
      {r.category==='projects' || (!r.bullets.length && r.preview) ? <p className="supplement-summary">{r.preview || '尚未填写项目描述，导入后可继续编辑。'}</p> : r.bullets.length>0 && <><p className="supplement-summary">{r.bullets[0].text}</p><details open={initialGroup===r.id?true:undefined}><summary>查看待添加要点</summary>{r.bullets.map(b=>{const c={category:r.category,groupId:r.id,bulletId:b.id};const saved=variant.retainedTexts?.[JSON.stringify([r.category,r.id,b.id])];return <label className="supplement-bullet" key={b.id}><input type="checkbox" checked={!!chosen[keyOf(c)]} onChange={e=>toggle(c,e.target.checked)}/><span>{saved??b.text}{saved!==undefined&&<small> · 将恢复本版改写</small>}</span></label>;})}</details></>}
    </article>;})}
   </div>
   <footer className="modal-foot"><span>待添加 {new Set(choices.map(c=>c.category+':'+c.groupId)).size} 项素材{choices.some(c=>c.bulletId) && <> · {choices.filter(c=>c.bulletId).length} 条要点</>}</span><button className="btn btn-primary" disabled={!choices.length} onClick={apply}>添加所选内容</button></footer>
  </div>
 </div>;
}
