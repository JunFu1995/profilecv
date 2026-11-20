import {availableCustomCategories, customItemHasContent} from './customCategories';
import type { Master, Variant, Bullet } from './types';
import { allProjects, createVariant } from './variants';
import { analyzeJd } from './keywords';
export type RecommendationSection = 'work' | 'projects' | 'research' | 'education' | 'publications' | 'skills' | `custom:${string}`;
export interface Recommendation {
  id: string; section: RecommendationSection; title: string; text: string; end: string;
  level: 'recommended' | 'optional'; terms: string[]; reason: string; selected: boolean;
  composed?: boolean;
  userAdjusted?: boolean;
  provenance?: { method: 'quick' | 'ai'; jd: string; text: string; reason: string };
  bullets: { id: string; text: string; terms: string[]; selected?: boolean }[];
}
export function materialCategoryLabels(master:Master):Record<string,string> {
  return {work:'工作经历',projects:'项目经历',research:'科研经历',education:'教育经历',publications:'发表论文',skills:'技能',
    ...Object.fromEntries(availableCustomCategories(master).map(c=>[`custom:${c.id}`,c.name||'未命名类别']))};
}
export function recommendMaterials(master: Master, jd: string): Recommendation[] {
  const rows: Recommendation[] = [];
  const add = (section: RecommendationSection, id: string, title: string, text: string, bullets: Bullet[] = [], end = '') => {
    const terms = analyzeJd(jd, text).present.map(x => x.display);
    rows.push({ section, id, title, text, end, terms, level: terms.length ? 'recommended' : 'optional',
      reason: terms.length ? `命中：${terms.join('、')}` : jd.trim() ? '未命中关键词，不代表不相关，请人工判断。' : '通用版本默认选入。',
      selected: !jd.trim() || terms.length > 0 || section === 'education',
      bullets: bullets.map(b => ({ ...b, selected: true, terms: analyzeJd(jd, b.text).present.map(x => x.display) })).sort((a,b) => b.terms.length-a.terms.length) });
  };
  for (const section of ['work','research'] as const) for (const w of master[section]) add(section,w.id,`${w.company} · ${w.role}`, [w.company,w.role,w.detail,w.summary,...w.bullets.map(b=>b.text)].filter(Boolean).join('\n'),w.bullets,w.end);
  for (const {project:p,company} of allProjects(master)) add('projects',p.id,p.name,[company,p.name,p.role,p.stack,p.situation,p.task,...p.actions.map(b=>b.text),...p.results.map(b=>b.text),p.composed?.text,...(p.composed?.bullets.map(b=>b.text)??[])].filter(Boolean).join('\n'),[...p.actions,...p.results],p.end);
  for (const {project} of allProjects(master)) {
    const row = rows.find(r=>r.section==='projects'&&r.id===project.id);
    if(row && project.composed && (project.composed.mode==='paragraph' ? project.composed.text.trim() : project.composed.bullets.length)) row.composed=true;
  }
  for (const e of master.education) add('education',e.id,`${e.org} · ${[e.role,e.degree].filter(Boolean).join(' · ')}`,[e.org,e.role,e.degree,e.detail,...e.bullets.map(b=>b.text)].join('\n'),e.bullets,e.end);
  for (const p of master.publications) add('publications',p.id,p.title,[p.title,p.venue,p.abstract,p.note].join('\n'));
  for (const s of master.skills) add('skills',s.id,s.label,`${s.label} ${s.value}`);
  for(const c of availableCustomCategories(master)) for(const item of c.items.filter(customItemHasContent))
    add(`custom:${c.id}`,item.id,item.title||c.name,[c.name,item.title,...c.fields.map(f=>item.values[f.id]?.trim()?`${f.label}：${item.values[f.id]}`:''),item.body].filter(Boolean).join('\n'));
  if(jd.trim()) for(const r of rows) {
    if(!r.composed&&r.section!=='education'&&r.bullets.some(b=>b.terms.length)) r.bullets=r.bullets.map(b=>({...b,selected:b.terms.length>0}));
  }
  for(const r of rows) if(jd.trim()) r.provenance={method:'quick',jd:jd.trim(),text:r.text,reason:r.reason};
  return rows.sort((a,b) => {
    if(a.section !== b.section) return Object.keys(materialCategoryLabels(master)).indexOf(a.section)-Object.keys(materialCategoryLabels(master)).indexOf(b.section);
    if(['work','research','education'].includes(a.section)) {
      const date = (v:string) => /至今|现在|present|current/i.test(v) ? 999999 : Number(v.match(/\d{4}/)?.[0] ?? 0)*100+Number(v.match(/\d{4}[./-](\d{1,2})/)?.[1] ?? 0);
      return date(b.end)-date(a.end);
    }
    return b.terms.length-a.terms.length;
  });
}
export function variantFromRecommendations(master: Master, rows: Recommendation[], company: string, role: string, jd: string): Variant {
  const v = createVariant(master, [company,role].filter(Boolean).join(' · ') || '通用简历');
  v.jobTarget = { company, role, jdText: jd, keywords: analyzeJd(jd,'').missing.map(x=>x.display) };
  for(const section of ['work','projects','research','education'] as const) v[section] = rows.filter(r=>r.section===section&&r.selected).map(r=>({groupId:r.id,bullets:r.bullets.filter(b=>b.selected !== false).map(b=>({bulletId:b.id}))}));
  for(const section of ['publications','skills'] as const) v[section]=rows.filter(r=>r.section===section&&r.selected).map(r=>r.id);
  v.custom=availableCustomCategories(master).map(c=>({categoryId:c.id,itemIds:rows.filter(r=>r.section===`custom:${c.id}`&&r.selected).map(r=>r.id)})).filter(c=>c.itemIds.length);
  return v;
}

/** 更新推荐提示时保留人工选择、要点选择和已有排序。 */
export function refreshRecommendations(master: Master, jd: string, previous: Recommendation[]): Recommendation[] {
  const fresh = recommendMaterials(master,jd);
  const key = (r: Recommendation) => `${r.section}:${r.id}`;
  const merged = previous.flatMap(old => {
    const next = fresh.find(r=>key(r)===key(old));
    const p=old.provenance;
    const valid=p&&(p.method==='ai'||p.method==='quick')&&typeof p.jd==='string'&&typeof p.text==='string'&&typeof p.reason==='string';
    return next ? [{...next, ...(valid?{provenance:p,reason:p.reason,level:old.level==='recommended'?'recommended' as const:'optional' as const}:{}), userAdjusted:old.userAdjusted===true, selected:old.selected, bullets:next.bullets.map(b=>({...b,selected:old.bullets.find(x=>x.id===b.id)?.selected??true}))}] : [];
  });
  return [...merged,...fresh.filter(r=>!previous.some(old=>key(old)===key(r)))];
}

/** 从未启用的素材选择单条时，只加入用户点选的这一条。 */
export function toggleRecommendedBullet(row: Recommendation, id: string, selected: boolean): Recommendation {
  return { ...row, selected: selected || row.selected, bullets: row.bullets.map(b => ({
    ...b, selected: b.id === id ? selected : row.selected && b.selected !== false,
  })) };
}
