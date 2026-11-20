import { useState } from 'react';
import type { Doc } from '../types';
import { Hint } from './Hint';
import { ResumeThumbnail } from './ResumeThumbnail';
import { ResumePreviewDialog } from './ResumePreviewDialog';

export function ResumeLibrary({ doc, onCreate, onOpen, onRename, onDuplicate, onDelete, onCompare }: {
  doc: Doc;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCompare: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const variants = doc.variants;
  const previewVariant = variants.find(variant => variant.id === previewId);
  const visible = [...variants].reverse().filter(v =>
    [v.name, v.jobTarget.company, v.jobTarget.role].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return <section className="resume-library" aria-labelledby="resume-library-title">
    <header className="resume-library-head">
      <div>
        <div className="field-label-row"><h2 id="resume-library-title">全部简历 <span>{variants.length}</span></h2>
          <Hint label="简历管理说明">针对不同公司和岗位创建简历，分别取舍内容、调整措辞与排版。编辑或删除简历不会改动档案库。</Hint>
        </div>
      </div>
      <div className="resume-library-tools">
        {variants.length > 1 && <button type="button" className="btn" onClick={onCompare}>对比简历</button>}
        <button type="button" className="btn btn-primary" onClick={onCreate}>创建简历</button>
      </div>
    </header>
    {(variants.length > 4 || query) && <label className="resume-library-search"><input aria-label="搜索简历" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索名称、公司或岗位" /></label>}
    {variants.length === 0 ? <p className="resume-library-empty">还没有简历。从档案中选择经历，创建第一份简历。</p> : visible.length === 0 ? <p className="resume-library-empty">没有匹配的简历。</p> :
      <div className="resume-library-grid">{visible.map(variant => <article className="resume-library-card" key={variant.id} aria-label={variant.name || '未命名简历'}>
        <div className="resume-card-preview">
          <ResumeThumbnail doc={doc} variant={variant} />
          <span className="resume-preview-caption" aria-hidden="true">点击放大预览</span>
          <button type="button" className="resume-preview-open" aria-label={`预览简历：${variant.name || '未命名简历'}`} aria-haspopup="dialog" onClick={() => setPreviewId(variant.id)} />
        </div>
        <div className="resume-library-info">
          {editingId === variant.id ? <form className="resume-rename-form" onSubmit={event => {event.preventDefault(); if (name.trim()) {onRename(variant.id, name.trim()); setEditingId(null);}}}>
            <input autoFocus aria-label="简历名称" value={name} onChange={event => setName(event.target.value)} onKeyDown={event => {if (event.key === 'Escape') {event.preventDefault(); setEditingId(null);}}} />
            <button type="submit" className="btn" disabled={!name.trim()}>保存</button><button type="button" className="btn" onClick={() => setEditingId(null)}>取消</button>
          </form> : <button type="button" className="resume-library-name" aria-haspopup="dialog" onClick={() => setPreviewId(variant.id)}>{variant.name || '未命名简历'}</button>}
          <p className="resume-card-target"><span>投递目标</span>{[variant.jobTarget.company, variant.jobTarget.role].filter(Boolean).join(' · ') || '尚未设置'}</p>
          <p className="resume-card-date">创建于 {variant.createdAt.slice(0, 10)}</p>
        </div>
        <div className="resume-library-actions">
          <button type="button" className="resume-card-edit" onClick={() => onOpen(variant.id)}>编辑</button>
          <button type="button" onClick={() => onDuplicate(variant.id)}>复制</button>
          <button type="button" onClick={() => {setName(variant.name); setEditingId(variant.id);}}>重命名</button>
          <button type="button" className="danger" onClick={() => onDelete(variant.id)}>删除</button>
        </div>
      </article>)}</div>}
    {previewVariant && <ResumePreviewDialog doc={doc} variant={previewVariant} onClose={() => setPreviewId(null)} onEdit={() => { setPreviewId(null); onOpen(previewVariant.id); }} />}
  </section>;
}
