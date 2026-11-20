import { SkillCard } from './SkillCard';
import { educationCardSummary, projectCardSummary, workCardSummary, type ArchiveCardSummaryData } from '../archiveCardSummary';
import { ArchiveCardSummary } from './ArchiveCardSummary';
import { editProjectDraft, editResearchSource, editDraft, switchDraftMode, researchDraft, researchDraftFromSource, researchSourceHash, researchSource, hasProjectDraft, switchProjectDraftMode, rewriteProjectDraft } from '../draftEditing';
import { StarExample } from './StarExample';
import { Hint } from './Hint';
import { MaterialExample } from './MaterialExample';
import { SummaryRewriteDialog } from './SummaryRewriteDialog';
import { ComposeDialog } from './ComposeDialog';
import { restoreMaterialItem } from '../materialItemsTrash';
import { emptyMaterialTrash } from '../materialTrash';
import { CategoryName } from './CategoryName';
import { CustomMaterials } from './CustomMaterials';
import { ArchiveDragHandle, ArchiveReorderContext } from './ArchiveDragHandle';
import { reorderArchiveCategory } from '../archiveCategoryOrder';
import { reorderArchiveMaterial } from '../archiveReorder';
import { ArchiveSidebar, archiveCategories } from './ArchiveSidebar';
import { ChevronDownIcon, TrashIcon } from '@radix-ui/react-icons';
import { LibrarySectionContext, LibrarySectionIcon, type LibrarySection } from './LibraryNav';
import { ActionMenu } from './ActionMenu';
import { CollapseMaterial } from './CollapseMaterial';
import { MaterialDisclosureContext, ExclusiveMaterialDisclosureContext, type ExclusiveMaterialGroups, useMaterialDisclosure, setMaterialDisclosure, expandNewLibraryMaterial } from '../useMaterialDisclosure';
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import type {
  Basics,
  BulletGroup,
  LinkItem,
  Master,
  Project,
  SkillGroup,
  WorkEntry,
} from '../types';
import { newEducation, newProject, newPublication, newSkill, newWork, uid } from '../data';
import { starFingerprint } from '../ai';
import { fileToPhotoDataUrl } from '../photo';
import { fieldLocateId, locate, registerLocate } from '../locate';
import { AutoTextarea, Field, IconButton } from './ui';
import { PublicationCard } from './PublicationCard';
import { PaperImport } from './PaperImport';
import { hitToPublicationFields } from '../crossref';

type ArchiveSaveStatus = 'idle' | 'saved' | 'failed' | 'paused';

function ArchiveEditorPane({ enabled, hidden, id, label, children }: {
  enabled: boolean; hidden: boolean; id: string; label: string; children: React.ReactNode;
}) {
  return enabled ? <div id={id} className="archive-inline-editor" hidden={hidden} role="region" aria-label={label}>{children}</div> : <>{children}</>;
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function Section({
  title,
  hint,
  onAdd,
  addLabel,
  children,
  count,
  materialIds,
  addAction,
  onSupplement,
}: {
  title: string;
  hint?: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
  count?: number;
  materialIds?: string[];
  addAction?: React.ReactNode;
  onSupplement?: () => void;
}) {
  const context = useContext(MaterialDisclosureContext);
  const category = useContext(LibrarySectionContext);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!category) return;
    const ids = new Set([...(materialIds ?? []), ...Array.from(sectionRef.current?.querySelectorAll<HTMLElement>('[data-locate]') ?? []).map(el => el.dataset.locate!)]);
    if (title === '基本信息') ids.add('basics');
    if (title === '技能') ids.add('skills');
    const off = [...ids].map(id => registerLocate(id, () => category.select(title as LibrarySection)));
    return () => off.forEach(fn => fn());
  });
  const collapsible = !!context && (title === '基本信息' || title === '技能');
  const [open, setOpen] = useMaterialDisclosure(`section-${title}`, true);
  useEffect(() => {
    if (!collapsible) return;
    return registerLocate(title === '基本信息' ? 'basics' : 'skills', () => setOpen(true));
  }, [collapsible, title]);
  return (
    <section ref={sectionRef} className={`section${category ? ' library-accordion' : ''}`} data-open={category ? category.active === title : undefined} id={`editor-${title}`} data-material-ids={materialIds?.join(' ')}>
      {category && <h2 className="library-accordion-heading"><button type="button" id={`library-toggle-${title}`} aria-expanded={category.active === title} aria-controls={`library-body-${title}`} onClick={() => category.select(title as LibrarySection)} onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(sectionRef.current?.closest('.editor')?.querySelectorAll<HTMLButtonElement>('.library-accordion-heading button') ?? []);
        const index = buttons.indexOf(event.currentTarget);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}><span className="library-accordion-icon"><LibrarySectionIcon title={title} /></span><span className="library-accordion-label">{title}<small>{{ '基本信息': '姓名、联系方式与个人简介', '工作经历': '记录职责与代表成果', '独立项目': '个人作品、开源与竞赛', '科研经历': '研究方向与学术贡献', '发表论文': '论文信息与作者位次', '教育经历': '学校、专业与学历', '技能': '整理专长与技能清单' }[title]}</small></span>{typeof count === 'number' && <span className="library-accordion-count">{count} {title === '发表论文' ? '篇' : title === '技能' ? '组' : title === '独立项目' ? '个项目' : '段经历'}</span>}<span className="library-accordion-chevron" aria-hidden="true"><ChevronDownIcon width={18} height={18} /></span></button></h2>}
      <div id={category ? `library-body-${title}` : undefined} role={category ? 'region' : undefined} aria-labelledby={category ? `library-toggle-${title}` : undefined} hidden={!!category && category.active !== title} className={category ? 'library-accordion-body' : undefined}>
      <div className="section-head">
        {category?.rename ? <CategoryName editable={false} name={category.names?.[title]||title} onSave={name=>category.rename?.(title,name)} headerActions={<MaterialExample title={title} compact hint={hint}/>}/> : <h2>
          {collapsible ? <button type="button" className="section-toggle" aria-expanded={open} onClick={event => setOpen(!open, event.currentTarget)}>{open ? '▾' : '▸'} {title}<span>{open ? '收起' : '展开编辑'}</span></button> : title}
          {typeof count === 'number' && count > 0 && <span className="count">{count}</span>}
          {hint && <Hint label={`${title}填写说明`}>{hint}</Hint>}
        </h2>}
        {!context && !category?.rename && !!count && title !== '技能' && <div className="section-disclosure-actions"><ActionMenu label="更多">
          <button type="button" className="btn-ghost small" onClick={e => setMaterialDisclosure(e.currentTarget.closest('.section'), true)}>全部展开</button>
          <button type="button" className="btn-ghost small" onClick={e => setMaterialDisclosure(e.currentTarget.closest('.section'), false)}>全部收起</button>
        </ActionMenu></div>}
        {onSupplement && <button type="button" className="btn-ghost" onClick={onSupplement}>从素材库补充</button>}
        {!context && addAction}
        {!context && onAdd && (
          <button type="button" className="btn-ghost" onClick={onAdd}>
            ＋ {context ? '本版新增' : (addLabel ?? '添加')}
          </button>
        )}
      </div>
      <div hidden={collapsible && !open} className={category?.rename && ['工作经历', '独立项目', '科研经历', '发表论文', '教育经历', '技能'].includes(title) ? 'archive-card-grid' : undefined}>
        {category&&!category.rename&&<MaterialExample title={title}/>}
        {category && count === 0 && <div className="library-empty"><span aria-hidden="true">＋</span><strong>还没有{title}</strong><p>点击右上方的添加按钮，记录第一条素材。</p></div>}
        {children}
      </div>
      </div>
    </section>
  );
}

