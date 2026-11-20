import type {
  Bullet,
  Composed,
  BulletGroup,
  Doc,
  LinkItem,
  Master,
  PickedGroup,
  Project,
  Publication,
  SkillGroup,
  Theme,
  Variant,
  WorkEntry,
} from './types';
import { emptyDoc } from './data';
import { normalizeTemplate } from './templates';
import { uid } from './id';

const KEY = 'resume-tool:v1';
const DEMO_KEY = 'resume-tool:v1:demo';
const UI_KEY = 'resume-tool:v2:ui';

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

function normBullet(raw: unknown): Bullet {
  const b = (raw ?? {}) as Record<string, unknown>;
  return { id: str(b.id) || uid(), text: str(b.text) };
}

function normEducation(raw: unknown): BulletGroup {
  const g = (raw ?? {}) as Record<string, unknown>;
  const parts=str(g.role).split(/\s*[·｜|]\s*/);
  const legacyDegree=parts.find(part=>/^(博士后|博士|硕士|本科|学士|大专|专科|高中|中专|MBA|PhD|Master|Bachelor)$/i.test(part));
  return {
    id: str(g.id) || uid(),
    org: str(g.org),
    role: g.degree===undefined&&legacyDegree?parts.filter(p=>p!==legacyDegree).join(' · '):str(g.role),
    degree: g.degree===undefined?legacyDegree??'':str(g.degree),
    start: str(g.start),
    end: str(g.end),
    location: str(g.location),
    detail: str(g.detail),
    bullets: Array.isArray(g.bullets) ? g.bullets.map(normBullet) : [],
  };
}

function bulletList(raw: unknown): Bullet[] {
  return Array.isArray(raw) ? raw.map(normBullet) : [];
}

function normComposed(raw: unknown): Composed | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Record<string, unknown>;
  return { mode: c.mode === 'bullets' ? 'bullets' : 'paragraph', text: str(c.text), bullets: bulletList(c.bullets), sourceHash: str(c.sourceHash) };
}

/** 新格式有 actions/results；旧格式是 BulletGroup，做一次就地升级。 */
function normProject(raw: unknown): Project {
  const p = (raw ?? {}) as Record<string, unknown>;
  const display = p.display === 'star' ? 'star' as const : p.display === 'summary' ? 'summary' as const : undefined;
  const isLegacy = !Array.isArray(p.actions) && !Array.isArray(p.results);
  if (isLegacy) {
    return {
      id: str(p.id) || uid(),
      ...(display ? {display} : {}),
      name: str(p.org) || str(p.name),
      role: str(p.role),
      start: str(p.start),
      end: str(p.end),
      stack: str(p.detail),
      situation: '',
      task: '',
      actions: bulletList(p.bullets),
      results: [],
    };
  }
  const base = {
    id: str(p.id) || uid(),
    ...(display ? {display} : {}),
    name: str(p.name),
    role: str(p.role),
    start: str(p.start),
    end: str(p.end),
    stack: str(p.stack),
    situation: str(p.situation),
    task: str(p.task),
    actions: bulletList(p.actions),
    results: bulletList(p.results),
  };
  const c = p.composed as Record<string, unknown> | undefined;
  if (!c || typeof c !== 'object') return base;
  const mode = c.mode === 'bullets' ? 'bullets' : 'paragraph';
  return {
    ...base,
    composed: {
      mode,
      text: str(c.text),
      bullets: bulletList(c.bullets),
      sourceHash: str(c.sourceHash),
    },
  };
}

function normWork(raw: unknown): WorkEntry {
  const w = (raw ?? {}) as Record<string, unknown>;
  const researchDraft = normComposed(w.researchDraft);
  return {
    id: str(w.id) || uid(),
    publicationIds: Array.isArray(w.publicationIds)?w.publicationIds.filter((x):x is string=>typeof x==='string'):[],
    summaryOnly: w.summaryOnly===true,
    ...(w.researchDisplay === 'star' || w.researchDisplay === 'summary' ? {researchDisplay:w.researchDisplay} : {}),
    ...(researchDraft ? {researchDraft} : {}),
    company: str(w.company) || str(w.org),
    role: str(w.role),
    start: str(w.start),
    end: str(w.end),
    location: str(w.location),
    detail: str(w.detail),
    bullets: bulletList(w.bullets),
    ...(w.star && typeof w.star==='object' ? {star:{situation:str((w.star as Record<string,unknown>).situation),task:str((w.star as Record<string,unknown>).task),action:str((w.star as Record<string,unknown>).action),result:str((w.star as Record<string,unknown>).result)}} : {}),
    ...(str(w.summary) ? { summary: str(w.summary) } : {}),
    projects: Array.isArray(w.projects) ? w.projects.map(normProject) : [],
  };
}

