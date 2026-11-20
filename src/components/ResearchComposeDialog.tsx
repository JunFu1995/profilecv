import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../useEscapeKey';
import type { Publication } from '../types';
import {
  composeResearchBullets,
  isConfigured,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from '../ai';
import { fetchAbstract } from '../crossref';
import { mergeOutcomeIntoSummary, outcomeLine } from '../publication';
import type { ResearchDraft } from '../ai';
import { AiConfigForm } from './AiConfigForm';

export function ResearchComposeDialog({
  papers,
  org,
  role,
  existingCount,
  onApply,
  onClose,
}: {
  papers: Publication[];
  org: string;
  role: string;
  existingCount: number;
  onApply: (payload: { summary: string; bullets: string[] }, mode: 'replace' | 'append') => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const withAbstract = papers.filter((p) => p.abstract?.trim());
  const [paperId, setPaperId] = useState<string>(withAbstract[0]?.id ?? '');
  const [abstract, setAbstract] = useState<string>(withAbstract[0]?.abstract ?? '');
  const [draft, setDraft] = useState<ResearchDraft | null>(null);
  const [withOutcome, setWithOutcome] = useState(true);
  const [outcomeText, setOutcomeText] = useState(withAbstract[0] ? outcomeLine(withAbstract[0]) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingConfig, setEditingConfig] = useState(() => !isConfigured(loadAiConfig()));
  const [fetching, setFetching] = useState(false);

  const alive = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const pickPaper = async (id: string) => {
    setPaperId(id);
    setDraft(null);
    setError('');
    const paper = papers.find((p) => p.id === id);
    if (!paper) {
      setOutcomeText('');
      return;
    }
    setOutcomeText(outcomeLine(paper));

    if (paper.abstract?.trim()) {
      setAbstract(paper.abstract);
      return;
    }
    setAbstract('');
    if (!paper.doi) return;

    setFetching(true);
    const text = await fetchAbstract(paper.doi, new AbortController().signal);
    if (!alive.current) return;
    setFetching(false);
    if (text) setAbstract(text);
    else setError('这篇论文在 Crossref 没有公开摘要，手动粘贴一段也行。');
  };

  const run = async (cfg: AiConfig) => {
    if (abstract.trim().length < 40) {
      setError('摘要太短，至少粘一段完整摘要（几十个字）再生成。');
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError('');
    try {
      const paper = papers.find((p) => p.id === paperId);
      const list = await composeResearchBullets({
        abstract,
        title: paper?.title ?? '',
        venue: paper?.venue ?? '',
        org,
        role,
        config: cfg,
        signal: ctrl.signal,
      });
      if (!alive.current) return;
      setDraft(list);
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const config = loadAiConfig();
  const paper = papers.find((p) => p.id === paperId);

  return (
    <div className="modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>从论文摘要生成科研描述</h2>
            <p className="modal-sub">
              按「研究问题 → 方法 → 结果」的经典结构改写，只用摘要里的事实和数字
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="modal-body">
          {editingConfig ? (
            <AiConfigForm
              saveLabel="保存并继续"
              onSave={(cfg) => {
                saveAiConfig(cfg);
                setEditingConfig(false);
              }}
              onCancel={onClose}
            />
          ) : (
            <>
              {papers.length > 0 && (
                <label className="field" style={{ marginBottom: 10 }}>
                  <span className="field-label">关联论文（可选）</span>
                  <select value={paperId} onChange={(e) => void pickPaper(e.target.value)}>
                    <option value="">不关联，直接粘贴摘要</option>
                    {papers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || '（未命名）'}
                        {p.year ? ` · ${p.year}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field">
                <span className="field-label">
                  论文摘要{fetching ? '（正在从 Crossref 取…）' : ''}
                </span>
                <textarea
                  rows={6}
                  value={abstract}
                  placeholder="粘贴论文摘要。结构越完整，生成的三条要点越准。"
                  onChange={(e) => {
                    setAbstract(e.target.value);
                    setDraft(null);
                  }}
                />
              </label>

              <div className="outcome-block">
                <label className="compose-outcome">
                  <input
                    type="checkbox"
                    checked={withOutcome}
                    disabled={!outcomeText.trim()}
                    onChange={(e) => setWithOutcome(e.target.checked)}
                  />
                  <span>把发表情况并入上面的概述</span>
                </label>
                <input
                  className="outcome-input"
                  value={outcomeText}
                  placeholder="相关成果发表于《计算机学报》（CCF-A），2024。"
                  onChange={(e) => {
                    setOutcomeText(e.target.value);
                    setWithOutcome(true);
                  }}
                />
                <span className="field-hint">
                  {paper
                    ? '按论文的期刊、级别备注和年份自动拼好，可改。'
                    : '在上面选一篇论文会自动填好；也可以自己写。级别只认你在论文备注里填的内容。'}
                </span>
              </div>

              {error && (
                <div className="ai-error">
                  <p>{error}</p>
                </div>
              )}

              <div className="ai-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || abstract.trim().length < 40}
                  onClick={() => void run(config)}
                >
                  {busy ? '生成中…' : draft ? '重新生成' : '生成初版'}
                </button>
                <button type="button" className="btn" onClick={() => setEditingConfig(true)}>
                  接口设置
                </button>
              </div>

              {draft && (
                <>
                  <div className="compose-result">
                    <span className="field-label">
                      一句话概述{withOutcome && outcomeText.trim() ? '（已并入发表情况）' : ''}
                    </span>
                    <p className="compose-summary">
                      {mergeOutcomeIntoSummary(
                        draft.summary || '（模型没给出概述）',
                        withOutcome ? outcomeText : '',
                      )}
                    </p>

                    <span className="field-label" style={{ display: 'block', marginTop: 10 }}>
                      要点
                    </span>
                    <ol>
                      {draft.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ol>

                  </div>

                  <div className="ai-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        onApply(
                          {
                            summary: mergeOutcomeIntoSummary(
                              draft.summary,
                              withOutcome ? outcomeText : '',
                            ),
                            bullets: draft.bullets,
                          },
                          existingCount > 0 ? 'replace' : 'append',
                        )
                      }
                    >
                      {existingCount > 0 ? `替换现有 ${existingCount} 条要点` : '填入'}
                    </button>
                    {existingCount > 0 && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          onApply(
                            {
                              summary: mergeOutcomeIntoSummary(
                                draft.summary,
                                withOutcome ? outcomeText : '',
                              ),
                              bullets: draft.bullets,
                            },
                            'append',
                          )
                        }
                      >
                        追加到末尾
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <footer className="modal-foot rw-foot">
          <span className="ai-foot-note">
            生成的是初版：摘要不会写“你做了什么”，提交前请按实际情况核对和补充。
          </span>
        </footer>
      </div>
    </div>
  );
}
