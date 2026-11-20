import { projectCardSummary } from '../../archiveCardSummary';
import { editProjectDraft, hasProjectDraft, switchProjectDraftMode, rewriteProjectDraft } from '../../draftEditing';
import { StarExample } from '../StarExample';
import { Hint } from '../Hint';
import { SummaryRewriteDialog } from '../SummaryRewriteDialog';
import { ComposeDialog } from '../ComposeDialog';
import { ArchiveDragHandle } from '../ArchiveDragHandle';
import { ChevronDownIcon, TrashIcon } from '@radix-ui/react-icons';
import { LibrarySectionContext } from '../LibraryNav';
import { CollapseMaterial } from '../CollapseMaterial';
import { MaterialDisclosureContext, useMaterialDisclosure } from '../../useMaterialDisclosure';
import { useContext, useEffect, useRef, useState } from 'react';
import type { Project } from '../../types';
import { uid } from '../../data';
import { starFingerprint } from '../../ai';
import { fieldLocateId, registerLocate } from '../../locate';
import { AutoTextarea, Field, IconButton } from '../ui';
import { ExperienceSummary } from './ExperienceSummary';

export function ProjectCard({
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
