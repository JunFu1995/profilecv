import {availableCustomCategories, customSelection, resolveCustomCategories, mergeCustomCategories} from './customCategories';
import type {
  Bullet,
  Master,
  WorkEntry,
  PickedBullet,
  PickedGroup,
  Project,
  ResumeView,
  SectionKey,
  Variant,
} from './types';
import { uid } from './id';

export const SECTION_KEYS: SectionKey[] = ['work', 'projects', 'research', 'education'];

export const SECTION_LABEL: Record<SectionKey, string> = {
  work: '工作经历',
  projects: '项目经历',
  research: '科研经历',
  education: '教育经历',
};

export interface ProjectRef {
  project: Project;
  company: string;
  workId?: string;
}

/** 项目散落在各公司下，这里拍平成一份带公司名的列表。 */
export function allProjects(master: Master): ProjectRef[] {
  const out: ProjectRef[] = [];
  for (const w of master.work) {
    for (const p of w.projects) out.push({ project: p, company: w.company, workId: w.id });
  }
  for (const p of master.sideProjects) out.push({ project: p, company: '' });
  return out;
}

export function findProject(master: Master, id: string): ProjectRef | undefined {
  return allProjects(master).find((r) => r.project.id === id);
}

function sectionList(master: Master, section: SectionKey): WorkEntry[] {
  return section === 'research' ? master.research : section === 'work' ? master.work : [];
}

function groupBullets(master: Master, section: SectionKey, groupId: string): Bullet[] {
  if (section === 'work' || section === 'research') {
    return sectionList(master, section).find((w) => w.id === groupId)?.bullets ?? [];
  }
  if (section === 'projects') {
    const ref = findProject(master, groupId);
    return ref ? [...ref.project.actions, ...ref.project.results] : [];
  }
  return master.education.find((g) => g.id === groupId)?.bullets ?? [];
}

function groupLabel(master: Master, section: SectionKey, groupId: string): string {
  if (section === 'work' || section === 'research') {
    return sectionList(master, section).find((w) => w.id === groupId)?.company ?? '';
  }
  if (section === 'projects') {
    const ref = findProject(master, groupId);
    return ref ? ref.project.name : '';
  }
  return master.education.find((g) => g.id === groupId)?.org ?? '';
}

/** 每个 section 可被选择的条目，供通用勾选逻辑使用。 */
export function sectionGroups(master: Master, section: SectionKey): { id: string; bullets: Bullet[] }[] {
  if (section === 'work' || section === 'research') {
    return sectionList(master, section).map((w) => ({ id: w.id, bullets: w.bullets }));
  }
  if (section === 'projects') {
    return allProjects(master).map((r) => ({
      id: r.project.id,
      bullets: [...r.project.actions, ...r.project.results],
    }));
  }
  return master.education.map((g) => ({ id: g.id, bullets: g.bullets }));
}

/** 新建版本 = 先把素材库全选上，再让用户做减法。 */
export function createVariant(master: Master, name: string): Variant {
  const picks = (section: SectionKey): PickedGroup[] =>
    sectionGroups(master, section).map((g) => ({
      groupId: g.id,
      bullets: g.bullets.map((b) => ({ bulletId: b.id })),
    }));

  return {
    id: uid(),
    name,
    createdAt: new Date().toISOString().slice(0, 10),
    jobTarget: { company: '', role: '', jdText: '', keywords: [] },
    summary: '',
    custom: customSelection(availableCustomCategories(master)),
    work: picks('work'),
    projects: picks('projects'),
    research: picks('research'),
    education: picks('education'),
    publications: master.publications.map((p) => p.id),
    skills: master.skills.map((s) => s.id),
  };
}

function applyPicks(source: Bullet[], picks: PickedBullet[]): Bullet[] {
  return picks.flatMap((pb) => {
    const src = source.find((b) => b.id === pb.bulletId);
    const text = (pb.text ?? src?.text ?? '').trim();
    return text ? [{ id: pb.bulletId, text }] : [];
  });
}

/* ---------- 渲染视图 ---------- */

export function buildView(master: Master): ResumeView {
  return {
    customCategories: availableCustomCategories(master),
    basics: master.basics,
    work: master.work.map((w) => ({ ...w, projects: [] })),
    research: master.research.map((w) => ({ ...w, projects: [] })),
    publications: master.publications,
    projects: allProjects(master).map((r) => ({ ...r.project, company: r.company, workId: r.workId })),
    education: master.education,
    skills: master.skills,
  };
}

