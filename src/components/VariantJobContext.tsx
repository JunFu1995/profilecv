import type { Variant } from '../types';
import { useRef } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { AutoTextarea, Field } from './ui';

export function VariantJobContext({ variant, onChange }: { variant: Variant; onChange: (variant: Variant) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const target = [variant.jobTarget.company, variant.jobTarget.role].filter(Boolean).join(' · ');
  const close = () => {
    ref.current?.removeAttribute('open');
    ref.current?.querySelector('summary')?.focus();
  };
  return <section id="editor-目标岗位" className="variant-job-context" aria-label="目标岗位与 JD">
    <details ref={ref} className="job-card" data-job-card onKeyDown={event => {
      if (event.key === 'Escape' && ref.current?.open) { event.stopPropagation(); close(); }
    }}>
      <summary aria-label={`目标岗位与 JD：${target || '未设置目标岗位'}`}>
        <span className="job-context-heading"><strong>目标岗位</strong><span className="job-target-label">{target || '添加公司与岗位，让这份简历更有针对性'}</span></span>
        <span className="job-context-action">{variant.jobTarget.jdText.trim() ? '查看 JD' : '添加 JD'}<ChevronDownIcon aria-hidden="true" /></span>
      </summary>
      <div className="job-card-body">
        <p className="job-context-note">岗位说明作为内容取舍与改写的参考，不会出现在简历正文中。</p>
        <div className="grid-2">
          <Field label="公司" value={variant.jobTarget.company} onChange={company => onChange({ ...variant, jobTarget: { ...variant.jobTarget, company } })} placeholder="某交易平台" />
          <Field label="岗位" value={variant.jobTarget.role} onChange={role => onChange({ ...variant, jobTarget: { ...variant.jobTarget, role } })} placeholder="后端工程师（交易方向）" />
        </div>
        <div className="field-block" data-job-target>
          <span className="field-label">JD 原文（可选）</span>
          <AutoTextarea ariaLabel="JD 原文" value={variant.jobTarget.jdText} minRows={6}
            onChange={jdText => onChange({ ...variant, jobTarget: { ...variant.jobTarget, jdText } })}
            placeholder="粘贴岗位职责和任职要求，编辑简历时可随时展开对照。" />
        </div>
        <div className="job-card-footer"><button type="button" className="btn-ghost small" onClick={close}>收起岗位说明</button></div>
      </div>
    </details>
  </section>;
}
