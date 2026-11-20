import { projectDisplayDraft, researchDisplayDraft, hasProjectDraft } from './draftEditing';
import type { ResumeView } from './types';

export type Severity = 'warn' | 'info';

export interface RuleHit {
  code: string;
  label: string;
  severity: Severity;
}

export interface BulletIssue {
  key: string;
  bulletId: string;
  groupId: string;
  groupLabel: string;
  /** 合成稿应回到项目编辑，不走原始要点改写。 */
  composed?: boolean;
  text: string;
  rules: RuleHit[];
}

export interface LintReport {
  total: number;
  wantFix: number;
  issues: BulletIssue[];
  byRule: Record<string, number>;
  /** 有项目但没填结果（R）的项目名 */
  projectsWithoutResult: string[];
}

/** 弱动词：不说明“做成了什么”，只说明“摊上了什么事”。 */
const WEAK_VERBS = [
  '负责',
  '参与',
  '协助',
  '支持',
  '配合',
  '帮助',
  '跟进',
  '维护',
  '执行',
  '从事',
  '完成了',
  '进行了',
  '主要是',
  '日常',
];

const MAX_CHARS = 65;
const MAX_ENGLISH_WORDS = 35;

// English openings must be compared as words, not two-letter prefixes.
const opening = (text: string): string => /^[A-Za-z]+\b/.exec(text)?.[0].toLowerCase() ?? text.slice(0, 2);

const hasNumber = (text: string): boolean => /[0-9０-９]/.test(text);

const hitWeakVerb = (text: string): string | null => {
  const english = /^(responsible for|participated in|assisted with|helped with)\b/i.exec(text.trimStart());
  if (english) return english[0];
  const head = text.trimStart().slice(0, 4);
  return WEAK_VERBS.find((v) => head.startsWith(v)) ?? null;
};

function collectBullets(view: ResumeView): { text: string; groupLabel: string; bulletId:string; groupId:string; composed?:boolean }[] {
  const out: { text: string; groupLabel: string; bulletId:string; groupId:string; composed?:boolean }[] = [];
  const push = (text: string, groupLabel: string, bulletId:string, groupId:string, composed = false) => {
    if (text.trim()) out.push({ text: text.trim(), groupLabel, bulletId, groupId, composed });
  };

  for (const w of view.research) {
    const draft = researchDisplayDraft(w);
    if (draft.mode === 'paragraph') push(draft.text, w.company || w.role || '未命名', w.id, w.id, true);
    else for (const b of draft.bullets) push(b.text, w.company || w.role || '未命名', b.id, w.id, true);
  }
  for (const p of view.projects) {
    const draft = projectDisplayDraft(p);
    if (draft.mode === 'paragraph') push(draft.text, p.name || '未命名项目', p.id, p.id, p.display !== 'star');
    else for (const b of draft.bullets) push(b.text, p.name || '未命名项目', b.id, p.id, true);
  }
  for (const g of view.education) {
    for (const b of g.bullets) push(b.text, g.org || g.role || '未命名', b.id,g.id);
  }
  return out;
}

/**
 * 纯规则检查，不联网、不调模型：便宜、即时、不会瞎编。
 * 目标是“提示”，不是打分——所以只报可操作的问题。
 */
export function lintView(view: ResumeView): LintReport {
  const all = collectBullets(view);

  // 同一个动词在开头反复出现，是简历最常见的“格式化”味道
  const prefixCount = new Map<string, number>();
  for (const item of all) {
    const prefix = opening(item.text);
    if (prefix.length >= 2) prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1);
  }

  const issues: BulletIssue[] = [];
  const byRule: Record<string, number> = {};

  all.forEach((item) => {
    const rules: RuleHit[] = [];

    if (!hasNumber(item.text)) {
      rules.push({ code: 'no-metric', label: '可补充成果证据', severity: 'warn' });
    }

    const weak = hitWeakVerb(item.text);
    if (weak) {
      rules.push({ code: 'weak-verb', label: `可具体说明「${weak}」的行动`, severity: 'warn' });
    }

    const len = [...item.text].length;
    const english = !/[\u3400-\u9fff]/.test(item.text);
    const words = item.text.split(/\s+/).length;
    if (english ? words > MAX_ENGLISH_WORDS : len > MAX_CHARS) {
      rules.push({ code: 'too-long', label: `偏长（${english ? `${words} 词` : `${len} 字`}）`, severity: 'info' });
    }

    const prefix = opening(item.text);
    const dup = prefix.length >= 2 ? (prefixCount.get(prefix) ?? 0) : 0;
    if (dup >= 2) {
      rules.push({ code: 'dup-verb', label: `「${prefix}」开头重复 ${dup} 次`, severity: 'info' });
    }

    if (rules.length > 0) {
      issues.push({ key: `${item.groupId}:${item.bulletId}`, bulletId:item.bulletId,groupId:item.groupId, groupLabel: item.groupLabel, text: item.text, composed: item.composed, rules });
      for (const r of rules) byRule[r.code] = (byRule[r.code] ?? 0) + 1;
    }
  });

  const weight = (issue: BulletIssue) => issue.rules.filter((r) => r.severity === 'warn').length;
  issues.sort((a, b) => weight(b) - weight(a) || b.rules.length - a.rules.length);

  const projectsWithoutResult = view.projects
    .filter((p) => !hasProjectDraft({...p, composed:projectDisplayDraft(p)}))
    .filter((p) => p.name.trim() && p.results.every((r) => !r.text.trim()))
    .map((p) => p.name);

  return {
    total: all.length,
    wantFix: issues.filter((i) => weight(i) > 0).length,
    issues,
    byRule,
    projectsWithoutResult,
  };
}

/** 把简历拍平成纯文本，供关键词匹配使用。 */
export function flattenView(view: ResumeView): string {
  const b = view.basics;
  const parts: string[] = [b.name, b.title, b.summary, ...b.links.map((l) => l.url || l.label)];

  for (const w of [...view.work, ...view.research]) {
    parts.push(w.company, w.role, w.location);
    if (view.research.includes(w)) {
      const draft = researchDisplayDraft(w);
      parts.push(...(draft.mode === 'paragraph' ? [draft.text] : draft.bullets.map(b => b.text)));
    }
  }
  for (const p of view.publications) parts.push(p.title, p.venue, p.note);
  for (const p of view.projects) {
    parts.push(p.name, p.role, p.company, p.stack);
    const draft = projectDisplayDraft(p);
    parts.push(...(draft.mode === 'paragraph' ? [draft.text] : draft.bullets.map(b => b.text)));
  }
  for (const g of view.education) {
    parts.push(g.org, g.role, g.degree ?? '', g.detail);
    for (const bullet of g.bullets) parts.push(bullet.text);
  }
  for (const s of view.skills) parts.push(s.label, s.value);
  for(const c of view.customCategories??[]){parts.push(c.name);for(const i of c.items)parts.push(i.title,i.body,...c.fields.map(f=>i.values[f.id]??''));}

  return parts.filter(Boolean).join('\n').toLowerCase();
}
