import { joinProse } from './prose';
import type { Composed, Project, WorkEntry } from './types';
import { starFingerprint } from './ai';
import { researchStar } from './researchStar';

/** 编辑分条成稿时保留模式及既有要点身份。 */
export function editProjectDraft(project: Project, text: string, newId: () => string): Project['composed'] {
  const previous = project.composed;
  return editDraft(previous ?? {mode: 'paragraph', text: '', bullets: [], sourceHash: starFingerprint(project)}, text, newId);
}

export function editDraft(previous: Composed, text: string, newId: () => string): Composed {
  if (previous.mode === 'bullets') return {
    ...previous,
    bullets: text.split('\n').map((text, index) => ({ id: previous.bullets[index]?.id ?? newId(), text })),
  };
  return { mode: 'paragraph', text, bullets: previous?.bullets ?? [], sourceHash: previous.sourceHash };
}

/** 投递版补充原始事实不自动覆盖已写好的成稿。 */
export function editResearchSource(work: WorkEntry, key: keyof NonNullable<WorkEntry['star']>, value: string): Pick<WorkEntry, 'star'> {
  return { star: { ...researchSource(work), [key]: value } };
}

export function hasProjectDraft(project: Project): boolean {
  return project.composed?.mode === 'paragraph' ? !!project.composed.text.trim() : !!project.composed?.bullets.some(b => b.text.trim());
}

/** 无成稿时直接整理已有事实；不写回或覆盖原始素材。 */
export function projectDraftFromSource(project: Project): Composed {
  return { mode: 'paragraph', text: joinProse([project.situation, project.task, ...project.actions.map(b => b.text), ...project.results.map(b => b.text)]), bullets: [], sourceHash: starFingerprint(project) };
}

export function projectDraft(project: Project): Composed {
  return project.composed ?? projectDraftFromSource(project);
}

/** 展示形式在本地转换，不调用 AI，始终以当前编辑的内容为准。 */
export function switchProjectDraftMode(project: Project, mode: Composed['mode'], newId: () => string): Composed {
  return switchDraftMode(projectDraft(project), mode, newId);
}

export function switchDraftMode(current: Composed, mode: Composed['mode'], newId: () => string): Composed {
  if (current.mode === mode) return current;
  if (mode === 'paragraph') return { ...current, mode, text: joinProse(current.bullets.map(b => b.text)) };
  const lines = current.text.split(/\n+|(?<=[。！？；])\s*/u).map(text => text.trim()).filter(Boolean);
  return { ...current, mode, bullets: lines.map((text, i) => ({ id: current.bullets[i]?.id ?? newId(), text })) };
}

/** 旧总结与可见要点合并为默认正文，不修改原始资料。 */
export function researchDraft(work: WorkEntry): Composed {
  if (work.researchDraft) return work.researchDraft;
  const visible = [work.summary ?? '', ...(work.summaryOnly ? [] : work.bullets.map(b => b.text))];
  return { mode: 'paragraph', text: visible.some(text => text.trim()) || work.summaryOnly ? joinProse(visible) : researchDraftFromSource(work).text, bullets: [], sourceHash: researchSourceHash(work) };
}

export function researchSourceHash(work: WorkEntry): string {
  return JSON.stringify(researchSource(work));
}

export function researchDraftFromSource(work: WorkEntry): Composed {
  return { mode: 'paragraph', text: joinProse(Object.values(researchSource(work))), bullets: [], sourceHash: researchSourceHash(work) };
}

export function researchSource(work: WorkEntry): NonNullable<WorkEntry['star']> {
  return work.star ?? {...researchStar(work), action: work.bullets.map(b => b.text).filter(Boolean).join('\n')};
}

/** 简历、导入预览和检查统一使用当前选择的展示内容。 */
export function projectDisplayDraft(project: Project): Composed {
  if (project.display !== 'star') return projectDraft(project);
  return {mode:'bullets',text:'',sourceHash:starFingerprint(project),bullets:[
    {id:`${project.id}::situation`,text:project.situation},
    {id:`${project.id}::task`,text:project.task},
    ...project.actions, ...project.results,
  ]};
}

/** 改写只更新当前总结，保留展示形式、STAR、原始指纹和条目身份。 */
export function rewriteProjectDraft(project: Project, text: string, newId: () => string): Pick<Project, 'composed'> {
  return {composed:editDraft(projectDraft(project),text,newId)};
}

/** 当前科研展示内容，供检查、翻译和素材预览共用。 */
export function researchDisplayDraft(work: WorkEntry): Composed {
  if (work.researchDisplay !== 'star') return researchDraft(work);
  return {mode:'bullets',text:'',sourceHash:researchSourceHash(work),bullets:Object.entries(researchSource(work)).map(([field,text])=>({id:`${work.id}::${field}`,text}))};
}