function ExperienceSummary({ title, role, period, showRole = true, summary }: { title: string; role: string; period: string; showRole?: boolean; summary?: ArchiveCardSummaryData }) {
  return <span className={`experience-summary${showRole ? '' : ' experience-summary-brief'}`}><span className="experience-name">{title}</span>{showRole && <span className="experience-role">{role || '待填写'}</span>}<ArchiveCardSummary summary={summary}/><span className="experience-period">{period || '时间待填写'}</span></span>;
}

function EducationCard({ id, title, subtitle, role, period, summary, children, onRemove }: { id: string; title: string; subtitle: string; role: string; period: string; summary: ArchiveCardSummaryData; children: React.ReactNode; onRemove: () => void }) {
  const isVariant = !!useContext(MaterialDisclosureContext);
  const compact = !!useContext(LibrarySectionContext);
  const [open, setOpen, itemProps] = useMaterialDisclosure(id, compact ? false : !title, 'education');
  useEffect(() => registerLocate(id, () => setOpen(true)), [id]);
  return <div className={`card${compact ? ' experience-card' : ''}`} data-locate={id} {...itemProps}>
    <div className="card-head">
      {(compact || isVariant) && <ArchiveDragHandle id={id} label={title || '未命名学校'} />}
      <button type="button" className="card-toggle" aria-expanded={open} aria-controls={`education-${id}`} onClick={event => setOpen(!open, event.currentTarget)}>
        <span className={`caret${open ? ' open' : ''}`}>▸</span>
        {compact ? <ExperienceSummary title={title || '未命名学校'} role={role} period={period} showRole={false} summary={!open ? summary : undefined} /> : <><span className="card-title">{title || '（未命名学校）'}</span><span className="card-sub">{subtitle}</span></>}
        {!isVariant && <span className="disclosure-label">{open ? '收起' : '展开编辑'}</span>}
      </button>
      {(!isVariant || !open) && <IconButton title="删除教育经历" danger onClick={onRemove}><TrashIcon aria-hidden="true" /></IconButton>}
    </div>
    <div className="education-card-body" id={`education-${id}`} hidden={!open}>{children}<CollapseMaterial onCollapse={() => setOpen(false)} /></div>
  </div>;
}

function EditableBullets({ items, onChange }: { items: {id:string;text:string}[]; onChange: (items: {id:string;text:string}[]) => void }) {
  return <>{items.map((bullet, index) => <div className="field-block" data-locate={bullet.id} key={bullet.id}><span className="field-label">要点 {index + 1}</span><AutoTextarea value={bullet.text} onChange={text => onChange(items.map(b => b.id === bullet.id ? {...b, text} : b))} /></div>)}</>;
}

