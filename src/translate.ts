import { defaultEnglishName, resolveNameTranslation } from './nameTranslation';
import type { ResumeView, TranslationEntry } from './types';
import { projectDraft, researchDisplayDraft, researchSource } from './draftEditing';
import { hashString } from './ai';

export const textKey = (text: string): string => hashString(text.trim());

export const publicationAuthorNames = (authors: string): string[] =>
  authors.split(/[,，;；、\n]+/).map(name => name.trim()).filter(Boolean);

export function isViewName(view: ResumeView, text: string): boolean {
  const src = text.trim();
  return src === view.basics.name.trim() || view.publications.some(p =>
    p.highlight.trim() === src || publicationAuthorNames(p.authors).includes(src));
}

const DEGREES: Record<string, string> = {
  '博士后': 'Postdoctoral research', '博士': 'Doctoral degree', '硕士': "Master's degree",
  '本科': "Bachelor's degree", '大专': 'Associate degree', '中专': 'Secondary vocational diploma',
  '高中': 'High school diploma',
};

export function defaultViewTranslation(view: ResumeView, text: string): string | undefined {
  const src = text.trim();
  if (isViewName(view, src)) return defaultEnglishName(src);
  if (view.education.some(g => g.degree?.trim() === src)) return DEGREES[src];
  return undefined;
}

/** Shared by preview and proofreading so offline defaults remain editable. */
export function resolveViewTranslation(view: ResumeView, text: string, cached?: TranslationEntry): TranslationEntry | undefined {
  const src = text.trim();
  if (isViewName(view, src)) return resolveNameTranslation(src, cached);
  if (cached?.src === src && cached.en.trim()) return cached;
  const en = defaultViewTranslation(view, src);
  return en ? { src, en } : undefined;
}

const englishDate = (text: string): string => /^(至今|目前|现在)$/.test(text.trim()) ? 'Present' : text;
const englishDates = (item: { start: string; end: string }) => ({ start: englishDate(item.start), end: englishDate(item.end) });

/** 只翻译含中文的字符串：纯英文/数字/URL 原样保留，也省 token。 */
const needsTranslation = (text: string): boolean => /[\u4e00-\u9fa5]/.test(text);

/** 英文模式下把中文标点换成英文标点：技术栈这类不翻译的字符串也能受益。 */
const PUNCT: [RegExp, string][] = [
  [/、/g, ', '],
  [/，/g, ', '],
  [/；/g, '; '],
  [/：/g, ': '],
  [/（/g, ' ('],
  [/）/g, ') '],
  [/。/g, '. '],
];

const toEnglishPunct = (text: string): string =>
  PUNCT.reduce((acc, [re, rep]) => acc.replace(re, rep), text).replace(/\s{2,}/g, ' ').trimEnd();

/**
 * 把简历视图翻成目标语言。
 * 命中缓存就替换，没命中就原样保留并记进 missing，由调用方决定去不去调接口。
 */
