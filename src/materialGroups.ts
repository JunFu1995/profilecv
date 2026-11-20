import { joinProse, normalizeProse } from './prose';
import type { Bullet, Master, SectionKey } from './types';
import { projectDisplayDraft, researchDisplayDraft } from './draftEditing';
import { allProjects } from './variants';
export interface PickerGroup {
  id: string;
  title: string;
  sub: string;
  bullets: Bullet[];
  preview?: string;
}

export function pickerGroups(master: Master, section: SectionKey): PickerGroup[] {
  if (section === 'work' || section === 'research') {
    const source = section === 'research' ? master.research : master.work;
    return source.map((w) => ({
      id: w.id,
      title: w.company || '（未命名公司）',
      sub: [w.role, [w.start, w.end].filter(Boolean).join(' – ')].filter(Boolean).join(' · '),
      preview: section === 'research' ? (() => {const draft=researchDisplayDraft(w);return draft.mode === 'paragraph' ? normalizeProse(draft.text) : joinProse(draft.bullets.map(b => b.text));})() : undefined,
      bullets: section === 'work' || w.summaryOnly || w.researchDraft ? [] : w.bullets,
    }));
  }
  if (section === 'projects') {
    return allProjects(master).map((r) => ({
      id: r.project.id,
      title: r.project.name || '（未命名项目）',
      sub: [r.company, r.project.role, [r.project.start, r.project.end].filter(Boolean).join(' – ')]
        .filter(Boolean)
        .join(' · '),
      preview: (() => {const draft=projectDisplayDraft(r.project);return draft.mode === 'paragraph' ? normalizeProse(draft.text) : joinProse(draft.bullets.map(b => b.text));})(),
      bullets: [...r.project.actions, ...r.project.results],
    }));
  }
  return master.education.map((g) => ({
    id: g.id,
    title: g.org || '（未命名学校）',
    sub: [g.role, [g.start, g.end].filter(Boolean).join(' – ')].filter(Boolean).join(' · '),
    bullets: g.bullets,
  }));
}
