import {customCategoryLocateId,customItemLocateId} from './customCategories';
import type { Composed, Master } from './types';

export const fieldLocateId = (id: string, field: string): string => `${id}::${field}`;

/** 从外层章节到具体字段，预览与编辑器共用稳定标识。 */
export function locatePath(master: Master, id: string): string[] {
  for(const category of master.customCategories??[]){
    const categoryId=customCategoryLocateId(category.id);
    if(id===categoryId||id===fieldLocateId(categoryId,'name'))return [categoryId,id];
    for(const item of category.items){
      const itemId=customItemLocateId(category.id,item.id);
      if(id===itemId)return [categoryId,itemId];
      if(['title','body',...category.fields.map(f=>`value:${f.id}`)].some(field=>id===fieldLocateId(itemId,field)))return [categoryId,itemId,id];
    }
  }
  if (master.skills.some(s => s.id === id)) return ['skills', id];
  const projectPath = (project: Master['sideProjects'][number], parents: string[]): string[] | null => {
    const path = [...parents, project.id];
    if (project.id === id) return path;
    for (const field of ['name', 'role', 'start', 'end', 'stack', 'summary', 'situation', 'task', 'actions', 'results']) {
      const target = fieldLocateId(project.id, field);
      if (id === target || (field === 'summary' && project.composed?.bullets.some(b => b.id === id)) ||
        ((field === 'actions' || field === 'results') && project[field].some(b => b.id === id))) return [...path, target];
    }
    return null;
  };
  for (const work of [...master.work, ...master.research]) {
    if (work.id === id) return [work.id];
    if (work.bullets.some(b => b.id === id) || work.researchDraft?.bullets.some(b => b.id === id)) return master.work.includes(work) ? [work.id] : [work.id, fieldLocateId(work.id, 'summary')];
    if (['company','role','start','end','location','summary','situation','task','action','result'].some(field => id === fieldLocateId(work.id, field))) return [work.id, id];
    for (const project of work.projects) {
      const path = projectPath(project, [work.id]);
      if (path) return path;
    }
  }
  for (const project of master.sideProjects) {
    const path = projectPath(project, []);
    if (path) return path;
  }
  for (const group of master.education) {
    if (group.bullets.some(b => b.id === id)) return [group.id, id];
  }
  return [id];
}

/** 用条目身份计算编辑框选区，重复文字和空行也能准确定位。 */
export function summarySelection(master: Master, bulletId: string): { start: number; end: number } | undefined {
  const drafts: (Composed | undefined)[] = [
    ...[...master.sideProjects, ...[...master.work, ...master.research].flatMap(w => w.projects)].flatMap(p => p.display === 'star' ? [
      {mode:'bullets' as const,text:'',sourceHash:'',bullets:p.actions},
      {mode:'bullets' as const,text:'',sourceHash:'',bullets:p.results},
    ] : [p.composed]),
    ...master.research.map(w => w.researchDraft),
  ];
  for (const draft of drafts) {
    if (draft?.mode !== 'bullets') continue;
    const index = draft.bullets.findIndex(b => b.id === bulletId);
    if (index < 0) continue;
    const start = draft.bullets.slice(0, index).reduce((offset, b) => offset + b.text.length + 1, 0);
    return { start, end: start + draft.bullets[index].text.length };
  }
}

/**
 * 预览 → 编辑器的定位。卡片挂载时注册「怎么展开自己」，
 * 点击预览里的元素时先展开、再滚动、再闪一下。
 */
type Handler = () => void;

const registry = new Map<string, Set<Handler>>();

export function registerLocate(id: string, expand: Handler): () => void {
  let set = registry.get(id);
  if (!set) {
    set = new Set();
    registry.set(id, set);
  }
  set.add(expand);
  return () => {
    set!.delete(expand);
    if (set!.size === 0) registry.delete(id);
  };
}

let navigation = 0;

export function locate(id: string, opts: { focus?: boolean; path?: string[]; selection?: { start: number; end: number } } = {}): void {
  const current = ++navigation;
  const path = opts.path ?? [id];
  let step = 0;
  const expand = () => {
    if (current !== navigation) return;
    const handlers = registry.get(path[step]);
    if (handlers) for (const fn of handlers) fn();
    step++;
    // 每层提交后再展开下一层，子卡片此时才完成挂载和注册。
    window.setTimeout(() => {
      if (current !== navigation) return;
      if (step < path.length) { expand(); return; }
      const panel = document.querySelector('.panel');
      const el = [...path].reverse().map(target => {
        const field = panel?.querySelector<HTMLElement>(`[data-locate="${CSS.escape(target)}"]`);
        let parent = field?.parentElement;
        while (parent) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
          parent = parent.parentElement;
        }
        return field;
      }).find(target => target && target.getClientRects().length);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('locate-flash');
      void el.offsetWidth;
      el.classList.add('locate-flash');
      window.setTimeout(() => el.classList.remove('locate-flash'), 1500);
      if (opts.focus) {
        const field = Array.from(el.querySelectorAll<HTMLElement>('textarea, input:not([type=checkbox]):not([type=file]):not([type=hidden]), select'))
          .find(field => !field.hasAttribute('disabled') && field.getClientRects().length);
        if (field?.tagName === 'TEXTAREA' && opts.selection) {
          (field as HTMLTextAreaElement).setSelectionRange(opts.selection.start, opts.selection.end);
        }
        field?.focus({ preventScroll: true });
      }
    }, 90);
  };
  expand();
}

let previewTarget: HTMLElement | null = null;
let previewFlash = 0;

export function summaryCaretLine(field: Pick<HTMLTextAreaElement, 'value' | 'selectionStart' | 'selectionEnd' | 'selectionDirection'>): number {
  const caret = field.selectionDirection === 'backward' ? field.selectionStart : field.selectionEnd ?? field.selectionStart;
  return field.value.slice(0, caret).split('\n').length - 1;
}

export function locatePreview(source: HTMLElement, options: { scroll?: 'always' | 'if-changed' } = {}): string | null {
  // 原始 STAR 被合成稿替代时，回退到项目整体；其它字段同样按祖先回退。
  let node: HTMLElement | null = source.closest('[data-locate]');
  while (node) {
    const id = node.dataset.locate!;
    const escaped = CSS.escape(id);
    const line = source.tagName === 'TEXTAREA' ? summaryCaretLine(source as HTMLTextAreaElement) : undefined;
    const selectedLine = line === undefined ? null : document.querySelector<HTMLElement>(`.stage .preview-pages [data-locate="${escaped}"][data-summary-line="${line}"]`);
    // 空行没有预览条目，定位整份总结，不能误选第一条。
    const summaryGroup = selectedLine || !/::(summary|actions|results)$/.test(id) ? null : document.querySelector<HTMLElement>(`.stage .preview-pages [data-summary-group="${escaped}"]`);
    const target = selectedLine ?? summaryGroup ?? document.querySelector<HTMLElement>(`.stage .preview-pages [data-bullet-id="${escaped}"], .stage .preview-pages [data-locate="${escaped}"]`);
    if (target) {
      if (options.scroll !== 'if-changed' || previewTarget !== target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (previewTarget && previewTarget !== target) previewTarget.classList.remove('locate-flash');
      previewTarget = target;
      const flash = ++previewFlash;
      target.classList.remove('locate-flash');
      void target.offsetWidth;
      target.classList.add('locate-flash');
      window.setTimeout(() => { if (flash === previewFlash) target.classList.remove('locate-flash'); }, 1500);
      return id;
    }
    node = node.parentElement?.closest<HTMLElement>('[data-locate]') ?? null;
  }
  return null;
}