export function localizeView(
  view: ResumeView,
  dict: Record<string, TranslationEntry>,
): { view: ResumeView; missing: string[] } {
  const missing = new Set<string>();

  const tr = (text: string): string => {
    if (!text.trim()) return text;
    if (!needsTranslation(text)) return toEnglishPunct(text);
    const key = textKey(text);
    const hit = resolveViewTranslation(view, text, dict[key]);
    if (hit && hit.src === text.trim()) return toEnglishPunct(hit.en);
    missing.add(text.trim());
    return text;
  };

  // 姓名也进入英文译文与校对流程，中文源档案保持不变。
  const basics = {
    ...view.basics,
    name: tr(view.basics.name),
    title: tr(view.basics.title),
    city: tr(view.basics.city),
    summary: tr(view.basics.summary),
    links: view.basics.links.map((l) => ({ ...l, label: tr(l.label) })),
  };

  const localizeWork = (w: (typeof view.work)[number]) => ({
    ...w,
    ...englishDates(w),
    company: tr(w.company),
    role: tr(w.role),
    location: tr(w.location),
    detail: tr(w.detail),
    bullets: w.bullets.map((b) => ({ ...b, text: tr(b.text) })),
  });

  const work = view.work.map(localizeWork);
  const research = view.research.map(w => {
    const base = {...w, ...englishDates(w)};
    const draft = researchDisplayDraft(w);
    if (w.researchDisplay === 'star') return {...base, company:tr(w.company),role:tr(w.role),location:tr(w.location),detail:tr(w.detail),star:Object.fromEntries(Object.entries(researchSource(w)).map(([key,text])=>[key,tr(text)])) as NonNullable<typeof w.star>};
    return {...base, company: tr(w.company), role: tr(w.role), location: tr(w.location), detail: tr(w.detail),
      researchDraft: draft.mode === 'paragraph' ? {...draft, text: tr(draft.text)} : {...draft, bullets: draft.bullets.map(b => ({...b, text: tr(b.text)}))}};
  });

  const projects = view.projects.map(p => {
    const base = {...p, ...englishDates(p), name:tr(p.name), role:tr(p.role), company:tr(p.company)};
    if (p.display === 'star') return {...base, situation:tr(p.situation), task:tr(p.task),
      actions:p.actions.map(b => ({...b,text:tr(b.text)})), results:p.results.map(b => ({...b,text:tr(b.text)}))};
    const draft = projectDraft(p);
    return {...base, composed:draft.mode === 'paragraph' ? {...draft,text:tr(draft.text)} : {...draft,bullets:draft.bullets.map(b => ({...b,text:tr(b.text)}))}};
  });

  const education = view.education.map((g) => ({
    ...g,
    ...englishDates(g),
    degree: g.degree === undefined ? undefined : tr(g.degree),
    org: tr(g.org),
    role: tr(g.role),
    location: tr(g.location),
    detail: tr(g.detail),
    bullets: g.bullets.map((b) => ({ ...b, text: tr(b.text) })),
  }));

  const skills = view.skills.map((s) => ({ ...s, label: tr(s.label), value: tr(s.value) }));

  return {
    view: {
      customCategories: (view.customCategories??[]).map(c=>({...c,name:tr(c.name),fields:c.fields.map(f=>({...f,label:tr(f.label)})),items:c.items.map(i=>({...i,title:tr(i.title),body:tr(i.body),values:Object.fromEntries(Object.entries(i.values).map(([key,value])=>[key,tr(value)]))}))})),
      basics,
      work,
      research,
      publications: view.publications.map((p) => ({
        ...p,
        title: tr(p.title),
        venue: tr(p.venue),
        authors: publicationAuthorNames(p.authors).map(tr).join(', '),
        highlight: tr(p.highlight),
        note: tr(p.note),
      })),
      projects,
      education,
      skills,
    },
    missing: [...missing],
  };
}

/**
 * 合并新译文，返回新的缓存对象。
 * 如果模型把中文原样返回，视为没翻成功——不入缓存，让它继续留在「未翻译」里。
 */
export function mergeTranslations(
  dict: Record<string, TranslationEntry>,
  sources: string[],
  translated: string[],
): Record<string, TranslationEntry> {
  const next = { ...dict };
  sources.forEach((src, i) => {
    const key = textKey(src);
    // The user may have edited this entry while the automatic request was in flight.
    if (next[key]?.manual && next[key].src === src.trim()) return;
    const en = translated[i]?.trim();
    if (!en || en === src.trim()) return;
    next[key] = { src: src.trim(), en };
  });
  return next;
}

/**
 * 按文档顺序收集需要翻译的字符串（去重）。
 * 遍历的字段必须和 localizeView 保持一致，否则面板会出现"预览里有、清单里没有"。
 */
export function collectStrings(view: ResumeView): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (text: string) => {
    const t = text.trim();
    if (!t || !needsTranslation(t) || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  const { basics, work, projects, education, skills } = view;
  push(basics.name);
  push(basics.title);
  push(basics.city);
  push(basics.summary);
  for (const l of basics.links) push(l.label);
  for (const w of [...work, ...view.research]) {
    push(w.company);
    push(w.role);
    push(w.location);

    if (view.research.includes(w)) {
      const draft = researchDisplayDraft(w);
      if (draft.mode === 'paragraph') push(draft.text);
      else for (const b of draft.bullets) push(b.text);
    } else for (const b of w.bullets) push(b.text);
  }
  for (const p of projects) {
    push(p.name);
    push(p.role);
    push(p.company);
    if (p.display === 'star') {
      push(p.situation);push(p.task);
      for (const b of [...p.actions,...p.results]) push(b.text);
    } else {
      const draft = projectDraft(p);
      if (draft.mode === 'paragraph') push(draft.text);
      else for (const b of draft.bullets) push(b.text);
    }
  }
  for (const g of education) {
    push(g.degree ?? '');
    push(g.org);
    push(g.role);
    push(g.location);
    push(g.detail);
    for (const b of g.bullets) push(b.text);
  }
  for (const p of view.publications) {
    for (const name of publicationAuthorNames(p.authors)) push(name);
    push(p.highlight);
    push(p.title);
    push(p.venue);
    push(p.note);
  }
  for (const sk of skills) {
    push(sk.label);
    push(sk.value);
  }
  for(const c of view.customCategories??[]){
    push(c.name);for(const f of c.fields)push(f.label);
    for(const i of c.items){push(i.title);push(i.body);for(const value of Object.values(i.values))push(value);}
  }
  return out;
}
