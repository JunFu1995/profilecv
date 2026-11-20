import { workCardSummary } from '../../archiveCardSummary';
import { editResearchSource, editDraft, switchDraftMode, researchDraft, researchDraftFromSource, researchSourceHash, researchSource } from '../../draftEditing';
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
import type { Project, WorkEntry } from '../../types';
import { uid } from '../../data';
import { fieldLocateId, registerLocate } from '../../locate';
import { AutoTextarea, Field, IconButton } from '../ui';
import { ExperienceSummary } from './ExperienceSummary';
import { ProjectCard } from './ProjectCard';
import { MaterialImportContext } from './contexts';

export function WorkCard({
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
