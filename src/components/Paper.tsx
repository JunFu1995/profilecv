import {customCategoryLocateId,customItemLocateId,customItemHasContent} from '../customCategories';
import { switchDraftMode, switchProjectDraftMode, researchDraft, researchSource } from '../draftEditing';
import { normalizeProse } from '../prose';
import { fieldLocateId } from '../locate';
import type { Locale, Publication, ProjectView, ResumeView, WorkEntry } from '../types';
import type { TemplateId } from '../templates';

const TITLES: Record<
  Locale,
  Record<'work' | 'projects' | 'research' | 'publications' | 'education' | 'skills', string>
> = {
  zh: {
    work: '工作经历',
    projects: '独立项目',
    research: '科研经历',
    publications: '发表论文',
    education: '教育经历',
    skills: '专业技能',
  },
  en: {
    work: 'Work Experience',
    projects: 'Independent Projects',
    research: 'Research Experience',
    publications: 'Publications',
    education: 'Education',
    skills: 'Skills',
  },
};

const STATUS_LABEL: Record<Publication['status'], { zh: string; en: string }> = {
  unknown: { zh: '', en: '' },
  published: { zh: '', en: '' },
  accepted: { zh: '已接收', en: 'Accepted' },
  review: { zh: '在审', en: 'Under Review' },
  preprint: { zh: '预印本', en: 'Preprint' },
};

const POSITION_LABEL: Record<Publication['selfPosition'], { zh: string; en: string }> = {
  first: { zh: '', en: '' },
  'co-first': { zh: '共同一作', en: 'Co-first author' },
  corresponding: { zh: '通讯作者', en: 'Corresponding author' },
  other: { zh: '', en: '' },
};