export const MaterialImportContext=createContext<((id?:string)=>void)|null>(null);
export const MaterialRewriteContext=createContext<((id:string)=>void)|null>(null);
function ProjectCard({
  project,
  disclosureGroup = 'projects',
  targetRole,
  onChange,
  onRemove,
  onMoveDown,
  onMoveUp,
}: {
  project: Project;
  disclosureGroup?: string;
  targetRole: string;
  onChange: (p: Partial<Project>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isVariant = !!useContext(MaterialDisclosureContext);
  const sourceDetails = useRef<HTMLDetailsElement>(null);
  const composed = switchProjectDraftMode(project, 'paragraph', uid);
  const display = project.display ?? 'summary';
  const hasDraft = hasProjectDraft({...project, composed});
  // 新建的空项目默认展开，已有的默认收起
  const compact = !!useContext(LibrarySectionContext);
  const [open, setOpen, itemProps] = useMaterialDisclosure(project.id, compact ? false : !project.name && !project.situation, disclosureGroup);
  const [rewriting, setRewriting] = useState(false);
  const [composing, setComposing] = useState(false);
  const hasStar = [project.situation, project.task, ...project.actions.map(b => b.text), ...project.results.map(b => b.text)].some(text => text.trim());
  const [lastSummaryAction, setLastSummaryAction] = useState<'生成' | '改写'>('改写');
  const summaryText = composed.mode === 'paragraph' ? composed.text : composed.bullets.map(b => b.text).join('\n');
  const [previousDraft, setPreviousDraft] = useState<Project['composed']>();
  useEffect(() => registerLocate(project.id, () => setOpen(true)), [project.id]);
  const date = [project.start, project.end].filter(Boolean).join(' – ');
  const missingResult = !hasDraft && !project.results.some((r) => r.text.trim());
  const stale = Boolean(project.composed && composed.sourceHash !== starFingerprint(project));
  const changeSource = (patch: Partial<Project>) => onChange({composed, ...patch});

  const sourceFields = (<> <div className="research-star-fields project-star-fields"><div className="field-block" data-locate={fieldLocateId(project.id, 'situation')}>
            <div className="field-label-row"><span className="field-label">背景（S）</span><StarExample kind="project" part="situation"/></div>
            <AutoTextarea
              ariaLabel="项目背景（S）"
              value={project.situation}
              minRows={2}
              onChange={(v) => changeSource({ situation: v })}
              placeholder="为什么做这个项目？当时是什么处境、有什么问题？"
            />
          </div>

          <div className="field-block" data-locate={fieldLocateId(project.id, 'task')}>
            <div className="field-label-row"><span className="field-label">目标（T）</span><StarExample kind="project" part="task"/></div>
            <AutoTextarea
              ariaLabel="项目目标（T）"
              value={project.task}
              minRows={2}
              onChange={(v) => changeSource({ task: v })}
              placeholder="要达成什么？尽量可衡量。"
            />
          </div>

          {(['actions','results'] as const).map(key=><div className="field-block" data-locate={fieldLocateId(project.id, key)} key={key}><div className="field-label-row"><span className="field-label">{key==='actions'?'行动（A）':'结果（R）'}</span><StarExample kind="project" part={key==='actions'?'action':'result'}/></div><AutoTextarea ariaLabel={key==='actions'?'项目行动（A）':'项目结果（R）'} minRows={2} value={project[key].map(b=>b.text).join('\n')} onChange={text=>changeSource({[key]:text.split('\n').map((text,i)=>({id:project[key][i]?.id??uid(),text}))})}/></div>)}</div> </>);

  const sourceWorkspace = (<div className="draft-workspace project-source-workspace">
            <div className="project-summary-head"><div className="field-label-row"><strong>STAR{display === 'star' && <span className="draft-visible-badge">显示在简历</span>}</strong><Hint label="项目 STAR 填写说明">先梳理背景、目标、行动和结果，修改不会覆盖已编辑的总结。</Hint></div></div>
            {sourceFields}
          </div>);
  const summaryWorkspace = (<div className="draft-workspace project-summary-workspace" data-locate={fieldLocateId(project.id, 'summary')}>
            <div className="project-summary-head">
              <div className="field-label-row"><strong>项目总结{display === 'summary' && <span className="draft-visible-badge">显示在简历</span>}</strong><Hint label="项目总结填写说明"><p>一段讲清：项目问题与职责 → 关键做法 → 实际成果。AI 结果先预览，确认后应用。</p><p>{display === 'star' ? '当前简历显示 STAR；选择“项目总结”后展示以下正文。' : isVariant ? '直接编辑简历正文，仅影响当前版本。' : '直接填写项目过程与成果。'}{composed.mode === 'bullets' ? '每行一条。' : ''}</p></Hint></div>
              <div className="project-summary-tools">
                <button type="button" className="btn small primary-ghost" disabled={!hasStar} title={hasStar ? '根据 STAR 生成一段项目总结，预览后应用' : '请先展开并填写 STAR 原始素材'} onClick={() => setComposing(true)}>根据 STAR 生成</button>
                <button type="button" className="btn small" disabled={!hasDraft} title={hasDraft ? '改写当前总结，预览后应用' : '请先填写项目总结'} onClick={() => setRewriting(true)}>AI 改写</button>
              </div>
            </div>
            <AutoTextarea ariaLabel="项目总结正文" minRows={5} value={summaryText} placeholder="写清你做了什么、如何解决问题，以及取得的成果。" onChange={text => {setPreviousDraft(undefined); onChange({composed:editProjectDraft({...project, composed},text,uid)});}} />
            {previousDraft && <button type="button" className="btn-ghost small" onClick={() => {onChange({composed:previousDraft});setPreviousDraft(undefined);}}>撤销本次{lastSummaryAction}</button>}
            {stale && <p className="field-hint warn">STAR 原始素材已更新，当前总结保持不变；可根据 STAR 重新生成。</p>}
          </div>);

  return (
    <div className={`pcard${compact ? ' experience-card' : ''}`} data-locate={project.id} {...itemProps}>
      <div className="pcard-head">
        {(compact || isVariant) && <ArchiveDragHandle id={project.id} label={project.name || '未命名项目'} />}
        <button type="button" className="card-toggle" aria-expanded={open} onClick={event => setOpen(!open, event.currentTarget)}>
          <span className={`caret${open ? ' open' : ''}`}>▸</span>
          {compact ? <ExperienceSummary title={project.name || '未命名项目'} role={project.role} period={date} showRole={false} summary={!open && disclosureGroup === 'projects' ? projectCardSummary(project) : undefined} /> : <><span className="pcard-title">{project.name || '（未命名项目）'}</span><span className="pcard-sub">{[project.role, date].filter(Boolean).join(' · ')}</span>{(missingResult || !project.start.trim()) && <span className="pcard-flag">{missingResult ? '待补充成果' : '待补充时间'}</span>}</>}
          {!isVariant && <span className="disclosure-label">{open ? '收起' : '展开编辑'}</span>}
        </button>
        <div className="card-actions">
          {!compact && !isVariant && <><IconButton title="上移" onClick={onMoveUp}>↑</IconButton><IconButton title="下移" onClick={onMoveDown}>↓</IconButton></>}
          {(!isVariant || !open) && <IconButton title="删除项目" danger onClick={onRemove}>
            <TrashIcon aria-hidden="true" />
          </IconButton>}
        </div>
      </div>

      {open && (
        <div className="pcard-body">
          <div className="grid-2">
            <Field
              locateId={fieldLocateId(project.id, 'name')}
              label="项目名称"
              value={project.name}
              onChange={(v) => onChange({ name: v })}
              placeholder="交易链路可观测平台"
            />
            <Field locateId={fieldLocateId(project.id, 'role')} label="我的角色" value={project.role} onChange={(v) => onChange({ role: v })} placeholder="负责人" />
            <Field locateId={fieldLocateId(project.id, 'start')} label="开始" value={project.start} onChange={(v) => onChange({ start: v })} placeholder="2023.03" />
            <Field locateId={fieldLocateId(project.id, 'end')} label="结束" value={project.end} onChange={(v) => onChange({ end: v })} placeholder="2023.11" />
          </div>

          <div className="field-block">
            <Field locateId={fieldLocateId(project.id, 'stack')} label="技术栈" value={project.stack}
              placeholder="Go · OpenTelemetry · ClickHouse" onChange={stack => onChange({stack})}/>
          </div>

          <div className="project-display-control">
            <span className="field-label">简历显示</span>
            <div className="seg" role="group" aria-label="项目简历显示内容">
              <button type="button" aria-pressed={display === 'summary'} className={display === 'summary' ? 'active' : ''} onClick={() => {onChange({display:'summary'}); if (sourceDetails.current) sourceDetails.current.open = false;}}>项目总结</button>
              <button type="button" aria-pressed={display === 'star'} className={display === 'star' ? 'active' : ''} onClick={() => {onChange({display:'star'}); if (sourceDetails.current) sourceDetails.current.open = true;}}>STAR</button>
            </div>
          </div>
          {isVariant ? <div className="project-draft-sections">
            {summaryWorkspace}
            <details ref={sourceDetails} className="draft-reference">
              <summary><ChevronDownIcon aria-hidden="true" /><span>查看 STAR 原始素材</span><small>{display === 'star' ? '当前显示在简历' : '辅助梳理，不直接显示在简历'}</small></summary>
              {sourceWorkspace}
            </details>
          </div> : <>{sourceWorkspace}{summaryWorkspace}</>}
          <CollapseMaterial onCollapse={() => setOpen(false)} />
        </div>
      )}

      {rewriting && <SummaryRewriteDialog subject="项目总结"
        original={summaryText} targetRole={targetRole}
        onApply={text => {setPreviousDraft(composed);setLastSummaryAction('改写');onChange(rewriteProjectDraft({...project,composed},text,uid));setRewriting(false);}}
        onClose={() => setRewriting(false)}/>}
      {composing && <ComposeDialog project={project} targetRole={targetRole}
        onApply={next => {setPreviousDraft(composed);setLastSummaryAction('生成');onChange({composed:next});setComposing(false);}}
        onClose={() => setComposing(false)}/>}
    </div>
  );
}

/* ---------- 工作卡片 ---------- */

function WorkCard({
  work,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddProject,
  onProjectChange,
  onProjectRemove,
  onProjectMove,
  targetRole,
  companyLabel = '公司',
  roleLabel = '职位',
  showProjects = true,
  showSummary = false,
}: {
  work: WorkEntry;
  index: number;
  total: number;
  onChange: (p: Partial<WorkEntry>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddProject: () => void;
  onProjectChange: (pid: string, p: Partial<Project>) => void;
  onProjectRemove: (pid: string) => void;
  onProjectMove: (pid: string, delta: number) => void;
  targetRole: string;
  companyLabel?: string;
  roleLabel?: string;
  showProjects?: boolean;
  showSummary?: boolean;
}) {
  const sourceDetails = useRef<HTMLDetailsElement>(null);
  const isVariant = !!useContext(MaterialDisclosureContext);
  const [summaryCompose, setSummaryCompose] = useState(false);
  const [previousResearchDraft, setPreviousResearchDraft] = useState<WorkEntry['researchDraft']>();
  const draft = switchDraftMode(researchDraft(work), 'paragraph', uid);
  const [researchGenerating, setResearchGenerating] = useState(false);
  const draftText = draft.mode === 'paragraph' ? draft.text : draft.bullets.map(b => b.text).join('\n');
  const sourceDraft = researchDraftFromSource(work);
  const applyResearchDraft = (next: NonNullable<WorkEntry['researchDraft']>) => {
    setPreviousResearchDraft(draft);
    onChange({researchDraft: next});
  };
  const importMaterials=useContext(MaterialImportContext);
  const compact = !!useContext(LibrarySectionContext);
  const [open, setOpen, itemProps] = useMaterialDisclosure(work.id, compact ? false : !work.company, showProjects ? 'work' : 'research');
  const date = [work.start, work.end].filter(Boolean).join(' – ');

  // 点预览里的公司会展开这张卡片；点公司下的项目也要先把它展开
  const projectIds = work.projects.map((p) => p.id).join(',');
  useEffect(() => {
    const offs = [
      registerLocate(work.id, () => setOpen(true)),
      ...projectIds
        .split(',')
        .filter(Boolean)
        .map((pid) => registerLocate(pid, () => setOpen(true))),
    ];
    return () => offs.forEach((off) => off());
  }, [work.id, projectIds]);

  const researchSourceFields = <div className="research-star-fields">
    {([{key:'situation',label:'背景（S）',placeholder:'研究背景、问题与挑战'},{key:'task',label:'目标（T）',placeholder:'需要解决的问题与个人承担的任务'},{key:'action',label:'行动（A）',placeholder:'采取的方法、实验与技术路线'},{key:'result',label:'结果（R）',placeholder:'研究成果、数据与实际贡献，包括发表论文、专利或获奖等'}] as const).map(field =>
      <div className="field-block" key={field.key} data-locate={fieldLocateId(work.id,field.key)}>
        <div className="field-label-row"><span className="field-label">{field.label}</span><StarExample part={field.key}/></div>
        <AutoTextarea ariaLabel={`研究${field.label}`} minRows={2} value={researchSource(work)[field.key]} placeholder={field.placeholder}
          onChange={value => onChange({researchDraft: draft, ...editResearchSource(work,field.key,value)})}/>
      </div>)}
  </div>;

  const sourceWorkspace = (<div className="draft-workspace project-source-workspace">
              <div className="project-summary-head"><div className="field-label-row"><strong>STAR{work.researchDisplay === 'star' && <span className="draft-visible-badge">显示在简历</span>}</strong><Hint label="科研 STAR 填写说明">用于梳理和核对事实，修改后不会覆盖已编辑的总结。</Hint></div></div>
              {researchSourceFields}

            </div>);
  const summaryWorkspace = (<div className="draft-workspace project-summary-workspace" data-locate={fieldLocateId(work.id, 'summary')}>
              <div className="project-summary-head">
                <div className="field-label-row"><strong>研究总结{work.researchDisplay !== 'star' && <span className="draft-visible-badge">显示在简历</span>}</strong><Hint label="研究总结填写说明"><p>一段讲清：研究问题与职责 → 关键方法与实验 → 实际成果。AI 结果先预览，确认后应用。</p><p>{isVariant ? '直接编辑简历正文，仅影响当前版本。' : '直接编辑研究总结，可用于创建投递版本。'}{draft.mode === 'bullets' && '每行一条。'}</p></Hint></div>
                <div className="project-summary-tools">
                  <button className="btn small primary-ghost" type="button" disabled={!sourceDraft.text.trim()} title="根据研究 STAR 生成一段总结，预览后应用" onClick={() => setResearchGenerating(true)}>根据 STAR 生成</button>
                  <button className="btn small" type="button" disabled={!draftText.trim()} title="改写当前研究总结，预览后应用" onClick={() => setSummaryCompose(true)}>AI 改写</button>
                </div>
              </div>
              <AutoTextarea ariaLabel="研究总结正文" minRows={5} value={draftText} placeholder="描述研究问题、方法与成果，可参考上方 STAR"
                onChange={text => {setPreviousResearchDraft(undefined);onChange({researchDraft:editDraft(draft,text,uid)});}}/>
              {previousResearchDraft && <button className="btn-ghost small" type="button" onClick={() => {onChange({researchDraft:previousResearchDraft});setPreviousResearchDraft(undefined);}}>撤销本次整理</button>}
              {draft.sourceHash !== researchSourceHash(work) && <p className="field-hint">原始 STAR 已更新，当前总结保持不变，可按需重新整理。</p>}
            </div>);

  return (
    <div className={`card${compact ? ' experience-card' : ''}`} data-locate={work.id} {...itemProps}>
      <div className="card-head">
        {(compact || isVariant) && <ArchiveDragHandle id={work.id} label={work.company || '未命名经历'} />}
        <button type="button" className="card-toggle" aria-expanded={open} onClick={event => setOpen(!open, event.currentTarget)}>
          <span className={`caret${open ? ' open' : ''}`}>▸</span>
          {compact ? <ExperienceSummary title={work.company || (showProjects ? '未命名公司' : '未命名机构')} role={work.role} period={date} showRole={false} summary={!open ? workCardSummary(work, !showProjects) : undefined} /> : <>
          <span className="card-title">{work.company || '（未命名公司）'}</span>
          {[work.role, date].filter(Boolean).length > 0 && (
            <span className="card-sub">{[work.role, date].filter(Boolean).join(' · ')}</span>
          )}
          {work.projects.length > 0 && <span className="count">{work.projects.length} 项目</span>}
          </>}
          {!isVariant && <span className="disclosure-label">{open ? '收起' : '展开编辑'}</span>}
        </button>
        <div className="card-actions">
          {!compact && !isVariant && <><IconButton title="上移" onClick={onMoveUp}>↑</IconButton><IconButton title="下移" onClick={onMoveDown}>↓</IconButton></>}
          {(!isVariant || !open) && <IconButton title="删除" danger onClick={onRemove}>
            <TrashIcon aria-hidden="true" />
          </IconButton>}
        </div>
      </div>

      {open && (
        <div className="card-body">
          <div className="grid-2">
            <Field
              locateId={fieldLocateId(work.id, 'company')}
              label={companyLabel}
              value={work.company}
              onChange={(v) => onChange({ company: v })}
              placeholder={showProjects ? '某某科技有限公司' : '某某大学 分布式系统实验室'}
            />
            <Field
              locateId={fieldLocateId(work.id, 'role')}
              label={roleLabel}
              value={work.role}
              onChange={(v) => onChange({ role: v })}
              placeholder={showProjects ? '高级后端工程师' : '研究助理'}
            />
            <Field locateId={fieldLocateId(work.id, 'start')} label="开始" value={work.start} onChange={(v) => onChange({ start: v })} placeholder="2022.06" />
            <Field locateId={fieldLocateId(work.id, 'end')} label="结束" value={work.end} onChange={(v) => onChange({ end: v })} placeholder="至今" />
            <Field locateId={fieldLocateId(work.id, 'location')} label="城市（可空）" value={work.location} onChange={(v) => onChange({ location: v })} placeholder="杭州" />

          </div>

          {showSummary && <>
            <div className="project-display-control">
              <span className="field-label">简历显示</span>
              <div className="seg" role="group" aria-label="科研简历显示内容">
                <button type="button" aria-pressed={work.researchDisplay !== 'star'} className={work.researchDisplay !== 'star' ? 'active' : ''} onClick={()=>{onChange({researchDisplay:'summary'}); if (sourceDetails.current) sourceDetails.current.open = false;}}>研究总结</button>
                <button type="button" aria-pressed={work.researchDisplay === 'star'} className={work.researchDisplay === 'star' ? 'active' : ''} onClick={()=>{onChange({researchDisplay:'star'}); if (sourceDetails.current) sourceDetails.current.open = true;}}>STAR</button>
              </div>
            </div>
            {isVariant ? <div className="project-draft-sections">
              {summaryWorkspace}
              <details ref={sourceDetails} className="draft-reference">
                <summary><ChevronDownIcon aria-hidden="true" /><span>查看 STAR 原始素材</span><small>{work.researchDisplay === 'star' ? '当前显示在简历' : '辅助梳理，不直接显示在简历'}</small></summary>
                {sourceWorkspace}
              </details>
            </div> : <>{sourceWorkspace}{summaryWorkspace}</>}

          </>}
          {showProjects && (
          <div className="projects-block">
            <div className="projects-head">
              <span className="field-label">该公司项目 {work.projects.length > 0 && `（${work.projects.length}）`}</span>
              <button type="button" className="btn-ghost small" onClick={()=>importMaterials?importMaterials(`projects:${work.id}`):onAddProject()}>
                {importMaterials?'从素材库导入项目':'＋ 添加项目'}
              </button>
            </div>
            {work.projects.length === 0 && <p className="vempty">这个岗位下还没有项目。</p>}
            {work.projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                disclosureGroup={`projects:${work.id}`}
                targetRole={targetRole}
                onChange={(patch) => onProjectChange(p.id, patch)}
                onRemove={() => onProjectRemove(p.id)}
                onMoveUp={() => onProjectMove(p.id, -1)}
                onMoveDown={() => onProjectMove(p.id, 1)}
              />
            ))}
          </div>
          )}

          <div className="card-footer">
            第 {index + 1} / {total} 段
            <CollapseMaterial onCollapse={() => setOpen(false)} />
          </div>
        </div>
      )}
      {researchGenerating && <ComposeDialog subject="研究总结" targetRole={targetRole} project={{id:work.id,name:work.company,role:work.role,start:work.start,end:work.end,stack:'',situation:researchSource(work).situation,task:researchSource(work).task,actions:[{id:work.id+':action',text:researchSource(work).action}],results:[{id:work.id+':result',text:researchSource(work).result}]}} onApply={next=>{applyResearchDraft({...next,sourceHash:researchSourceHash(work)});setResearchGenerating(false);}} onClose={()=>setResearchGenerating(false)}/>}
      {summaryCompose && <SummaryRewriteDialog subject="研究总结"
        original={draftText} targetRole={targetRole}
        onApply={text => {applyResearchDraft(switchDraftMode({...draft,mode:'paragraph',text,sourceHash:draftText.trim() ? draft.sourceHash : researchSourceHash(work)},draft.mode,uid));setSummaryCompose(false);}}
        onClose={() => setSummaryCompose(false)}/>}


    </div>
  );
}

/* ---------- 主编辑器 ---------- */

export function Editor({ master, onChange, onSupplement, activeSection: requestedSection, onSelectSection, saveStatus, trashOpen = false, onTrashOpenChange, onCreateCategory, archiveTools }: { master: Master; onChange: (m: Master) => void; onSupplement?: (category: string) => void; activeSection?: LibrarySection | null; onSelectSection?: (section: LibrarySection | null) => void; saveStatus?: ArchiveSaveStatus; trashOpen?: boolean; onTrashOpenChange?: (open: boolean) => void; onCreateCategory?: () => void; archiveTools?: React.ReactNode }) {
  const isVariant = !!useContext(MaterialDisclosureContext);
  const setTrashOpen = (open: boolean) => onTrashOpenChange?.(open);
  const [expandedGroups, setExpandedGroups] = useState<ExclusiveMaterialGroups>({});
  const expandNewExperience = (id: string, group: string) => {
    if (requestedSection !== undefined) setExpandedGroups(previous => ({ ...previous, [group]: id }));
    else expandNewLibraryMaterial(id);
  };
  const contentId = useId();
  const categories = archiveCategories(master);
  const activeSection = requestedSection === undefined ? undefined : categories.find(category => category.key === requestedSection)?.key ?? categories[0]?.key ?? null;
  const activeName = categories.find(category => category.key === activeSection)?.name ?? '档案';
  const editorRef = useRef<HTMLDivElement>(null);
  const openSection = (section: LibrarySection) => {
    setTrashOpen(false); onSelectSection?.(section);
  };
  const showOverview = () => {
    editorRef.current?.querySelectorAll<HTMLElement>(':popover-open').forEach(popover => popover.hidePopover());
    editorRef.current?.querySelectorAll('.action-menu[open]').forEach(menu => menu.removeAttribute('open'));
    setTrashOpen(false); onSelectSection?.(null);
    requestAnimationFrame(() => {
      const card = editorRef.current?.querySelector<HTMLButtonElement>('[data-archive-section][aria-current="true"]');
      (card ?? editorRef.current?.closest('#work-content')?.querySelector<HTMLButtonElement>('.archive-trash-button'))?.focus({ preventScroll: true });
    });
  };
  const deleteCategory=(key:string)=>{
    set(m=>({...m,hiddenCategories:[...(m.hiddenCategories??[]),key]}));
    showOverview();
  };
  const set = (fn: (m: Master) => Master) => onChange(fn(master));
  const [, setDeletions] = useState<{ label: string; restore: (m: Master) => Master }[]>([]);
  const removeItem = <K extends 'work' | 'research' | 'publications' | 'education' | 'skills' | 'sideProjects'>(key: K, id: string, label: string) => {
    const list = master[key];
    const index = list.findIndex(item => item.id === id);
    if (index < 0) return;
    const item = list[index];
    onChange({ ...master, [key]: list.filter(entry => entry.id !== id) });
    setDeletions(history => [...history, { label, restore: m => {
      if (m[key].some(entry => entry.id === id)) return m;
      const restored = [...m[key]];
      restored.splice(Math.min(index, restored.length), 0, item);
      return { ...m, [key]: restored };
    } }]);
  };
  const basics = master.basics;
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState('');
  const [paperImport, setPaperImport] = useState(false);

  const pickPhoto = async (file: File) => {
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      set((m) => ({ ...m, basics: { ...m.basics, photo: dataUrl } }));
      setPhotoError('');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '照片处理失败');
    }
  };
  const setBasics = (p: Partial<Basics>) => set((m) => ({ ...m, basics: { ...m.basics, ...p } }));

  const patchWork = (id: string, p: Partial<WorkEntry>) =>
    set((m) => ({ ...m, work: m.work.map((w) => (w.id === id ? { ...w, ...p } : w)) }));

  const patchResearch = (id: string, p: Partial<WorkEntry>) =>
    set((m) => ({ ...m, research: m.research.map((w) => (w.id === id ? { ...w, ...p } : w)) }));

  const setResearch = (fn: (m: Master) => Master) => set(fn);
  const setPublication = (fn: (m: Master) => Master) => set(fn);

  const patchProject = (workId: string | null, pid: string, p: Partial<Project>) =>
    set((m) => {
      if (workId === null) {
        return { ...m, sideProjects: m.sideProjects.map((x) => (x.id === pid ? { ...x, ...p } : x)) };
      }
      return {
        ...m,
        work: m.work.map((w) =>
          w.id !== workId ? w : { ...w, projects: w.projects.map((x) => (x.id === pid ? { ...x, ...p } : x)) },
        ),
      };
    });

  const addProject = (workId: string | null) => {
    const p = newProject();
    expandNewExperience(p.id, workId === null ? 'projects' : `projects:${workId}`);
    set((m) => {
      if (workId === null) return { ...m, sideProjects: [...m.sideProjects, p] };
      return { ...m, work: m.work.map((w) => (w.id === workId ? { ...w, projects: [...w.projects, p] } : w)) };
    });
    locate(p.id, { focus: true });
  };

  const removeProject = (workId: string | null, pid: string) => {
    if (workId === null) { removeItem('sideProjects', pid, master.sideProjects.find(p => p.id === pid)?.name || '未命名项目'); return; }
    const work = master.work.find(w => w.id === workId);
    const index = work?.projects.findIndex(p => p.id === pid) ?? -1;
    const project = work?.projects[index];
    if (!project) return;
    set(m => ({ ...m, work: m.work.map(w => w.id === workId ? { ...w, projects: w.projects.filter(p => p.id !== pid) } : w) }));
    setDeletions(history => [...history, { label: project.name || '未命名项目', restore: m => ({ ...m, work: m.work.map(w => {
      if (w.id !== workId || w.projects.some(p => p.id === pid)) return w;
      const projects = [...w.projects];
      projects.splice(Math.min(index, projects.length), 0, project);
      return { ...w, projects };
    }) }) }]);
  };

  const moveProject = (workId: string | null, pid: string, delta: number) =>
    set((m) => {
      if (workId === null) {
        const i = m.sideProjects.findIndex((x) => x.id === pid);
        return { ...m, sideProjects: move(m.sideProjects, i, delta) };
      }
      return {
        ...m,
        work: m.work.map((w) => {
          if (w.id !== workId) return w;
          const i = w.projects.findIndex((x) => x.id === pid);
          return { ...w, projects: move(w.projects, i, delta) };
        }),
      };
    });

  const photoField = (
    <div className="photo-field">
      {basics.photo ? (
        <div className="photo-inline">
          <img src={basics.photo} alt="个人照片" />
          <div className="photo-actions">
            <button type="button" className="link-btn" onClick={() => photoRef.current?.click()}>
              更换
            </button>
            <button type="button" className="link-btn" onClick={() => setBasics({ photo: undefined })}>
              移除
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost small" onClick={() => photoRef.current?.click()}>
          ＋ 添加个人照片{activeSection === undefined ? '（可选）' : ''}
        </button>
      )}
      {photoError && <span className="field-hint warn">{photoError}</span>}
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickPhoto(f);
          e.target.value = '';
        }}
      />
    </div>
  );

  const setLinks = (links: LinkItem[]) => setBasics({ links });
  const setSkills = (skills: SkillGroup[]) => set((m) => ({ ...m, skills }));
  const patchEducation = (id: string, p: Partial<BulletGroup>) =>
    set((m) => ({ ...m, education: m.education.map((g) => (g.id === id ? { ...g, ...p } : g)) }));

  return (
    <ArchiveReorderContext.Provider value={activeSection !== undefined || isVariant ? (source, target, position) => set(master => reorderArchiveMaterial(master, source, target, position)) : null}><ExclusiveMaterialDisclosureContext.Provider value={activeSection !== undefined ? { groups: expandedGroups, setGroups: setExpandedGroups } : null}><LibrarySectionContext.Provider value={activeSection !== undefined && onSelectSection ? { active: activeSection, select: onSelectSection, names: master.categoryNames, remove:deleteCategory, rename:(key,name)=>set(m=>({...m,categoryNames:{...m.categoryNames,[key]:name}})) } : null}><div ref={editorRef} className="editor" data-archive-view={activeSection === undefined ? undefined : trashOpen ? 'trash' : 'inline'} data-trash-open={trashOpen} onClickCapture={event=>{
      if(onSupplement)return;
      const button=(event.target as HTMLElement).closest('button');
      if(!button||button.disabled||button.matches('[data-archive-section]'))return;
      const action=button.getAttribute('aria-label')||button.title||button.textContent||'';
      if(!/删除|移除/.test(action)||/还原|恢复|撤销/.test(action))return;
      const container=button.closest('.card, .pcard, .custom-material-item');
      const name=container?.querySelector('.experience-name, .card-title, .pcard-title, strong')?.textContent?.trim();
      const target=name?`「${name}」中的${action}`:action;
      if(!window.confirm(`确认${target}？`)||!window.confirm('再次确认：将所选素材移入回收站。若删除整个类别或经历，其下内容也会一并移入，之后可在回收站还原。')){event.preventDefault();event.stopPropagation();}
    }}>
      {activeSection !== undefined && onSelectSection && <aside className="archive-sidebar"><ArchiveSidebar master={master} active={trashOpen ? null : activeSection} contentId={contentId} onSelect={openSection} onReorder={(source, target, position) => { if (!trashOpen && activeSection) onSelectSection?.(activeSection); set(master => reorderArchiveCategory(master, source, target, position)); }} />{archiveTools}</aside>}
      {trashOpen&&<section className="category-trash-panel"><header className="section-head"><h2>回收站</h2><button className="btn trash-clear" disabled={!((master.hiddenCategories??[]).length+(master.trashItems??[]).length)} onClick={()=>{if(window.confirm('永久清除回收站中的所有素材？')&&window.confirm('再次确认：清空后无法还原。内置类别恢复为空类别，自定义类别彻底移除。')){set(emptyMaterialTrash);setDeletions([]);}}}>清空回收站</button><button className="btn" onClick={showOverview}>返回档案库</button></header><p className="section-hint">已删除的类别和素材可逐项还原；子条目需先还原所属经历或类别。</p>{!((master.hiddenCategories??[]).length+(master.trashItems??[]).length)&&<div className="library-empty"><TrashIcon width={24} height={24}/><strong>回收站为空</strong><p>删除的类别和素材会出现在这里。</p></div>}{(master.hiddenCategories??[]).map(key=>{const custom=key.startsWith('custom:')?master.customCategories?.find(c=>`custom:${c.id}`===key):null;const name=custom?.name||master.categoryNames?.[key]||key;return <div className="category-trash-row" key={key}><div><strong>{name}</strong><p>类别内容已保留</p></div><button className="btn" onClick={()=>set(m=>({...m,hiddenCategories:(m.hiddenCategories??[]).filter(k=>k!==key)}))}>还原</button></div>;})}{(master.trashItems??[]).map(item=><div className="category-trash-row" key={item.id}><div><strong>{item.label}</strong><p>素材条目 · {new Date(item.deletedAt).toLocaleString()}</p></div><button className="btn" onClick={()=>{const restored=restoreMaterialItem(master,item.id);if(restored)onChange(restored);else window.alert('请先还原所属经历或类别，再还原此条目。');}}>还原</button></div>)}</section>}
      <ArchiveEditorPane enabled={activeSection !== undefined} hidden={trashOpen} id={contentId} label={`编辑${activeName}`}>
      {activeSection !== undefined && (saveStatus === 'failed' || saveStatus === 'paused') && <p className="archive-inline-save-error" role="alert">{saveStatus === 'failed' ? '保存失败，请先备份内容' : '保存已暂停'}</p>}
      {activeSection === null && <div className="library-empty"><strong>暂无档案类别</strong><button type="button" className="btn" onClick={onCreateCategory}>新增类别</button></div>}
      {(master.customCategories??[]).filter(c=>activeSection===`custom:${c.id}`).map(c=><CustomMaterials key={c.id} category={c} onChange={next=>set(m=>({...m,customCategories:(m.customCategories??[]).map(x=>x.id===c.id?next:x)}))} onDelete={()=>{deleteCategory(`custom:${c.id}`);}}/>)}
      <div data-locate="basics">
      <Section title="基本信息">
        {activeSection === undefined && photoField}
        <div className="grid-2 basics-grid">
          <Field label="姓名" value={basics.name} onChange={(v) => setBasics({ name: v })} placeholder="陈墨" />
          {activeSection === undefined ? <Field label="目标职位" value={basics.title} onChange={(v) => setBasics({ title: v })} placeholder="后端工程师" /> : <div className="field basics-photo-field">
            <span className="field-label">个人照片（可选）</span>
            {photoField}
          </div>}
          <Field label="手机" value={basics.phone} onChange={(v) => setBasics({ phone: v })} placeholder="138-0000-0000" />
          <Field label="邮箱" value={basics.email} onChange={(v) => setBasics({ email: v })} placeholder="you@example.com" />
          <Field label="城市" value={basics.city} onChange={(v) => setBasics({ city: v })} placeholder="杭州" />
          {activeSection !== undefined && <Field label="目标职位" value={basics.title} onChange={(v) => setBasics({ title: v })} placeholder="后端工程师" />}
        </div>

        <div className="field-block basics-links">
          <span className="field-label">链接</span>
          {basics.links.map((l) => (
            <div className="inline-row" key={l.id}>
              <input
                className="w-90"
                aria-label="链接名称"
                value={l.label}
                placeholder="GitHub"
                onChange={(e) => setLinks(basics.links.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))}
              />
              <input
                aria-label="链接地址"
                value={l.url}
                placeholder="github.com/yourname"
                onChange={(e) => setLinks(basics.links.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)))}
              />
              <IconButton title="删除链接" danger onClick={() => setLinks(basics.links.filter((x) => x.id !== l.id))}>
                <TrashIcon aria-hidden="true" />
              </IconButton>
            </div>
          ))}
          <button hidden={!!onSupplement} type="button" className="btn-ghost small" onClick={() => setLinks([...basics.links, { id: uid(), label: '', url: '' }])}>
            ＋ 添加链接
          </button>
        </div>

        <div className="field-block basics-summary">
          <div className="field-label-row"><span className="field-label">一句话简介</span><Hint label="一句话简介填写说明">3 行以内最佳：年限 + 领域 + 一个最硬的成果。</Hint></div>
          <AutoTextarea
            ariaLabel="一句话简介"
            value={basics.summary}
            onChange={(v) => setBasics({ summary: v })}
            placeholder="4 年后端经验，专注高并发交易系统。主导过单机 3 万 QPS 的订单服务重构……"
            minRows={3}
          />
        </div>
      </Section>
      </div>

      <Section
        title="工作经历" onSupplement={onSupplement ? () => onSupplement('work') : undefined}
        count={master.work.length}
        materialIds={master.work.flatMap(w => [w.id, ...w.projects.map(p => p.id)])}
        onAdd={() => {
          const item = newWork();
          expandNewExperience(item.id, 'work');
          set((m) => ({ ...m, work: [...m.work, item] }));
          locate(item.id, { focus: true });
        }}
        addLabel="添加经历"
        hint="按时间倒序填写任职信息，在对应公司下添加项目，描述你的工作成果。"
      >
        {master.work.map((w, i) => (
          <WorkCard
            key={w.id}
            work={w}
            index={i}
            total={master.work.length}
            onChange={(p) => patchWork(w.id, p)}
            onRemove={() => removeItem('work', w.id, w.company || '未命名工作经历')}
            onMoveUp={() => set((m) => ({ ...m, work: move(m.work, i, -1) }))}
            onMoveDown={() => set((m) => ({ ...m, work: move(m.work, i, 1) }))}
            onAddProject={() => addProject(w.id)}
            onProjectChange={(pid, p) => patchProject(w.id, pid, p)}
            onProjectRemove={(pid) => removeProject(w.id, pid)}
            onProjectMove={(pid, d) => moveProject(w.id, pid, d)}
            targetRole={master.basics.title}
          />
        ))}
      </Section>

      <Section
        title="独立项目" onSupplement={onSupplement ? () => onSupplement('projects') : undefined}
        count={master.sideProjects.length}
        onAdd={() => addProject(null)}
        addLabel="添加项目"
        hint="开源 / 个人作品 / 竞赛，不属于任何公司。"
      >
        {master.sideProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            targetRole={master.basics.title}
            onChange={(patch) => patchProject(null, p.id, patch)}
            onRemove={() => removeProject(null, p.id)}
            onMoveUp={() => moveProject(null, p.id, -1)}
            onMoveDown={() => moveProject(null, p.id, 1)}
          />
        ))}
      </Section>

      <Section
        title="科研经历" onSupplement={onSupplement ? () => onSupplement('research') : undefined}
        count={master.research.length}
        materialIds={master.research.flatMap(w => [w.id, ...w.projects.map(p => p.id)])}
        onAdd={() => {
          const item = newWork();
          expandNewExperience(item.id, 'research');
          set((m) => ({ ...m, research: [...m.research, item] }));
          locate(item.id, { focus: true });
        }}
        addLabel="添加科研经历"
        hint="实验室 / 研究机构 / 导师项目，结构和公司经历一样。"
      >
        {master.research.map((w, i) => (
          <WorkCard
            key={w.id}
            work={w}
            index={i}
            total={master.research.length}
            companyLabel="机构 / 实验室"
            roleLabel="身份"
            showProjects={false}
            showSummary
            targetRole={master.basics.title}
            onChange={(p) => patchResearch(w.id, p)}
            onRemove={() => removeItem('research', w.id, w.company || '未命名科研经历')}
            onMoveUp={() => setResearch((m) => ({ ...m, research: move(m.research, i, -1) }))}
            onMoveDown={() => setResearch((m) => ({ ...m, research: move(m.research, i, 1) }))}
            onAddProject={() => {}}
            onProjectChange={() => {}}
            onProjectRemove={() => {}}
            onProjectMove={() => {}}
          />
        ))}
      </Section>

      <Section
        title="发表论文" onSupplement={onSupplement ? () => onSupplement('publications') : undefined}
        count={master.publications.length}
        addAction={<ActionMenu label="＋ 添加论文" primary>
          <button type="button" onClick={() => setPaperImport(true)}>
            <strong>按论文导入</strong>
            <span>搜索论文名称或粘贴 DOI，自动获取信息。</span>
          </button>
          <button type="button" onClick={() => {
            const item = newPublication();
            expandNewExperience(item.id, 'publications');
            setPublication(m => ({ ...m, publications: [...m.publications, item] }));
            locate(item.id, { focus: true });
          }}>
            <strong>手动编辑</strong>
            <span>新建空白论文，填写作者、标题和发表信息。</span>
          </button>
        </ActionMenu>}
      >
        {master.publications.map((p, i) => (
          <PublicationCard
            key={p.id}
            pub={p}
            defaultHighlight={master.basics.name}
            onChange={(patch) =>
              setPublication((m) => ({
                ...m,
                publications: m.publications.map((x) => (x.id === p.id ? { ...x, ...patch } : x)),
              }))
            }
            onRemove={() => removeItem('publications', p.id, p.title || '未命名论文')}
            onMoveUp={() => setPublication((m) => ({ ...m, publications: move(m.publications, i, -1) }))}
            onMoveDown={() => setPublication((m) => ({ ...m, publications: move(m.publications, i, 1) }))}
          />
        ))}
      </Section>

      <Section
        title="教育经历" onSupplement={onSupplement ? () => onSupplement('education') : undefined}
        count={master.education.length}
        onAdd={() => {
          const item = newEducation();
          expandNewExperience(item.id, 'education');
          set((m) => ({ ...m, education: [...m.education, item] }));
          locate(item.id, { focus: true });
        }}
        addLabel="添加教育"
      >
        {master.education.map((g) => (
          <EducationCard summary={educationCardSummary(g)} key={g.id} id={g.id} title={g.org} role={[g.role, g.degree].filter(Boolean).join(' · ')} period={[g.start, g.end].filter(Boolean).join(' – ')} subtitle={[g.role,g.degree, [g.start, g.end].filter(Boolean).join(' – '), g.detail].filter(Boolean).join(' · ')} onRemove={() => removeItem('education', g.id, g.org || '未命名教育经历')}>
            <div className="card-body">
              <div className="grid-2">
                <div className="field"><div className="field-label-row"><label className="field-label" htmlFor={`education-school-${g.id}`}>学校</label><Hint label="学校填写说明">可输入校名搜索建议，也可直接填写其他学校。</Hint></div><input id={`education-school-${g.id}`} list={`education-schools-${g.id}`} value={g.org} onChange={e=>patchEducation(g.id,{org:e.target.value})} placeholder="输入或选择学校"/><datalist id={`education-schools-${g.id}`}>{Array.from(new Set([...master.education.map(e=>e.org.trim()).filter(Boolean),'清华大学','北京大学','中国科学技术大学','浙江大学','上海交通大学','复旦大学','南京大学','武汉大学','华中科技大学','哈尔滨工业大学','西安交通大学','北京航空航天大学','同济大学','东南大学','中山大学','四川大学','电子科技大学','北京理工大学','天津大学','南开大学','山东大学','厦门大学','吉林大学','大连理工大学','西北工业大学','北京师范大学','中国人民大学','中南大学','华南理工大学','重庆大学','湖南大学','东北大学','兰州大学','中国农业大学','中国海洋大学','中央民族大学','国防科技大学','西北农林科技大学','华东师范大学','深圳大学','南方科技大学','香港大学','香港中文大学','香港科技大学'])).map(school=><option key={school} value={school}/>)}</datalist></div>
                <Field
                  label="专业"
                  value={g.role}
                  onChange={(v) => patchEducation(g.id, { role: v })}
                  placeholder="计算机科学与技术"
                />
                <label className="field"><span className="field-label">学历 / 学位</span><input list={`education-degrees-${g.id}`} value={g.degree??''} onChange={e=>patchEducation(g.id,{degree:e.target.value})} placeholder="选择或填写学历"/><datalist id={`education-degrees-${g.id}`}>{['博士后','博士','硕士','本科','大专','中专','高中'].map(degree=><option key={degree} value={degree}/>)}</datalist></label>
                <Field label="开始" value={g.start} onChange={(v) => patchEducation(g.id, { start: v })} placeholder="2016.09" />
                <Field label="结束" value={g.end} onChange={(v) => patchEducation(g.id, { end: v })} placeholder="2020.06" />
                <label className="field"><span className="field-label">城市（可空）</span><input list={`education-cities-${g.id}`} value={g.location} onChange={e=>patchEducation(g.id,{location:e.target.value})} placeholder="选择或输入城市"/><datalist id={`education-cities-${g.id}`}>{['北京','上海','广州','深圳','杭州','南京','武汉','合肥','成都','重庆','西安','天津','长沙','苏州','厦门','青岛','济南','郑州','大连','沈阳','哈尔滨','长春','兰州','香港','澳门','台北'].map(city=><option value={city} key={city}/>)}</datalist></label>
                <Field
                  label="副标题（可空）"
                  value={g.detail}
                  onChange={(v) => patchEducation(g.id, { detail: v })}
                  placeholder="GPA 3.7/4.0 · 校级奖学金 2 次"
                />
              </div>
            </div>
            <EditableBullets items={g.bullets} onChange={bullets => patchEducation(g.id, {bullets})} />
          </EducationCard>
        ))}
      </Section>

      <div data-locate="skills">
      <Section title="技能" onSupplement={onSupplement ? () => onSupplement('skills') : undefined} count={master.skills.length} onAdd={() => {
        const item = newSkill();
        expandNewExperience(item.id, 'skills');
        setSkills([...master.skills, item]);
        locate('skills');
        locate(item.id, { focus: true });
      }} addLabel="添加分组">
        {master.skills.map((s) => activeSection !== undefined || isVariant ? (
          <SkillCard key={s.id} skill={s} onChange={patch => setSkills(master.skills.map(x => x.id === s.id ? { ...x, ...patch } : x))} onRemove={() => removeItem('skills', s.id, s.label || '技能分组')} />
        ) : (
          <div className="inline-row" key={s.id} data-locate={s.id}>
            <input
              className="w-90"
              value={s.label}
              placeholder="语言"
              onChange={(e) => setSkills(master.skills.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))}
            />
            <input
              value={s.value}
              placeholder="Go、Java、Python、SQL"
              onChange={(e) => setSkills(master.skills.map((x) => (x.id === s.id ? { ...x, value: e.target.value } : x)))}
            />
            <IconButton title="删除" danger onClick={() => removeItem('skills', s.id, s.label || '技能分组')}>
              <TrashIcon aria-hidden="true" />
            </IconButton>
          </div>
        ))}
      </Section>
      </div>
      {paperImport && (
        <PaperImport
          existingDois={master.publications.map((p) => p.doi).filter(Boolean)}
          onAdd={(hit) =>
            set((m) => ({
              ...m,
              publications: [
                ...m.publications,
                {
                  ...newPublication(),
                  ...hitToPublicationFields(hit),
                  highlight: m.basics.name,
                },
              ],
            }))
          }
          onClose={() => setPaperImport(false)}
        />
      )}
      </ArchiveEditorPane>
    </div></LibrarySectionContext.Provider></ExclusiveMaterialDisclosureContext.Provider></ArchiveReorderContext.Provider>
  );
}
