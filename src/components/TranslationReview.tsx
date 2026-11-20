import { useMemo, useState } from 'react';
import { useEscapeKey } from '../useEscapeKey';
import type { ResumeView, TranslationEntry } from '../types';
import { collectStrings, defaultViewTranslation, isViewName, resolveViewTranslation, textKey } from '../translate';

interface Row {
  src: string;
  key: string;
  entry: TranslationEntry | undefined;
}

const QUICK_HINTS = ['更简洁', '更专业', '更地道'];

export function TranslationReview({
  view,
  translations,
  onChange,
  onRetranslate,
  onPolish,
  onApplyPolish,
  onUndoPolish,
  onClose,
}: {
  view: ResumeView;
  translations: Record<string, TranslationEntry>;
  onChange: (src: string, en: string, manual: boolean) => void;
  onRetranslate: (src: string) => Promise<void>;
  onPolish: (src: string, current: string, hint: string) => Promise<string[]>;
  onApplyPolish: (src: string, text: string) => void;
  onUndoPolish: (src: string) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'manual' | 'missing'>('all');

  // 润色面板一次只开一条，避免界面失控
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [cands, setCands] = useState<string[]>([]);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState('');

  const rows: Row[] = useMemo(
    () =>
      collectStrings(view).map((src) => ({
        src,
        key: textKey(src),
        entry: resolveViewTranslation(view, src, translations[textKey(src)]),
      })),
    [view, translations],
  );

  const manualCount = rows.filter((r) => r.entry?.manual).length;
  const missingCount = rows.filter((r) => !r.entry?.en).length;

  const visible = rows.filter((r) => {
    if (filter === 'manual') return r.entry?.manual;
    if (filter === 'missing') return !r.entry?.en;
    return true;
  });

  const runRetranslate = async (src: string) => {
    setBusy((prev) => new Set(prev).add(src));
    try {
      await onRetranslate(src);
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(src);
        return next;
      });
    }
  };

  const openPolish = (src: string) => {
    if (openSrc === src) {
      setOpenSrc(null);
      return;
    }
    setOpenSrc(src);
    setHint('');
    setCands([]);
    setPolishError('');
  };

  const runPolish = async (src: string, current: string) => {
    setPolishing(true);
    setPolishError('');
    setCands([]);
    try {
      const list = await onPolish(src, current, hint);
      setCands(list);
    } catch (err) {
      setPolishError(err instanceof Error ? err.message : '润色失败');
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div className="modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>译文校对</h2>
            <p className="modal-sub">
              共 {rows.length} 条 · 已手改 {manualCount} 条 · 未翻译 {missingCount} 条
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="tr-filter">
          {(
            [
              ['all', '全部'],
              ['manual', '已手改'],
              ['missing', '未翻译'],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={filter === key ? 'active' : ''}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
          <span className="tr-hint">
            改过的译文会锁住，不会被自动翻译覆盖；原文一改，这条会重新变回未翻译。
          </span>
        </div>

        <div className="modal-body tr-body">
          {visible.length === 0 && <p className="vempty">这个筛选下没有内容。</p>}

          {visible.map((r) => {
            const entry = r.entry;
            const isOpen = openSrc === r.src;
            const isName = isViewName(view, r.src);
            const hasDefault = !!defaultViewTranslation(view, r.src);
            return (
              <div className="tr-row" key={r.key}>
                <div className="tr-src">{r.src}{isName && <p className="field-hint">姓名拼音默认名在前、姓在后，也可改为本人惯用的英文写法。</p>}</div>
                <div className="tr-en">
                  <textarea
                    aria-label={r.src === view.basics.name.trim() ? '英文姓名' : `${r.src}的英文译文`}
                    value={entry?.en ?? ''}
                    rows={Math.max(2, Math.ceil((entry?.en ?? r.src).length / 48))}
                    placeholder="还没翻译。点「重译」，或手动填写。"
                    onChange={(e) => onChange(r.src, e.target.value, true)}
                  />

                  <div className="tr-meta">
                    {entry?.polished ? (
                      <span className="tag info">已润色</span>
                    ) : entry?.manual ? (
                      <span className="tag info">已手动修改</span>
                    ) : hasDefault ? (
                      <span className="tag">{isName ? '默认姓名拼音' : '默认译文'}</span>
                    ) : entry?.en ? (
                      <span className="tag">机器翻译</span>
                    ) : (
                      <span className="tag warn">未翻译</span>
                    )}

                    <button
                      type="button"
                      className="link-btn"
                      disabled={busy.has(r.src)}
                      onClick={() => void runRetranslate(r.src)}
                    >
                      {busy.has(r.src) ? '处理中…' : hasDefault ? '恢复默认' : '重译'}
                    </button>

                    {entry?.en && !isName && (
                      <button type="button" className="link-btn" onClick={() => openPolish(r.src)}>
                        {isOpen ? '收起' : '润色'}
                      </button>
                    )}

                    {entry?.polished && entry.previous && (
                      <button type="button" className="link-btn" onClick={() => onUndoPolish(r.src)}>
                        撤回润色
                      </button>
                    )}
                  </div>

                  {isOpen && entry?.en && (
                    <div className="tr-polish">
                      <p className="tr-polish-tip">
                        以当前译文为起点改写，保留你改过的术语和结构；事实与数字仍以中文原文为准。
                      </p>
                      <input
                        value={hint}
                        placeholder="可选：想怎么润色？例如「更简洁，保留所有数字」"
                        onChange={(e) => setHint(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !polishing) void runPolish(r.src, entry.en);
                        }}
                      />
                      <div className="tr-pills">
                        {QUICK_HINTS.map((q) => (
                          <button
                            type="button"
                            key={q}
                            className={hint === q ? 'active' : ''}
                            onClick={() => setHint(q)}
                          >
                            {q}
                          </button>
                        ))}
                      </div>

                      <div className="ai-actions">
                        <button
                          type="button"
                          className="btn small primary-ghost"
                          disabled={polishing}
                          onClick={() => void runPolish(r.src, entry.en)}
                        >
                          {polishing ? '润色中…' : '生成'}
                        </button>
                      </div>

                      {polishError && (
                        <div className="ai-error">
                          <p>{polishError}</p>
                        </div>
                      )}

                      {cands.map((text, i) => (
                        <div className="tr-cand" key={i}>
                          <p>{text}</p>
                          <button
                            type="button"
                            className="btn small primary-ghost"
                            onClick={() => {
                              onApplyPolish(r.src, text);
                              setOpenSrc(null);
                              setCands([]);
                            }}
                          >
                            用这个
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="modal-foot rw-foot">
          <span className="ai-foot-note">
            姓名留空恢复默认拼音；其他内容留空继续用中文原文。改动即时生效，右侧预览会跟着变。
          </span>
        </footer>
      </div>
    </div>
  );
}
