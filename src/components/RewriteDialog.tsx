import { createPortal } from 'react-dom';
import { RewriteReview } from './RewriteReview';
import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../useEscapeKey';
import type { AiConfig, AnnotationKind, Candidate } from '../ai';
import {
  ANNOTATION_LABEL,
  isConfigured,
  loadAiConfig,
  reviseBullet,
  rewriteBullet,
  saveAiConfig,
} from '../ai';
import { checkNumbers, hasNumberProblem, type NumberCheck } from '../digits';
import { AiConfigForm } from './AiConfigForm';
import { uid } from '../id';

export interface RewriteContext {
  jd: string;
  role: string;
  company: string;
  peers: string[];
}

interface Ann {
  id: string;
  quote: string;
  start: number;
  end: number;
  kind: AnnotationKind;
  comment: string;
}

interface Step {
  text: string;
  /** 产生这一版所用的批注与意见，用于「换个写法」 */
  annotations: Ann[];
  note: string;
  check: NumberCheck | null;
}

interface Sel {
  start: number;
  end: number;
  x: number;
  y: number;
  /** 选区太靠上时把工具条放到下方，避免盖住上一行 */
  below: boolean;
}

const KIND_CLASS: Record<AnnotationKind, string> = {
  shorten: 'shorten',
  remove: 'remove',
  reword: 'reword',
  keep: 'keep',
  custom: 'custom',
};

function renderMarked(text: string, annotations: Ann[]) {
  const sorted = [...annotations]
    .filter((a) => a.start >= 0 && a.end <= text.length && a.end > a.start)
    .sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const a of sorted) {
    if (a.start < cursor) continue;
    if (a.start > cursor) nodes.push(<span key={`t${cursor}`}>{text.slice(cursor, a.start)}</span>);
    nodes.push(
      <mark key={a.id} className={`rw-mark ${KIND_CLASS[a.kind]}`} title={ANNOTATION_LABEL[a.kind]}>
        {text.slice(a.start, a.end)}
      </mark>,
    );
    cursor = a.end;
  }
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  return nodes;
}

