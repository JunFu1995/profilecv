import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../useEscapeKey';
import type { PaperHit } from '../crossref';
import { searchPapers } from '../crossref';

export function PaperImport({
  existingDois,
  onAdd,
  onClose,
}: {
  existingDois: string[];
  onAdd: (hit: PaperHit) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PaperHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<string[]>([]);

  const alive = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const run = async () => {
    const q = query.trim();
    if (!q || busy) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError('');
    setHits(null);
    try {
      const list = await searchPapers(q, ctrl.signal);
      if (!alive.current) return;
      setHits(list);
      if (list.length === 0) {
        setError(
          '没搜到足够接近的论文。中文期刊在 Crossref 里覆盖不全，建议直接粘 DOI；没有 DOI 就手动填。',
        );
      }
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  return (
    <div className="modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>按论文名导入</h2>
            <p className="modal-sub">从 Crossref 抓取作者、期刊、年卷期页和 DOI；只填元数据，不改你的内容</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="modal-body">
          <div className="paper-search">
            <input
              autoFocus
              value={query}
              placeholder="论文标题，或直接粘 DOI（10.xxxx/…）"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void run();
              }}
            />
            <button type="button" className="btn btn-primary" disabled={busy || !query.trim()} onClick={() => void run()}>
              {busy ? '搜索中…' : '搜索'}
            </button>
          </div>

          {error && (
            <div className="ai-error">
              <p>{error}</p>
            </div>
          )}

          {hits && hits.length > 0 && (
            <div className="paper-hits">
              {hits.map((hit) => {
                const dup = existingDois.includes(hit.doi) || added.includes(hit.doi);
                return (
                  <div className="paper-hit" key={`${hit.doi}-${hit.title}`}>
                    <div className="paper-hit-main">
                      <span className="paper-hit-title">{hit.title}</span>
                      <span className="paper-hit-meta">
                        {[hit.venue, hit.year, hit.volume && `${hit.volume}${hit.issue ? `(${hit.issue})` : ''}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {hit.authors && <span className="paper-hit-authors">{hit.authors}</span>}
                      {hit.doi && <span className="paper-hit-doi">doi:{hit.doi}</span>}
                    </div>
                    <button
                      type="button"
                      className="btn small primary-ghost"
                      disabled={dup}
                      onClick={() => {
                        onAdd(hit);
                        setAdded((prev) => [...prev, hit.doi]);
                      }}
                    >
                      {dup ? '已添加' : '添加'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="modal-foot rw-foot">
          <span className="ai-foot-note">
            数据来自 Crossref。中文期刊覆盖不全是常态，搜不到就手动填，字段都是一样的。
          </span>
        </footer>
      </div>
    </div>
  );
}
