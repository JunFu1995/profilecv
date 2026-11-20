import { useState } from 'react';
import { useEscapeKey } from '../useEscapeKey';
import type { Doc } from '../types';
import { diffVariants } from '../variants';

function Side({ title, items, tone }: { title: string; items: { label: string; text: string }[]; tone: string }) {
  return (
    <div className="diff-col">
      <h3 className={`diff-title ${tone}`}>
        {title} <span className="count">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="vempty">无</p>
      ) : (
        items.map((it, i) => (
          <div className="diff-item" key={i}>
            <span className="diff-label">{it.label}</span>
            <span className="diff-text">{it.text}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function CompareDialog({
  doc,
  initialLeft,
  initialRight,
  onClose,
}: {
  doc: Doc;
  initialLeft: string;
  initialRight: string;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [leftId, setLeftId] = useState(initialLeft);
  const [rightId, setRightId] = useState(initialRight);

  const left = doc.variants.find((v) => v.id === leftId) ?? doc.variants[0];
  const right = doc.variants.find((v) => v.id === rightId) ?? doc.variants[doc.variants.length - 1];
  const diff = left && right ? diffVariants(doc.master, left, right) : { onlyA: [], onlyB: [], changed: [] };

  return (
    <div className="modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>版本对比</h2>
            <p className="modal-sub">只比较要点，不改动任何内容。</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="modal-selects">
          <select value={leftId} onChange={(e) => setLeftId(e.target.value)} aria-label="左侧版本">
            {doc.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <span className="diff-vs">对比</span>
          <select value={rightId} onChange={(e) => setRightId(e.target.value)} aria-label="右侧版本">
            {doc.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-body">
          <div className="diff-grid">
            <Side title={`只在「${left?.name ?? '-'}」`} items={diff.onlyA} tone="tone-a" />
            <Side title={`只在「${right?.name ?? '-'}」`} items={diff.onlyB} tone="tone-b" />
          </div>

          <div className="diff-changed">
            <h3 className="diff-title tone-c">
              文案不同 <span className="count">{diff.changed.length}</span>
            </h3>
            {diff.changed.length === 0 ? (
              <p className="vempty">没有改写过同一位置的要点。</p>
            ) : (
              diff.changed.map((c, i) => (
                <div className="diff-pair" key={i}>
                  <span className="diff-label">{c.label}</span>
                  <div className="diff-pair-body">
                    <p className="diff-before">{c.a}</p>
                    <p className="diff-after">{c.b}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
