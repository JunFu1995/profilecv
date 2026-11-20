import { useEffect, useId, useMemo, useRef } from 'react';
import type { Doc, Variant } from '../types';
import { resolveVariant } from '../variants';
import { layoutFor } from '../variantLayout';
import { localizeView } from '../translate';
import { Preview } from './Preview';

export function ResumePreviewDialog({ doc, variant, onClose, onEdit }: {
  doc: Doc;
  variant: Variant;
  onClose: () => void;
  onEdit: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const layout = layoutFor(doc, variant);
  const view = useMemo(() => {
    const resolved = resolveVariant(doc.master, variant);
    return layout.locale === 'en' ? localizeView(resolved, doc.translations).view : resolved;
  }, [doc.master, doc.translations, variant, layout.locale]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const close = () => {
    // Close before unmounting so the browser restores focus to the opener.
    dialogRef.current?.close();
    onClose();
  };

  return <dialog ref={dialogRef} className="modal resume-preview-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
    <header className="modal-head">
      <div><h2 id={titleId}>{variant.name || '未命名简历'}</h2>
        <p className="modal-sub">{[variant.jobTarget.company, variant.jobTarget.role].filter(Boolean).join(' · ') || '尚未设置投递目标'}</p>
      </div>
      <div className="resume-preview-dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onEdit}>编辑简历</button>
        <button type="button" className="btn" autoFocus onClick={close}>关闭预览</button>
      </div>
    </header>
    <Preview view={view} accent={layout.theme.accent} locale={layout.locale} template={layout.template}
      scale={layout.layoutScale} stretch={layout.layoutStretch} onLayout={() => {}} />
  </dialog>;
}