function normSkills(raw: unknown): SkillGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const s = (item ?? {}) as Record<string, unknown>;
    return { id: str(s.id) || uid(), label: str(s.label), value: str(s.value) };
  });
}

function normLinks(raw: unknown): LinkItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const l = (item ?? {}) as Record<string, unknown>;
    return { id: str(l.id) || uid(), label: str(l.label), url: str(l.url) };
  });
}

function normMaster(raw: unknown): Master {
  const m = (raw ?? {}) as Record<string, unknown>;
  const b = (m.basics ?? {}) as Record<string, unknown>;
  // v2 及以前：项目挂在 master.projects 上，没有公司归属，升级成独立项目
  const legacyProjects = Array.isArray(m.projects) ? m.projects.map(normProject) : [];
  return {
    basics: {
      name: str(b.name),
      ...(typeof b.photo === 'string' && b.photo.startsWith('data:image/') ? { photo: b.photo } : {}),
      title: str(b.title),
      email: str(b.email),
      phone: str(b.phone),
      city: str(b.city),
      links: normLinks(b.links),
      summary: str(b.summary),
    },
    work: Array.isArray(m.work) ? m.work.map(normWork) : [],
    research: Array.isArray(m.research) ? m.research.map(normWork) : [],
    publications: Array.isArray(m.publications) ? m.publications.map(normPublication) : [],
    sideProjects: Array.isArray(m.sideProjects) ? m.sideProjects.map(normProject) : legacyProjects,
    education: Array.isArray(m.education) ? m.education.map(normEducation) : [],
    skills: normSkills(m.skills),
    trashItems: Array.isArray(m.trashItems)?m.trashItems.filter(x=>x&&typeof x.id==='string'&&typeof x.label==='string'&&Array.isArray(x.path)&&x.path.every((p:unknown)=>typeof p==='string'||typeof p==='number')&&typeof x.index==='number') as Master['trashItems']:[],
    categoryOrder: Array.isArray(m.categoryOrder) ? [...new Set(m.categoryOrder.filter((key): key is string => typeof key === 'string'))] : [],
    hiddenCategories: Array.isArray(m.hiddenCategories)?m.hiddenCategories.filter((x):x is string=>typeof x==='string'):[],
    categoryNames: Object.fromEntries(Object.entries(m.categoryNames && typeof m.categoryNames==='object'?m.categoryNames:{}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'&&!!entry[1].trim())),
    customCategories: Array.isArray(m.customCategories) ? m.customCategories.filter(x=>x && typeof x==='object').map(raw=>{
      const c=raw as Record<string,unknown>;
      return {id:str(c.id)||uid(),name:str(c.name),...(typeof c.titleLabel==='string'?{titleLabel:c.titleLabel}:{}),...(typeof c.bodyLabel==='string'?{bodyLabel:c.bodyLabel}:{}),...(typeof c.bodyHint==='string'?{bodyHint:c.bodyHint}:{}),fields:Array.isArray(c.fields)?c.fields.filter(f=>f&&typeof f==='object').map(f=>({id:str(f.id)||uid(),label:str(f.label)})):[],items:Array.isArray(c.items)?c.items.filter(i=>i&&typeof i==='object').map(i=>({id:str(i.id)||uid(),title:str(i.title),body:str(i.body),values:Object.fromEntries(Object.entries(i.values&&typeof i.values==='object'?i.values:{}).filter((e):e is [string,string]=>typeof e[1]==='string'))})):[]};
    }) : [],
  };
}

function normPublication(raw: unknown): Publication {
  const p = (raw ?? {}) as Record<string, unknown>;
  const status = str(p.status);
  const position = str(p.selfPosition);
  return {
    id: str(p.id) || uid(),
    authors: str(p.authors),
    highlight: str(p.highlight),
    title: str(p.title),
    venue: str(p.venue),
    venueShort: str(p.venueShort),
    level: str(p.level),
    year: str(p.year),
    volume: str(p.volume),
    issue: str(p.issue),
    pages: str(p.pages),
    doi: str(p.doi),
    status:
      status === 'unknown' || status === 'accepted' || status === 'review' || status === 'preprint' ? status : 'published',
    selfPosition:
      position === 'co-first' || position === 'corresponding' || position === 'other' ? position : 'first',
    note: str(p.note),
    ...(str(p.abstract) ? { abstract: str(p.abstract) } : {}),
  };
}

function normPicks(raw: unknown): PickedGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const p = (item ?? {}) as Record<string, unknown>;
    const bullets = Array.isArray(p.bullets) ? p.bullets : [];
    return {
      groupId: str(p.groupId),
      bullets: bullets
        .map((b) => {
          const pb = (b ?? {}) as Record<string, unknown>;
          const id = str(pb.bulletId);
          return id ? (typeof pb.text === 'string' ? { bulletId: id, text: pb.text } : { bulletId: id }) : null;
        })
        .filter((x): x is { bulletId: string; text?: string } => x !== null),
    };
  }).filter((p) => p.groupId);
}

