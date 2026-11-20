import type { Bullet, BulletGroup, Composed, Project, WorkEntry } from './types';

export interface ArchiveCardSummaryData { badge?: string; meta?: string; detail?: string; extra?: string }
const clean = (value?: string) => value?.trim() || '';
const join = (values: (string | undefined)[]) => values.map(clean).filter(Boolean).join(' · ');
const firstBullet = (bullets: Bullet[]) => bullets.map(b => clean(b.text)).find(Boolean) || '';
const composedText = (draft?: Composed) => draft?.mode === 'bullets' ? firstBullet(draft.bullets) : clean(draft?.text);

export function projectCardSummary(project: Project): ArchiveCardSummaryData {
  return {
    meta: join([project.role, project.stack]),
    detail: firstBullet(project.results) || composedText(project.composed) || clean(project.task) || clean(project.situation) || firstBullet(project.actions),
  };
}

export function workCardSummary(work: WorkEntry, research = false): ArchiveCardSummaryData {
  const projects = work.projects.map(p => clean(p.name)).filter(Boolean);
  return {
    meta: join([work.role, work.location, work.detail]),
    detail: (research ? clean(work.star?.result) || composedText(work.researchDraft) : '') || clean(work.summary) || firstBullet(work.bullets),
    extra: !research && projects.length ? `项目：${projects.join('、')}` : '',
  };
}

export function educationCardSummary(education: BulletGroup): ArchiveCardSummaryData {
  // Sample and imported records may still carry a degree in the legacy role field.
  const parts = education.role.split(/\s*[·｜|]\s*/);
  const legacyDegree = parts.find(part => /^(博士后|博士|硕士|本科|学士|大专|专科|高中|中专|MBA|PhD|Master|Bachelor)$/i.test(part));
  const degree = education.degree === undefined ? legacyDegree || '' : clean(education.degree);
  return {
    badge: degree,
    meta: join([parts.filter(part => part !== legacyDegree && part !== degree).join(' · '), education.location]),
    detail: clean(education.detail) || firstBullet(education.bullets),
    extra: clean(education.detail) ? firstBullet(education.bullets) : '',
  };
}