export function resolveVariant(master: Master, v: Variant): ResumeView {
  master = v.content ?? master;
  const buildExperience = (picks: PickedGroup[], source: WorkEntry[]) =>
    picks.flatMap((pg) => {
      const w = source.find((x) => x.id === pg.groupId);
      if (!w) return [];
      const bullets = applyPicks(w.bullets, pg.bullets);
      // 项目保留所属工作标识，渲染时放回对应公司下。
      if (bullets.length === 0 && !w.company.trim()) return [];
      return [{ ...w, bullets, projects: [] }];
    });

  const work = buildExperience(v.work, master.work);
  const research = buildExperience(v.research, master.research);

  const publications = v.publications
    .map((id) => master.publications.find((p) => p.id === id))
    .filter((p): p is (typeof master.publications)[number] => Boolean(p));

  const projects = v.projects.flatMap((pg) => {
    const ref = findProject(master, pg.groupId);
    if (!ref) return [];
    const actions = applyPicks(ref.project.actions, pg.bullets);
    const results = applyPicks(ref.project.results, pg.bullets);
    if (![ref.project.name, ref.project.situation, ref.project.task, ref.project.stack, ref.project.composed?.text, ...(ref.project.composed?.bullets.map(b => b.text) ?? [])].some(text => text?.trim()) && !actions.length && !results.length) return [];
    return [{ ...ref.project, company: ref.company, workId: ref.workId, actions, results }];
  });

  for (const project of projects) {
    if (!project.workId || work.some(w => w.id === project.workId)) continue;
    const parent = master.work.find(w => w.id === project.workId);
    if (parent) work.push({...parent, bullets: [], projects: []});
  }

  const education = v.education.flatMap((pg) => {
    const g = master.education.find((x) => x.id === pg.groupId);
    if (!g) return [];
    const bullets = applyPicks(g.bullets, pg.bullets);
    if (bullets.length === 0 && !g.org.trim()) return [];
    return [{ ...g, bullets }];
  });

  return {
    customCategories: resolveCustomCategories(master, v),
    basics: { ...master.basics, summary: v.summary.trim() || master.basics.summary },
    work,
    research,
    publications,
    projects,
    education,
    skills: master.skills.filter((s) => v.skills.includes(s.id)),
  };
}

/* ---------- 选择与排序（全部返回新对象） ---------- */

function withSection(v: Variant, section: SectionKey, picks: PickedGroup[]): Variant {
  return { ...v, [section]: picks };
}

function retainText(v: Variant, section: SectionKey, groupId: string, b: {bulletId:string;text?:string}): Variant {
  const retainedTexts={...v.retainedTexts};const key=JSON.stringify([section,groupId,b.bulletId]);
  if(b.text===undefined)delete retainedTexts[key];else retainedTexts[key]=b.text;
  return {...v,retainedTexts};
}
function restoredBullet(v:Variant,section:SectionKey,groupId:string,bulletId:string){
  const text=v.retainedTexts?.[JSON.stringify([section,groupId,bulletId])];
  return {bulletId,...(text===undefined?{}:{text})};
}

export function toggleGroup(v: Variant, master: Master, section: SectionKey, groupId: string, on: boolean): Variant {
  const picks = v[section];
  if (!on) {
    let retained=v;for(const b of picks.find(p=>p.groupId===groupId)?.bullets ?? [])retained=retainText(retained,section,groupId,b);
    return withSection(retained, section, picks.filter((p) => p.groupId !== groupId));
  }
  if (picks.some((p) => p.groupId === groupId)) return v;
  const g = sectionGroups(master, section).find((x) => x.id === groupId);
  if (!g) return v;
  return withSection(v, section, [...picks, { groupId, bullets: g.bullets.map((b) => restoredBullet(v,section,groupId,b.id)) }]);
}

export function toggleBullet(
  v: Variant,
  section: SectionKey,
  groupId: string,
  bulletId: string,
  on: boolean,
): Variant {
  const picks = v[section];
  const index = picks.findIndex((p) => p.groupId === groupId);

  if (index < 0) {
    if (!on) return v;
    return withSection(v, section, [...picks, { groupId, bullets: [restoredBullet(v,section,groupId,bulletId)] }]);
  }

  const pg = picks[index];
  const has = pg.bullets.some((b) => b.bulletId === bulletId);
  if (on === has) return v;

  if(!on) v=retainText(v,section,groupId,pg.bullets.find(b=>b.bulletId===bulletId)!);
  const bullets = on ? [...pg.bullets, restoredBullet(v,section,groupId,bulletId)] : pg.bullets.filter((b) => b.bulletId !== bulletId);
  const next = [...picks];
  next[index] = { ...pg, bullets };
  return withSection(v, section, next);
}

function moveIn<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function moveGroup(v: Variant, section: SectionKey, groupId: string, delta: number): Variant {
  const picks = v[section];
  return withSection(v, section, moveIn(picks, picks.findIndex((p) => p.groupId === groupId), delta));
}