function normVariant(raw: unknown): Variant {
  const v = (raw ?? {}) as Record<string, unknown>;
  const jt = (v.jobTarget ?? {}) as Record<string, unknown>;
  return {
    id: str(v.id) || uid(),
    name: str(v.name) || '未命名版本',
    createdAt: str(v.createdAt),
    ...(v.content && typeof v.content === 'object' ? { content: normMaster(v.content) } : {}),
    summary: str(v.summary),
    retainedTexts: Object.fromEntries(Object.entries(v.retainedTexts && typeof v.retainedTexts === "object" ? v.retainedTexts : {}).filter((entry): entry is [string,string] => typeof entry[1] === "string")),
    jobTarget: {
      jobId: str(jt.jobId) || undefined,
      company: str(jt.company),
      role: str(jt.role),
      jdText: str(jt.jdText),
      keywords: Array.isArray(jt.keywords) ? jt.keywords.filter((x): x is string => typeof x === 'string') : [],
    },
    ...(Array.isArray(v.custom) ? {custom:v.custom.filter(c=>c&&typeof c==='object'&&typeof c.categoryId==='string'&&Array.isArray(c.itemIds)).map(c=>({categoryId:c.categoryId,itemIds:[...new Set(c.itemIds.filter((id:unknown):id is string=>typeof id==='string'))] as string[]}))} : {}),
    work: normPicks(v.work),
    projects: normPicks(v.projects),
    research: normPicks(v.research),
    education: normPicks(v.education),
    publications: Array.isArray(v.publications)
      ? v.publications.filter((x): x is string => typeof x === 'string')
      : [],
    skills: Array.isArray(v.skills) ? v.skills.filter((x): x is string => typeof x === 'string') : [],
  };
}

function normTranslations(raw: unknown): Doc['translations'] {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out: Doc['translations'] = {};
  for (const [key, value] of Object.entries(src)) {
    const v = (value ?? {}) as Record<string, unknown>;
    const s0 = str(v.src);
    const en = str(v.en);
    if (!s0 || !en) continue;
    out[key] = {
      src: s0,
      en,
      ...(v.manual === true ? { manual: true } : {}),
      ...(v.polished === true ? { polished: true } : {}),
      ...(typeof v.previous === 'string' && v.previous.trim() ? { previous: v.previous } : {}),
    };
  }
  return out;
}

