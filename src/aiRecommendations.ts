import type { Recommendation } from './recommendations';
/** 仅接受素材 ID、原文证据和 JD 原文证据均有效的推荐。 */
export function validateAiRecommendations(rows: Recommendation[], jd:string, raw:unknown): Recommendation[] {
 if(!Array.isArray(raw))throw new Error('推荐结果格式无效，请重试或改用快速推荐。');
 const choices=new Map<string,{reason:string;bullets:string[]}>();
 for(const item of raw){
  if(!item||typeof item!=='object')continue;
  const r=rows.find(r=>r.id===item.id&&r.section===item.section);
  if(!r||typeof item.evidence!=='string'||!item.evidence.trim()||!r.text.includes(item.evidence)||typeof item.requirement!=='string'||!item.requirement.trim()||!jd.includes(item.requirement)||typeof item.reason!=='string'||!item.reason.trim()||!Array.isArray(item.bulletIds))continue;
  const ids=item.bulletIds.filter((id:unknown):id is string=>typeof id==='string'&&r.bullets.some(b=>b.id===id));
  if(!r.composed&&r.bullets.length&&!ids.length)continue;
  choices.set(`${r.section}:${r.id}`,{reason:`AI 建议：${item.reason.slice(0,300)}\n岗位要求：${item.requirement}\n素材证据：${item.evidence}`,bullets:ids});
 }
 if(!choices.size)throw new Error('未获得可核验的推荐证据，未更改当前选择。请重试或改用快速推荐。');
 return rows.map(r=>{const c=choices.get(`${r.section}:${r.id}`);return {...r,provenance:{method:'ai' as const,jd:jd.trim(),text:r.text,reason:c?.reason??'AI 未推荐，可手动选择。'},selected:!!c||r.section==='education',level:c?'recommended':'optional',reason:c?.reason??(r.section==='education'?'教育信息默认保留。':'AI 未推荐，可手动选择。'),bullets:r.bullets.map(b=>({...b,selected:r.composed||r.section==='education'||!!c?.bullets.includes(b.id)}))};});
}
export function mergeRecommendedAdditions(current:Recommendation[], proposed:Recommendation[]):Recommendation[]{
 return current.map(r=>{const p=proposed.find(x=>x.id===r.id&&x.section===r.section);if(!p?.selected)return r;return {...r,selected:true,reason:p.reason,level:p.level,provenance:p.provenance,bullets:r.bullets.map(b=>({...b,selected:(r.selected&&b.selected!==false)||!!p.bullets.find(x=>x.id===b.id&&x.selected!==false)}))};});
}