export function moveBullet(
  v: Variant,
  section: SectionKey,
  groupId: string,
  bulletId: string,
  delta: number,
): Variant {
  const picks = v[section];
  const index = picks.findIndex((p) => p.groupId === groupId);
  if (index < 0) return v;
  const pg = picks[index];
  const bullets = moveIn(pg.bullets, pg.bullets.findIndex((b) => b.bulletId === bulletId), delta);
  if (bullets === pg.bullets) return v;
  const next = [...picks];
  next[index] = { ...pg, bullets };
  return withSection(v, section, next);
}

export function setBulletText(
  v: Variant,
  section: SectionKey,
  groupId: string,
  bulletId: string,
  text: string,
): Variant {
  const picks = v[section];
  const index = picks.findIndex((p) => p.groupId === groupId);
  if (index < 0) return v;
  const pg = picks[index];
  const next = [...picks];
  next[index] = { ...pg, bullets: pg.bullets.map((b) => (b.bulletId === bulletId ? { ...b, text } : b)) };
  return withSection(v, section, next);
}

export function clearBulletText(v: Variant, section: SectionKey, groupId: string, bulletId: string): Variant {
  const picks = v[section];
  const index = picks.findIndex((p) => p.groupId === groupId);
  if (index < 0) return v;
  const pg = picks[index];
  const next = [...picks];
  next[index] = {
    ...pg,
    bullets: pg.bullets.map((b) => {
      if (b.bulletId !== bulletId) return b;
      const { text: _drop, ...rest } = b;
      return rest;
    }),
  };
  return withSection(v, section, next);
}

export function toggleSkill(v: Variant, skillId: string, on: boolean): Variant {
  const has = v.skills.includes(skillId);
  if (on === has) return v;
  return { ...v, skills: on ? [...v.skills, skillId] : v.skills.filter((id) => id !== skillId) };
}

/* ---------- 统计与对比 ---------- */

export function variantStats(v: Variant): { groups: number; bullets: number; skills: number } {
  const sections = [v.work, v.projects, v.education];
  return {
    groups: sections.reduce((n, picks) => n + picks.length, 0) + (v.custom??[]).reduce((n,c)=>n+c.itemIds.length,0),
    bullets: sections.reduce((n, picks) => n + picks.reduce((m, p) => m + p.bullets.length, 0), 0),
    skills: v.skills.length,
  };
}

export interface DiffItem {
  section: SectionKey;
  label: string;
  text: string;
}

export interface DiffResult {
  onlyA: DiffItem[];
  onlyB: DiffItem[];
  changed: { label: string; a: string; b: string }[];
}

function collect(master: Master, v: Variant): Map<string, DiffItem> {
  const map = new Map<string, DiffItem>();
  for (const section of SECTION_KEYS) {
    for (const pg of v[section]) {
      const source = groupBullets(master, section, pg.groupId);
      const label = groupLabel(master, section, pg.groupId) || SECTION_LABEL[section];
      for (const pb of pg.bullets) {
        const original = source.find((b) => b.id === pb.bulletId)?.text ?? '';
        const text = (pb.text ?? original).trim();
        if (!text) continue;
        map.set(`${section}:${pg.groupId}:${pb.bulletId}`, { section, label, text });
      }
    }
  }
  return map;
}

export function diffVariants(master: Master, a: Variant, b: Variant): DiffResult {
  const mapA = collect(master, a);
  const mapB = collect(master, b);
  const onlyA: DiffItem[] = [];
  const onlyB: DiffItem[] = [];
  const changed: DiffResult['changed'] = [];

  for (const [key, item] of mapA) {
    const other = mapB.get(key);
    if (!other) onlyA.push(item);
    else if (other.text !== item.text) changed.push({ label: item.label, a: item.text, b: other.text });
  }
  for (const [key, item] of mapB) {
    if (!mapA.has(key)) onlyB.push(item);
  }
  return { onlyA, onlyB, changed };
}

/**
 * 按 JD 相关度重排要点。
 * 只排每个条目内部的要点，不动公司/项目的先后——那通常是倒序时间线，动了会显得不专业。
 */
export function reorderPickedByScore(v: Variant, scoreOf: (bulletId: string) => number): Variant {
  const sortPicks = (picks: PickedGroup[]): PickedGroup[] =>
    picks.map((pg) => ({
      ...pg,
      bullets: [...pg.bullets].sort((a, b) => scoreOf(b.bulletId) - scoreOf(a.bulletId)),
    }));

  return {
    ...v,
    work: sortPicks(v.work),
    projects: sortPicks(v.projects),
    research: sortPicks(v.research),
    education: sortPicks(v.education),
  };
}

