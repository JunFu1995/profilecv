import { publicationCardMeta, citationPreview } from '../publication';
import { ArrowUpIcon, ArrowDownIcon, TrashIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { CollapseMaterial } from './CollapseMaterial';
import { MaterialDisclosureContext, useMaterialDisclosure } from '../useMaterialDisclosure';
import { ArchiveDragHandle, ArchiveReorderContext } from './ArchiveDragHandle';
import { useContext, useEffect } from 'react';
import { registerLocate } from '../locate';
import type { Publication } from '../types';
import { Field, IconButton } from './ui';
import { ArchiveCardSummary } from './ArchiveCardSummary';

const STATUS_OPTIONS: { value: Publication['status']; label: string }[] = [
  { value: 'unknown', label: '未注明' },
  { value: 'published', label: '已发表' },
  { value: 'accepted', label: '已接收' },
  { value: 'review', label: '在审' },
  { value: 'preprint', label: '预印本' },
];

const POSITION_OPTIONS: { value: Publication['selfPosition']; label: string }[] = [
  { value: 'first', label: '第一作者' },
  { value: 'co-first', label: '共同一作' },
  { value: 'corresponding', label: '通讯作者' },
  { value: 'other', label: '其他位次' },
];

export { citationPreview } from '../publication';

export function PublicationCard({
  pub,
  defaultHighlight,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  pub: Publication;
  defaultHighlight: string;
  onChange: (patch: Partial<Publication>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isVariant = !!useContext(MaterialDisclosureContext);
  const sortable = !!useContext(ArchiveReorderContext);
  const meta=publicationCardMeta(pub);
  const [open, setOpen, itemProps] = useMaterialDisclosure(pub.id, !pub.title, 'publications');
  useEffect(() => registerLocate(pub.id, () => setOpen(true)), [pub.id]);

  return (
    <div className={`card publication-material${sortable && !isVariant ? ' experience-card' : ''}`} data-locate={pub.id} {...itemProps}>
      <div className="card-head">
        {sortable && <ArchiveDragHandle id={pub.id} label={pub.title || '未命名论文'} />}
        <button type="button" className="card-toggle" aria-expanded={open} onClick={event => setOpen(!open, event.currentTarget)}>
          <span className={`caret${open ? ' open' : ''}`}><ChevronRightIcon width={14} height={14} /></span>
          {sortable && !isVariant ? <span className="experience-summary experience-summary-brief">
            <span className="experience-name">{pub.title || '未命名论文'}</span>
            {!open && <ArchiveCardSummary summary={{ badge: meta.level }} />}
            <span className="experience-period">{pub.year.trim() || '时间待填写'}</span>
          </span> : <>
            <span className="card-title" title={pub.title}>{pub.title || '（未填写标题）'}</span>
            {meta.level && <span className="publication-tags"><span className="publication-tag">{meta.level}</span></span>}
          </>}
          {!isVariant && <span className="disclosure-label">{open ? '收起' : '展开编辑'}</span>}
        </button>
        <div className="card-actions">
          {!sortable && <><IconButton title="上移" onClick={onMoveUp}>
            <ArrowUpIcon aria-hidden="true" />
          </IconButton>
          <IconButton title="下移" onClick={onMoveDown}>
            <ArrowDownIcon aria-hidden="true" />
          </IconButton></>}
          {(!isVariant || !open) && <IconButton title="删除" danger onClick={onRemove}>
            <TrashIcon aria-hidden="true" />
          </IconButton>}
        </div>
      </div>


      {open && (
        <div className="card-body">
          <div className="grid-2">
            <Field
              label="作者" hint="多个作者之间用逗号分隔。"
              value={pub.authors}
              onChange={(v) => onChange({ authors: v })}
              placeholder="陈墨, 李明, 王芳"
            />
            <Field
              label="加粗的作者名"
              value={pub.highlight}
              onChange={(v) => onChange({ highlight: v })}
              placeholder={defaultHighlight || '填自己的名字'}
            />
            <Field
              label="标题"
              value={pub.title}
              onChange={(v) => onChange({ title: v })}
              placeholder="面向高并发交易场景的订单服务重构方法"
            />
            <Field
              label="期刊 / 会议"
              value={pub.venue}
              onChange={(v) => onChange({ venue: v })}
              placeholder="计算机学报"
            />
            <Field label="年份" value={pub.year} onChange={(v) => onChange({ year: v })} placeholder="2024" />
            <Field label="卷" value={pub.volume} onChange={(v) => onChange({ volume: v })} placeholder="47" />
            <Field label="期" value={pub.issue} onChange={(v) => onChange({ issue: v })} placeholder="3" />
            <Field label="页码" value={pub.pages} onChange={(v) => onChange({ pages: v })} placeholder="45-67" />
            <Field label="DOI" hint="存档用，不显示在简历。" value={pub.doi} onChange={(v) => onChange({ doi: v })} placeholder="10.xxxx/xxxxx" />
            <Field label="会议 / 期刊简称（可选）" value={pub.venueShort??''} onChange={venueShort=>onChange({venueShort})} placeholder="如 ICDCS、TPAMI"/>
            <Field label="论文等级（可选）" value={pub.level??''} onChange={level=>onChange({level})} placeholder="如 CCF-A、JCR Q1"/>
            <Field
              label="备注（可空）" hint="可填写分区、影响因子等补充信息。"
              value={pub.note}
              onChange={(v) => onChange({ note: v })}
              placeholder="CCF-A · 中科院一区"
            />
          </div>

          <div className="grid-2" style={{ marginTop: 10 }}>
            <label className="field">
              <span className="field-label">状态</span>
              <select
                value={pub.status}
                onChange={(e) => onChange({ status: e.target.value as Publication['status'] })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">作者位次</span>
              <select
                value={pub.selfPosition}
                onChange={(e) => onChange({ selfPosition: e.target.value as Publication['selfPosition'] })}
              >
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pub-preview">
            <span className="field-label">简历上会显示为</span>
            <p>{citationPreview(pub)}</p>
          </div>
          <CollapseMaterial onCollapse={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