function Authors({ p }: { p: Publication }) {
  const self = p.highlight.trim();
  if (!self) return <>{p.authors}</>;
  // 只在作者串里加粗自己，其余原样保留
  const parts = p.authors.split(/([,，;；])/);
  return (
    <>
      {parts.map((part, i) =>
        /^[,，;；]$/.test(part) ? (
          <span key={i}>{part}</span>
        ) : part.includes(self) ? (
          <strong key={i} className="pub-self">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Publications({ items, locale }: { items: Publication[]; locale: Locale }) {
  return (
    <ol className="pubs">
      {items.map((p, i) => {
        const volume = p.volume ? `${p.volume}${p.issue ? `(${p.issue})` : ''}` : '';
        const pages = p.pages ? `: ${p.pages}` : '';
        const tail = [p.venue, [p.year, volume].filter(Boolean).join(', ')].filter(Boolean).join(', ');
        const marks = [
          POSITION_LABEL[p.selfPosition][locale],
          STATUS_LABEL[p.status][locale],
          p.note,
        ].filter(Boolean);

        return (
          <li className="pub locatable" data-locate={p.id} key={p.id}>
            <span className="pub-index">[{i + 1}]</span>
            <span className="pub-body">
              <Authors p={p} />.{' '}
              <span className="pub-title">{p.title}</span>.{' '}
              <span className="pub-venue">
                {tail}
                {pages}.
              </span>
              {marks.length > 0 && <span className="pub-marks"> · {marks.join(' · ')}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Bullets({ items, variant, locateId }: { items: { id: string; text: string }[]; locateId?: string; variant?: 'results' }) {
  const list = items.map((b, index) => ({...b, index})).filter((b) => b.text.trim());
  if (list.length === 0) return null;
  return (
    <ul className={`entry-bullets${variant === 'results' ? ' entry-results' : ''}`} data-summary-group={locateId}>
      {list.map((b) => (
        <li key={b.id} data-bullet-id={b.id} data-locate={locateId} data-summary-line={locateId ? b.index : undefined}>{normalizeProse(b.text)}</li>
      ))}
    </ul>
  );
}

function ExperienceDates({id, start, end}: {id:string; start:string; end:string}) {
  if (!start && !end) return null;
  return <span className="entry-date">
    {start && <span data-locate={fieldLocateId(id,'start')}>{start}</span>}
    {start && end && ' – '}
    {end && <span data-locate={fieldLocateId(id,'end')}>{end}</span>}
  </span>;
}

function Work({ w, research = false, projects = [] }: { w: WorkEntry; research?: boolean; projects?: ProjectView[] }) {
  const draft = switchDraftMode(researchDraft(w), 'paragraph', () => '');

  return (
    <div className="entry locatable" data-locate={w.id}>
      <div className="entry-head">
        <span className="entry-identity"><span className="entry-org" data-locate={fieldLocateId(w.id, 'company')}>{w.company}</span>{w.role && <span className="entry-inline-role" data-locate={fieldLocateId(w.id, 'role')}>{w.role}</span>}</span>
        <ExperienceDates id={w.id} start={w.start} end={w.end}/>
      </div>
      {projects.length > 0 && <div className="work-projects">{projects.map(p => <Project key={p.id} p={{...p,company:''}} />)}</div>}
      {research && (w.researchDisplay === 'star' ? Object.entries(researchSource(w)).map(([field,text]) => text.trim() && <p key={field} className="entry-context research-star-text" data-locate={fieldLocateId(w.id,field)}>{normalizeProse(text)}</p>) : draft.mode === 'paragraph'
        ? draft.text.trim() && <p className="entry-context entry-summary" data-locate={fieldLocateId(w.id, 'summary')}>{normalizeProse(draft.text)}</p>
        : <Bullets items={draft.bullets} locateId={fieldLocateId(w.id, 'summary')} />)}
    </div>
  );
}

function Project({ p }: { p: ProjectView }) {
  const composed = switchProjectDraftMode(p, 'paragraph', () => '');
  const meta = [p.company, p.stack].filter(Boolean).join(' · ');
  return (
    <div className="entry locatable" data-locate={p.id}>
      <div className="entry-head">
        <span className="entry-identity"><span className="entry-org" data-locate={fieldLocateId(p.id, 'name')}>{p.name}</span>{p.role && <span className="entry-inline-role" data-locate={fieldLocateId(p.id, 'role')}>{p.role}</span>}</span>
        <ExperienceDates id={p.id} start={p.start} end={p.end}/>
      </div>
      {meta && (
        <div className="entry-sub">
          <span className="entry-role">{p.company}{p.company && p.stack && ' · '}{p.stack && <span data-locate={fieldLocateId(p.id,'stack')}>{p.stack}</span>}</span>
        </div>
      )}
      {p.display === 'star' ? <>
        {p.situation.trim() && <p className="entry-context" data-locate={fieldLocateId(p.id, 'situation')}>{normalizeProse(p.situation)}</p>}
        {p.task.trim() && <p className="entry-context" data-locate={fieldLocateId(p.id, 'task')}>{normalizeProse(p.task)}</p>}
        <Bullets items={p.actions} locateId={fieldLocateId(p.id, 'actions')} />
        <Bullets items={p.results} locateId={fieldLocateId(p.id, 'results')} variant="results" />
      </> : composed.mode === 'paragraph' ? (
        composed.text.trim() && <p className="entry-context entry-composed" data-locate={fieldLocateId(p.id, 'summary')}>{normalizeProse(composed.text)}</p>
      ) : <Bullets items={composed.bullets} locateId={fieldLocateId(p.id, 'summary')} />}

    </div>
  );
}

function Block({ title, id, titleId, children }: { title: string; id?: string; titleId?: string; children: React.ReactNode }) {
  return (
    <section className="block">
      <h2 className="block-title" data-locate={titleId}>{title}</h2>
      <div className="block-body" data-locate={id}>
        {children}
      </div>
    </section>
  );
}

export function Paper({
  view,
  accent,
  locale,
  scale,
  stretch,
  template,
  onLocate,
  locateBasics = true,
}: {
  view: ResumeView;
  accent: string;
  locale: Locale;
  scale: number;
  stretch: number;
  template: TemplateId;
  onLocate?: (id: string) => void;
  locateBasics?: boolean;
}) {
  const b = view.basics;
  const t = TITLES[locale];
  const contacts = [
    b.phone,
    b.email,
    ...b.links.map((l) => [l.label, l.url].filter(Boolean).join(' ')),
  ].filter((x) => x && x.trim());

  const hasAny =
    b.name.trim() ||
    b.title.trim() ||
    b.summary.trim() ||
    view.work.length ||
    view.research.length ||
    view.publications.length ||
    view.projects.length ||
    view.education.length ||
    view.skills.length ||
    view.customCategories?.some(c=>c.items.some(customItemHasContent));

  const handleClick = (e: React.MouseEvent) => {
    if (!onLocate) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-locate]');
    const id = el?.dataset.locate;
    if (id) onLocate(id);
  };

  if (!hasAny) {
    return (
      <article
        className="paper"
        style={{ '--accent': accent, '--fit': String(scale), '--stretch': `${stretch}px` } as React.CSSProperties}
        data-locale={locale}
        data-template={template}
      >
        <div className="paper-empty">
          <p className="pe-title">开始写你的简历</p>
          <p className="pe-text">在左侧填写基本信息，这里会实时排版成 A4 纸。</p>
          <p className="pe-text pe-dim">还不确定怎么写？点顶部「载入示例」看一份完整的排版效果。</p>
        </div>
      </article>
    );
  }

  return (
    <article
      className="paper"
      style={{ '--accent': accent, '--fit': String(scale), '--stretch': `${stretch}px` } as React.CSSProperties}
      data-locale={locale}
      data-template={template}
      onClick={handleClick}
    >
      <div className={`paper-profile${locateBasics ? ' locatable' : ''}`} data-locate={locateBasics ? 'basics' : undefined}><header className="paper-head">
        <div className="paper-head-main">
          {b.name && <h1 className="paper-name">{b.name}</h1>}
          {b.title && <div className="paper-title">{b.title}</div>}
          {contacts.length > 0 && (
            <div className="paper-contacts">
              {contacts.map((c, i) => (
                <span key={i}>
                  {i > 0 && <span className="sep">·</span>}
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        {b.photo && <img className="paper-photo" src={b.photo} alt="" />}
      </header>

      {b.summary.trim() && <p className="paper-summary">{normalizeProse(b.summary)}</p>}</div>

      {view.work.length > 0 && (
        <Block title={t.work}>
          {view.work.map((w) => (
            <Work key={w.id} w={w} projects={view.projects.filter(p => p.workId === w.id)} />
          ))}
        </Block>
      )}

      {view.projects.some(p => !p.workId) && (
        <Block title={t.projects}>
          {view.projects.filter(p => !p.workId).map((p) => (
            <Project key={p.id} p={p} />
          ))}
        </Block>
      )}

      {view.research.length > 0 && (
        <Block title={t.research}>
          {view.research.map((w) => (
            <Work key={w.id} w={w} research />
          ))}
        </Block>
      )}

      {view.publications.length > 0 && (
        <Block title={t.publications}>
          <Publications items={view.publications} locale={locale} />
        </Block>
      )}

      {view.education.length > 0 && (
        <Block title={t.education}>
          {view.education.map((g) => (
            <div className="entry locatable" key={g.id} data-locate={g.id}>
              <div className="entry-head">
                <span className="entry-org">{g.org}</span>
                <span className="entry-date">{[g.start, g.end].filter(Boolean).join(' – ')}</span>
              </div>
              {(g.role || g.degree) && (
                <div className="entry-sub">
                  <span className="entry-role">{[g.role,g.degree].filter(Boolean).join(' · ')}</span>
                </div>
              )}
              {g.detail && <div className="entry-detail">{normalizeProse(g.detail)}</div>}
              <Bullets items={g.bullets} />
            </div>
          ))}
        </Block>
      )}

      {view.skills.length > 0 && (
        <Block title={t.skills}>
          <div className="skills locatable" data-locate="skills">
            {view.skills.map((s) => (
              <div className="skill-row locatable" data-locate={s.id} key={s.id}>
                <span className="skill-label">{s.label}</span>
                <span className="skill-value">{normalizeProse(s.value)}</span>
              </div>
            ))}
          </div>
        </Block>
      )}
      {(view.customCategories??[]).filter(c=>c.items.some(customItemHasContent)).map(category=><Block key={category.id} title={category.name} id={customCategoryLocateId(category.id)} titleId={fieldLocateId(customCategoryLocateId(category.id),'name')}>
        {category.items.filter(customItemHasContent).map(item=>{
          const id=customItemLocateId(category.id,item.id);
          return <div className="entry locatable" data-locate={id} key={item.id}>
            {item.title.trim()&&<div className="entry-head"><span className="entry-org" data-locate={fieldLocateId(id,'title')}>{item.title}</span></div>}
            <div className="custom-entry-fields">{category.fields.filter(f=>item.values[f.id]?.trim()).map(field=><span key={field.id} data-locate={fieldLocateId(id,`value:${field.id}`)}><span className="custom-field-label">{field.label}：</span>{item.values[field.id]}</span>)}</div>
            {item.body.trim()&&<p className="entry-context custom-entry-body" data-locate={fieldLocateId(id,'body')}>{item.body}</p>}
          </div>;
        })}
      </Block>)}
    </article>
  );
}