function normTheme(raw: unknown): Theme {
  const t = (raw ?? {}) as Record<string, unknown>;
  const accent = str(t.accent, '#1f5f9e');
  return { accent: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#1f5f9e' };
}

/**
 * 宽容地把任意 JSON 归一化成合法 Doc：缺字段补默认、坏数据丢弃而不是整份拒绝。
 * v1（只有素材库）的文件会自动升级成 v2，variants 为空。
 */
export function normalizeDoc(raw: unknown): Doc {
  if (!raw || typeof raw !== 'object') throw new Error('不是有效的 JSON 对象');
  const d = raw as Record<string, unknown>;
  if (!d.master || typeof d.master !== 'object') throw new Error('缺少 master 字段，可能不是本工具导出的文件');
  return {
    version: 3,
    locale: d.locale === 'en' ? 'en' : 'zh',
    translations: normTranslations(d.translations),
    layoutScale:
      typeof d.layoutScale === 'number' && Number.isFinite(d.layoutScale)
        ? Math.min(1.3, Math.max(0.6, d.layoutScale))
        : 1,
    layoutStretch:
      typeof d.layoutStretch === 'number' && Number.isFinite(d.layoutStretch)
        ? Math.min(40, Math.max(0, d.layoutStretch))
        : 0,
    template: normalizeTemplate(d.template),
    theme: normTheme(d.theme),
    master: normMaster(d.master),
    jobs: Array.isArray(d.jobs) ? d.jobs.filter(j=>j && typeof j === 'object').map(raw=>{const j=raw as Record<string, unknown>; return {id:str(j.id)||uid(),company:str(j.company),role:str(j.role),jdText:str(j.jdText),url:str(j.url),note:str(j.note),updatedAt:str(j.updatedAt)};}) : [],
    variants: Array.isArray(d.variants) ? d.variants.map(raw => {
      const variant = normVariant(raw);
      const own = (raw as Record<string, unknown> | null)?.layout;
      const source = own && typeof own === 'object' ? own as Record<string, unknown> : d;
      variant.layout = {
        locale: source.locale === 'en' ? 'en' : 'zh',
        template: normalizeTemplate(source.template),
        layoutScale: typeof source.layoutScale === 'number' && Number.isFinite(source.layoutScale) ? Math.min(1.3, Math.max(.6, source.layoutScale)) : 1,
        layoutStretch: typeof source.layoutStretch === 'number' && Number.isFinite(source.layoutStretch) ? Math.min(40, Math.max(0, source.layoutStretch)) : 0,
        theme: normTheme(source.theme),
      };
      return variant;
    }) : [],
  };
}

export type StoredDocResult =
  | { status: 'ready'; doc: Doc }
  | { status: 'empty' }
  | { status: 'error'; raw: string | null };

export function inspectStoredDoc(): StoredDocResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw === null) return { status: 'empty' };
    return { status: 'ready', doc: normalizeDoc(JSON.parse(raw)) };
  } catch {
    return { status: 'error', raw };
  }
}

export function loadStoredDoc(): Doc | null {
  const result = inspectStoredDoc();
  return result.status === 'ready' ? result.doc : null;
}

const SNAPSHOT_KEY = 'resume-tool:v3:snapshot';
export function saveSnapshot(doc: Doc): boolean {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

export function loadSnapshot(): Doc | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw === null ? null : normalizeDoc(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** 保留无法解析的原始存档后，才允许恢复自动保存。 */
export function preserveUnreadable(raw: string): boolean {
  try {
    localStorage.setItem(`${KEY}:recovery:${Date.now()}`, raw);
    return true;
  } catch {
    return false;
  }
}

export function loadDoc(): Doc {
  return loadStoredDoc() ?? emptyDoc();
}

/** 返回是否真的写进去了：存储写满或被禁用时必须让调用方知道，不能假装成功。 */
export function saveDoc(doc: Doc): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

export function clearStored(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** 标记当前内容是否仍是示例数据，避免用户把自己的简历当示例清空，或反之。 */
export function getDemoFlag(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDemoFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEMO_KEY, '1');
    else localStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- 界面状态（当前编辑的是素材库还是哪个版本） ---------- */

export interface UiState {
  mode: 'master' | 'variant';
  activeVariantId: string | null;
  archiveToolsOpen?: boolean;
}

export function loadUi(): UiState {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return { mode: 'master', activeVariantId: null };
    const parsed = JSON.parse(raw) as Partial<UiState>;
    return {
      mode: parsed.mode === 'variant' ? 'variant' : 'master',
      activeVariantId: typeof parsed.activeVariantId === 'string' ? parsed.activeVariantId : null,
      archiveToolsOpen: parsed.archiveToolsOpen === true,
    };
  } catch {
    return { mode: 'master', activeVariantId: null };
  }
}

export function saveUi(ui: UiState): void {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {
    /* ignore */
  }
}

/* ---------- 导入导出 ---------- */

export function downloadJson(doc: Doc, suffix = ''): void {
  const name = doc.master.basics.name || 'resume';
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}${suffix ? `-${suffix}` : ''}-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<Doc> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('文件不是合法的 JSON');
  }
  return normalizeDoc(parsed);
}