/** 把当前选中及改写后的呈现内容转换为独立编辑副本。 */
export function editableVariantContent(master: Master, variant: Variant): Master {
  const view = resolveVariant(master, variant);
  const source = variant.content ?? master;
  const work = view.work.map(w => ({...w, projects: [] as Project[]}));
  const sideProjects: Project[] = [];
  for (const {company: _company, ...project} of view.projects) {
    const owner = source.work.find(w => w.projects.some(p => p.id === project.id));
    const target = work.find(w => w.id === owner?.id);
    if (target) target.projects.push(project);
    else sideProjects.push(project);
  }
  return structuredClone({ basics: view.basics, work, research: view.research,
    sideProjects, customCategories: view.customCategories,
    publications: view.publications, education: view.education, skills: view.skills });
}

export function updateVariantContent(variant: Variant, content: Master): Variant {
  const picks = createVariant(content, variant.name);
  return { ...variant, content: {...content, customCategories: mergeCustomCategories(content.customCategories??[],variant.content?.customCategories??[])}, custom: picks.custom, summary: content.basics.summary,
    work: picks.work, research: picks.research, projects: picks.projects,
    education: picks.education, publications: picks.publications, skills: picks.skills };
}

/** 补充时仅合并可选素材，本版字段及既有要点优先。 */
export function supplementSource(master: Master, variant: Variant): Master {
  const current = editableVariantContent(master, variant);
  const merge = <T extends { id: string }>(local: T[], source: T[]): T[] =>
    [...local, ...source.filter(item => !local.some(existing => existing.id === item.id))];
  const experiences = (local: WorkEntry[], source: WorkEntry[]) => merge(local.map(item => ({
    ...item, bullets: merge(item.bullets, source.find(s => s.id === item.id)?.bullets ?? []),
  })), source.map(item => ({ ...item, projects: [] })));
  const projects = allProjects(master).map(({ project }) => project);
  const currentProjects = allProjects(current).map(({project}) => project);
  const combined = merge(currentProjects.map(item => {
    const source = projects.find(p => p.id === item.id);
    return { ...item, actions: merge(item.actions, source?.actions ?? []), results: merge(item.results, source?.results ?? []) };
  }), projects);
  const work = experiences(current.work, master.work).map(w => ({...w, projects: [] as Project[]}));
  const sideProjects: Project[] = [];
  for (const project of combined) {
    // 已在本版的归属优先，包括用户明确保留为独立项目的选择。
    const ownerSource = currentProjects.some(p => p.id === project.id) ? current : master;
    const owner = ownerSource.work.find(w => w.projects.some(p => p.id === project.id));
    const target = work.find(w => w.id === owner?.id);
    if (target) target.projects.push(project);
    else sideProjects.push(project);
  }
  return { ...current,
    customCategories: mergeCustomCategories(mergeCustomCategories(current.customCategories??[],variant.content?.customCategories??[]),availableCustomCategories(master)),
    work, research: experiences(current.research, master.research), sideProjects,
    education: merge(current.education.map(item => ({ ...item, bullets: merge(item.bullets, master.education.find(e => e.id === item.id)?.bullets ?? []) })), master.education),
    publications: merge(current.publications, master.publications), skills: merge(current.skills, master.skills),
  };
}

/** 导入到指定公司时只移动选中的项目，不复制、改写或修改素材库。 */
export function assignProjectsToWork(content: Master, workId: string, projectIds: string[]): Master {
  if (!content.work.some(w => w.id === workId)) return content;
  const ids = new Set(projectIds);
  const next = structuredClone(content);
  const selected = allProjects(next).map(r => r.project).filter(p => ids.has(p.id));
  next.sideProjects = next.sideProjects.filter(p => !ids.has(p.id));
  next.work = next.work.map(w => ({...w, projects: w.id === workId
    ? [...w.projects, ...selected.filter(p => !w.projects.some(existing => existing.id === p.id))]
    : w.projects.filter(p => !ids.has(p.id)) }));
  return next;
}

/** 独立项目入口明确解除公司归属；在解析视图前执行，避免自动带入原公司。 */
export function assignProjectsToIndependent(content: Master, projectIds: string[]): Master {
  const ids = new Set(projectIds);
  const next = structuredClone(content);
  const selected = allProjects(next).map(r => r.project).filter(p => ids.has(p.id));
  next.work = next.work.map(w => ({...w, projects: w.projects.filter(p => !ids.has(p.id))}));
  next.sideProjects = [...next.sideProjects, ...selected.filter(p => !next.sideProjects.some(existing => existing.id === p.id))];
  return next;
}
