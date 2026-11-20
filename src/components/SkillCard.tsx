import { useContext, useEffect } from 'react';
import { TrashIcon } from '@radix-ui/react-icons';
import type { SkillGroup } from '../types';
import { registerLocate } from '../locate';
import { MaterialDisclosureContext, useMaterialDisclosure } from '../useMaterialDisclosure';
import { ArchiveDragHandle } from './ArchiveDragHandle';
import { ArchiveCardSummary } from './ArchiveCardSummary';
import { CollapseMaterial } from './CollapseMaterial';
import { AutoTextarea, Field, IconButton } from './ui';

export function SkillCard({ skill, onChange, onRemove }: {
  skill: SkillGroup; onChange: (patch: Partial<SkillGroup>) => void; onRemove: () => void;
}) {
  const isVariant = !!useContext(MaterialDisclosureContext);
  const [open, setOpen, itemProps] = useMaterialDisclosure(skill.id, false, 'skills');
  useEffect(() => registerLocate(skill.id, () => setOpen(true)), [skill.id]);
  return <div className="card experience-card skill-card" data-locate={skill.id} {...itemProps}>
    <div className="card-head">
      <ArchiveDragHandle id={skill.id} label={skill.label || '未命名技能分组'} />
      <button type="button" className="card-toggle" aria-expanded={open} aria-controls={`skill-${skill.id}`} onClick={event => setOpen(!open, event.currentTarget)}>
        <span className={`caret${open ? ' open' : ''}`}>▸</span>
        <span className="experience-summary experience-summary-brief">
          <span className="experience-name">{skill.label || '未命名技能分组'}</span>
          {!open && <ArchiveCardSummary summary={{ detail: skill.value }} />}
        </span>
        {!isVariant && <span className="disclosure-label">{open ? '收起' : '展开编辑'}</span>}
      </button>
      {(!isVariant || !open) && <IconButton title="删除技能分组" danger onClick={onRemove}><TrashIcon aria-hidden="true" /></IconButton>}
    </div>
    {open && <div className="card-body" id={`skill-${skill.id}`}>
      <Field label="分组名称" value={skill.label} placeholder="语言" onChange={label => onChange({ label })} />
      <label className="field"><span className="field-label">技能内容</span><AutoTextarea ariaLabel="技能内容" value={skill.value} placeholder="Go、Java、Python、SQL" onChange={value => onChange({ value })} /></label>
      <CollapseMaterial onCollapse={() => setOpen(false)} />
    </div>}
  </div>;
}