export function RewriteDialog({
  original,
  subject,
  summaryFormat,
  mode = 'variant',
  draftKey,
  initial,
  context,
  onApply,
  onClose,
  onTry,
}: {
  original: string;
  subject?: string;
  summaryFormat?: 'paragraph' | 'bullets';
  draftKey?: string;
  mode?: 'material'|'variant';
  /** 已有的改写稿；有值时直接从它继续迭代，不重新发散 */
  initial?: string;
  context: RewriteContext;
  onApply: (text: string) => void;
  onClose: () => void;
  onTry?: (text: string) => void;
}) {
  useEscapeKey(onClose);
  const materialMode=mode==='material';
  const storageKey=`resume-tool:rewrite:${mode}:${draftKey??original}`;
  const [saved]=useState(()=>{try {const data=JSON.parse(localStorage.getItem(storageKey)??'null');return data?.original===original&&Array.isArray(data.steps)&&data.steps.every((s:Step)=>s&&typeof s.text==='string'&&Array.isArray(s.annotations))?data:null;}catch{return null;}});
  const [saveError,setSaveError]=useState(false);
  const applyText=(text:string)=>{try{localStorage.removeItem(storageKey);}catch{/* 应用不依赖草稿清理 */}onApply(text);};
  const startText = (initial ?? '').trim();
  const hasInitial = startText.length > 0 && startText !== original.trim();

  const [showAlternatives,setShowAlternatives]=useState(false);
  const [goal,setGoal]=useState(saved?.goal??(materialMode?'改善表达与可读性':'突出岗位相关成果'));
  const [requirement,setRequirement]=useState(saved?.requirement??'');
  const [config, setConfig] = useState<AiConfig>(loadAiConfig);
  const [editing, setEditing] = useState(() => !isConfigured(loadAiConfig()));

  const [candidates, setCandidates] = useState<Candidate[]>(saved?.candidates??[]);
  const [stage, setStage] = useState<'pick' | 'focus'>(saved?.stage??(hasInitial ? 'focus' : 'pick'));
  const [steps, setSteps] = useState<Step[]>(
    saved?.steps??(hasInitial ? [{ text: startText, annotations: [], note: '', check: checkNumbers(original, startText) }] : []),
  );
  const [stale, setStale] = useState(false);
  const [idx, setIdx] = useState(Math.min(saved?.idx??0,Math.max(0,(saved?.steps?.length??1)-1)));
  const [pending, setPending] = useState<Ann[]>(saved?.pending??[]);
  const [note, setNote] = useState(saved?.note??'');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sel, setSel] = useState<Sel | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const alive = useRef(true);
  const started = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify({original,goal,requirement,candidates,stage,steps,idx,note,pending}));setSaveError(false);}catch{setSaveError(true);}},[storageKey,original,goal,requirement,candidates,stage,steps,idx,note,pending]);
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
  const current = steps[idx]?.text ?? '';
  const check = steps[idx]?.check ?? null;

  const fail = (err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    setError(err instanceof Error ? err.message : '未知错误');
  };

  /* ---------- 请求 ---------- */

  const runDraft = async (cfg: AiConfig) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setCandidates([]);
    setShowAlternatives(false);
    try {
      const list = await rewriteBullet({
        original,
        summaryFormat,
        summarySubject: subject,
        jd: materialMode?'':context.jd,
        role: materialMode?'':context.role,
        company: materialMode?'':context.company,
        peers: context.peers,
        goal, requirement,
        config: cfg,
        signal: ctrl.signal,
      });
      if (!alive.current) return;
      setCandidates(list);
    } catch (err) {
      if (alive.current) fail(err);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const runRevise = async (baseText: string, anns: Ann[], overallNote: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setStale(false);
    try {
      const text = await reviseBullet({
        original,
        summaryFormat,
        summarySubject: subject,
        base: baseText,
        annotations: anns.map((a) => ({ quote: a.quote, kind: a.kind, comment: a.comment })),
        note: overallNote,
        goal, requirement,
        jd: materialMode?'':context.jd,
        role: materialMode?'':context.role,
        company: materialMode?'':context.company,
        config,
        signal: ctrl.signal,
      });
      if (!alive.current) return;
      // 模型原样返回时不新增版本，否则会出现“第 N 版和第 N-1 版一模一样”的假进度
      if (text.trim() === baseText.trim()) {
        setStale(true);
        return;
      }
      const nextCheck = checkNumbers(original, text);
      // 从中间回退后再改写：截断旧的后半段，形成一条新的时间线
      const kept = steps;
      setSteps([...kept, { text, annotations: anns, note: overallNote, check: nextCheck }]);
      setIdx(kept.length);
      setPending([]);
      setNote('');
      setSel(null);
      setCustomOpen(false);
    } catch (err) {
      if (alive.current) fail(err);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
      started.current = false;
    };
    // 只在挂载时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 配置 ---------- */

  const openSettings = () => {
    setError(null);
    setEditing(true);
  };

  /* ---------- 选区批注 ---------- */

  const onTextMouseUp = () => {
    const wrap = textRef.current;
    if (!wrap || busy) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSel(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!wrap.contains(range.commonAncestorContainer)) {
      setSel(null);
      return;
    }

    // 用 Range.toString() 的长度算偏移：文本节点里的内容长度和渲染文字一致
    const pre = range.cloneRange();
    pre.selectNodeContents(wrap);
    pre.setEnd(range.startContainer, range.startOffset);
    const rawStart = pre.toString().length;
    const raw = range.toString();
    if (!raw.trim()) {
      setSel(null);
      return;
    }
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    const start = rawStart + lead;
    const end = rawStart + raw.length - trail;

    const rect = range.getBoundingClientRect();
    const base = wrap.getBoundingClientRect();
    const below = rect.top - base.top < 48;
    const x = Math.min(Math.max(rect.left - base.left + rect.width / 2, 16), Math.max(base.width - 16, 16));
    setSel({
      start,
      end,
      x,
      y: below ? rect.bottom - base.top : rect.top - base.top,
      below,
    });
    setCustomOpen(false);
    setCustomText('');
  };

  const addAnnotation = (kind: AnnotationKind) => {
    if (!sel) return;
    const ann: Ann = {
      id: uid(),
      quote: current.slice(sel.start, sel.end),
      start: sel.start,
      end: sel.end,
      kind,
      comment: kind === 'custom' ? customText.trim() : '',
    };
    // 与已有批注重叠的，用新批注替换
    setStale(false);
    setPending((prev) => [...prev.filter((a) => a.end <= ann.start || a.start >= ann.end), ann]);
    setSel(null);
    setCustomOpen(false);
    setCustomText('');
    window.getSelection()?.removeAllRanges();
  };

  const removeAnnotation = (id: string) => {
    setStale(false);
    setPending((prev) => prev.filter((a) => a.id !== id));
  };

  const back = () => {
    if (idx === 0) return;
    setIdx(idx - 1);
    setPending([]);
    setNote('');
    setSel(null);
  };

  const canRevise = !busy && (pending.length > 0 || note.trim().length > 0);
  const target = [context.role, context.company].filter(Boolean).join(' @ ');

  return createPortal(
    <div className="modal-mask rewrite-dialog-mask" role="dialog" aria-label={`改写${subject ?? '经历'}`} aria-modal="true" onClick={onClose}>
      <div className="modal rewrite-dialog" onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')).filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}} onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>AI 改写{subject ? ` · ${subject}` : ''}</h2>
            <p className="modal-sub">{materialMode?'素材内容优化':target || '未填写目标岗位'} · 结果只是建议，不会自动替换</p>
          </div>
          <button type="button" className="btn" autoFocus onClick={onClose}>
            保存草稿并关闭
          </button>
        </header>

        <div className="modal-body">
          <div className="ai-original">
            <span className="field-label">{subject ? `当前${subject}` : '素材原文'}</span>
            <p>{original}</p>
            {!materialMode&&<details><summary>目标岗位与 JD</summary><p>{target||'未填写目标岗位'}</p><p>{context.jd||'未关联 JD，仅根据原文优化表达。'}</p></details>}
          </div>

          <div className="rewrite-goals">
            <label className="ai-field"><span className="field-label">这次改写的目标</span><select disabled={busy} value={goal} onChange={e=>setGoal(e.target.value)}>{[...(materialMode?[]:['突出岗位相关成果']),'突出技术深度','说明个人贡献','保留事实，压缩约 20%','改善表达与可读性'].map(x=><option key={x}>{x}</option>)}</select></label>
            <details className="rewrite-extra"><summary>{materialMode?'补充改写要求':'补充改写要求与岗位背景'}</summary>
            <label className="ai-field"><span className="field-label">{materialMode?'补充要求（可选）':'重点岗位要求（可选）'}</span><textarea disabled={busy} rows={2} value={requirement} onChange={e=>setRequirement(e.target.value)} placeholder={materialMode?'例如：突出个人贡献，保留论文与实验成果，避免夸大。':'从 JD 中摘录本条经历要回应的要求；不会将要求当成已有经验。'}/></label>
            <details hidden={materialMode}><summary>{context.jd?'查看当前岗位 JD':'未关联 JD：仅根据原文优化表达'}</summary><p className="rewrite-jd">{context.jd||'可先在投递版本中补充岗位描述。'}</p></details>
            </details>
            <p className="ai-note">{materialMode?'点击生成才调用 AI；应用仅修改当前素材总结。':'点击生成才调用 AI；应用仅修改本版。'}</p>
          </div>
          {error && (
            <div className="ai-error">
              <p>{error}</p>
              {!editing && (
                <div className="ai-actions">
                  <button type="button" className="btn" onClick={() => void runDraft(config)}>
                    重试
                  </button>
                  <button type="button" className="btn" onClick={openSettings}>
                    检查设置
                  </button>
                </div>
              )}
            </div>
          )}

          {editing ? (
            <AiConfigForm
              saveLabel="保存并生成"
              onSave={(cfg) => {
                saveAiConfig(cfg);
                setConfig(cfg);
                setEditing(false);
                started.current = true;
                void runDraft(cfg);
              }}
              onCancel={candidates.length > 0 ? () => setEditing(false) : undefined}
            />
          ) : stage === 'pick' ? (
            <>
              {busy && (
                <div className="ai-loading">
                  <span className="spinner" />
                  正在生成 3 个版本…
                </div>
              )}

              {(showAlternatives ? candidates : candidates.slice(0,1)).map((c, i) => (
                <div className="ai-cand" key={i}>
                  <div className="ai-cand-head">
                    <span className="ai-tag">{c.label}</span>
                    <div className="ai-cand-actions">
                      {onTry && <button type="button" className="btn small" onClick={() => onTry(c.text)}>试排</button>}
                      <button type="button" className="btn small" onClick={() => applyText(c.text)}>
                        {subject ? '应用此版' : '用这条'}
                      </button>
                      <button
                        type="button"
                        className="btn small primary-ghost"
                        onClick={() => {
                          setStage('focus');
                          setSteps([...steps,
                            { text: c.text, annotations: [], note: '', check: checkNumbers(original, c.text) },
                          ]);
                          setIdx(steps.length);
                          setPending([]);
                          setNote('');
                        }}
                      >
                        继续改
                      </button>
                    </div>
                  </div>
                  <p className="ai-cand-text">{c.text}</p>
                  <RewriteReview original={original} text={c.text} />
                </div>
              ))}

              {candidates.length>1&&<button className="link-btn rewrite-alternatives" onClick={()=>setShowAlternatives(v=>!v)}>{showAlternatives?'收起其他写法':`查看其他 ${candidates.length-1} 种写法`}</button>}
              {!busy && !error && candidates.length === 0 && (
                <div className="ai-actions">
                  <button type="button" className="btn btn-primary" onClick={() => void runDraft(config)}>
                    生成 3 个候选
                  </button>
                </div>
              )}

              {!busy && !error && candidates.length > 0 && (
                <div className="ai-actions">
                  <button type="button" className="btn" onClick={() => void runDraft(config)}>
                    重新生成
                  </button>
                  <button type="button" className="btn" onClick={openSettings}>
                    接口设置
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="rw-editable"><span className="field-label">当前改写稿 · 可直接编辑</span><textarea rows={6} value={current} disabled={busy} onChange={e=>{const text=e.target.value;setSteps(old=>old.map((step,i)=>i===idx?{...step,text,check:checkNumbers(original,text)}:step));setPending([]);}}/></label>
              <label className="rw-history"><span className="field-label">历史稿</span><select value={idx} disabled={busy} onChange={e=>{setIdx(Number(e.target.value));setPending([]);setSel(null);}}>{steps.map((_,i)=><option key={i} value={i}>第 {i+1} 稿</option>)}</select></label>
              <RewriteReview original={original} text={current} />
              <div className="rw-round">
                <span className="rw-badge">第 {idx + 1} 版</span>
                {idx > 0 && (
                  <button type="button" className="link-btn" onClick={back}>
                    ← 回到第 {idx} 版
                  </button>
                )}
                <span className="rw-round-hint">选中文字加批注，或直接写整体意见</span>
              </div>

              <div className="rw-text-wrap">
                <div className="rw-text" ref={textRef} onMouseUp={onTextMouseUp}>
                  {renderMarked(current, pending)}
                </div>

                {sel && !busy && (
                  <div className={`rw-toolbar${sel.below ? ' below' : ''}`} style={{ left: sel.x, top: sel.y }}>
                    {customOpen ? (
                      <div className="rw-custom">
                        <input
                          autoFocus
                          value={customText}
                          placeholder="这段要怎么改？"
                          onChange={(e) => setCustomText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addAnnotation('custom');
                            if (e.key === 'Escape') setCustomOpen(false);
                          }}
                        />
                        <button
                          type="button"
                          className="rw-tb-btn solid"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addAnnotation('custom')}
                        >
                          确定
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="rw-tb-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addAnnotation('shorten')}
                        >
                          太啰嗦
                        </button>
                        <button
                          type="button"
                          className="rw-tb-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addAnnotation('remove')}
                        >
                          删掉
                        </button>
                        <button
                          type="button"
                          className="rw-tb-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addAnnotation('reword')}
                        >
                          换说法
                        </button>
                        <button
                          type="button"
                          className="rw-tb-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addAnnotation('keep')}
                        >
                          别动
                        </button>
                        <button
                          type="button"
                          className="rw-tb-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setCustomOpen(true)}
                        >
                          自定义…
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {hasNumberProblem(check) && (
                <div className="rw-warn">
                  {check!.missing.length > 0 && <span>本轮丢掉了数字：{check!.missing.join('、')}</span>}
                  {check!.extra.length > 0 && <span>出现原文没有的数字：{check!.extra.join('、')}</span>}
                </div>
              )}

              {stale && (
                <div className="rw-stale">
                  这一版和上一版完全一样：模型可能认为无需改动，或批注太模糊。
                  补充更具体的意见，或点「换个写法」再试一次。
                </div>
              )}

              {pending.length > 0 && (
                <div className="rw-anns">
                  <span className="field-label">批注 {pending.length} 条</span>
                  {pending.map((a) => (
                    <div className="rw-ann" key={a.id}>
                      <span className={`rw-ann-kind ${KIND_CLASS[a.kind]}`}>
                        {a.kind === 'custom' ? a.comment || '自定义' : ANNOTATION_LABEL[a.kind]}
                      </span>
                      <span className="rw-ann-quote">「{a.quote}」</span>
                      <button type="button" className="icon-btn" title="删除批注" onClick={() => removeAnnotation(a.id)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                className="rw-note"
                value={note}
                placeholder="也可以直接写整体意见，例如：再短一点，突出稳定性"
                onChange={(e) => {
                  setStale(false);
                  setNote(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canRevise) void runRevise(current, pending, note);
                }}
              />

              {busy && (
                <div className="ai-loading">
                  <span className="spinner" />
                  正在按批注改写…
                </div>
              )}

              <div className="ai-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={!canRevise}
                  onClick={() => void runRevise(current, pending, note)}
                >
                  继续调整
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    if (idx === 0) {
                      // 回到挑选态重新生成，否则新候选会生成在聚焦视图里、用户看不见
                      setStage('pick');
                      void runDraft(config);
                    } else {
                      void runRevise(current, [], '换个表达方式，事实和数字保持不变。');
                    }
                  }}
                >
                  {idx === 0 ? '重新生成候选' : '换个写法'}
                </button>
              </div>
            </>
          )}
        </div>

        <footer className="modal-foot rw-foot">
          <span className="ai-foot-note">{saveError?'草稿保存失败，请勿关闭弹窗。':materialMode?'草稿自动保存在本机；应用后才替换素材总结。':'草稿自动保存在本机；应用后才替换简历内容。'}</span>
          {stage === 'focus' && !editing && (
            <div className="rw-foot-actions">
              {onTry && <button type="button" className="btn" onClick={() => onTry(current)}>试排</button>}
              <button type="button" className="btn" onClick={() => setStage('pick')} disabled={busy}>
                返回候选
              </button>
              <button type="button" className="btn btn-primary" onClick={() => applyText(current)} disabled={busy||!current.trim()}>
                {materialMode?'应用到素材':'应用到简历'}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>, document.querySelector('.app.workspace-theme') ?? document.body
  );
}
