import { joinProse } from '../prose';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../useEscapeKey';
import { isConfigured, loadAiConfig, saveAiConfig, type AiConfig } from '../ai';
import { COMPOSE_STYLES, type ComposeStyle } from '../composeStyles';
import { checkNumbers } from '../digits';
import { SummaryDiff } from './SummaryDiff';
import { AiConfigForm } from './AiConfigForm';

/** Generation and rewriting share the same preview-only state and confirmation boundary. */
export function SummaryAiDialog({title, subtitle, source, sourceKey, sourceLabel, checkSource, intent, request, onApply, onClose}: {
  title: string;
  subtitle: string;
  source: React.ReactNode;
  sourceKey: string;
  sourceLabel: string;
  checkSource: string;
  intent: 'generate' | 'rewrite';
  request: (style: ComposeStyle, config: AiConfig, signal: AbortSignal) => Promise<string>;
  onApply: (text: string) => void;
  onClose: () => void;
}) {
  const radioId = useId();
  const action = intent === 'rewrite' ? '改写' : '生成';
  useEscapeKey(onClose);
  const [config, setConfig] = useState<AiConfig>(loadAiConfig);
  const [editing, setEditing] = useState(() => !isConfigured(loadAiConfig()));
  const [style, setStyle] = useState<ComposeStyle>('balanced');
  const [candidate, setCandidate] = useState<{text: string; style: ComposeStyle; sourceHash: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { abortRef.current?.abort(); abortRef.current = null; }, []);

  const run = async () => {
    if (!isConfigured(config)) { setEditing(true); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const sourceHash = sourceKey;
    setBusy(true); setError(null);
    try {
      const out = await request(style, config, ctrl.signal);
      if (abortRef.current !== ctrl || ctrl.signal.aborted) return;
      const text = joinProse(out.split('\n'));
      if (!text) throw new Error('没有生成可用正文，请重试。');
      setCandidate({text, style, sourceHash});
    } catch (err) {
      if (abortRef.current !== ctrl || ctrl.signal.aborted) return;
      setError(err instanceof Error ? err.message : '生成失败，请重试。');
    } finally {
      if (abortRef.current === ctrl) { abortRef.current = null; setBusy(false); }
    }
  };
  const cancelGeneration = () => {
    abortRef.current?.abort(); abortRef.current = null; setBusy(false);
  };
  const sourceChanged = !!candidate && candidate.sourceHash !== sourceKey;
  const styleChanged = !!candidate && candidate.style !== style;
  const canApply = !!candidate?.text.trim() && !busy && !editing && !styleChanged && !sourceChanged;
  const numCheck = candidate ? checkNumbers(checkSource, candidate.text) : null;
  const apply = () => {
    if (!canApply || !candidate) return;
    onApply(joinProse(candidate.text.split('\n')));
  };

  return createPortal(
    <div className="modal-mask" role="dialog" aria-label={title} aria-modal="true" onClick={onClose}>
      <div className={`modal narrow compose-dialog${intent === 'rewrite' && candidate ? ' summary-rewrite-dialog' : ''}`} onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href]')).filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}} onClick={e=>e.stopPropagation()}>
        <header className="modal-head">
          <div><h2>{title}</h2><p className="modal-sub">{subtitle}</p></div>
          <button type="button" className="btn" autoFocus onClick={onClose}>关闭</button>
        </header>
        <div className="modal-body">
          <fieldset className="compose-style-picker" disabled={busy}>
            <legend>{action}风格</legend>
            <div className="compose-style-options">{COMPOSE_STYLES.map(item => <label key={item.id} className={`compose-style-option${style===item.id?' selected':''}`}>
              <input type="radio" name={radioId} value={item.id} checked={style===item.id} onChange={()=>setStyle(item.id)}/>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </label>)}</div>
          </fieldset>
          {!(intent === 'rewrite' && candidate) && <details className="compose-source">
            <summary>{sourceLabel}</summary>
            <div className="ai-original">{source}</div>
          </details>}
          {editing ? <AiConfigForm saveLabel="保存设置" onSave={cfg=>{saveAiConfig(cfg);setConfig(cfg);setEditing(false);}} onCancel={()=>setEditing(false)}/> : <>
            <div className="compose-generate-actions">
              <button type="button" className="btn primary-ghost" disabled={busy} onClick={()=>void run()}>{busy?`${action}中…`:candidate?`重新${action}`:`${action}预览`}</button>
              {busy ? <button type="button" className="btn" onClick={cancelGeneration}>停止{action}</button> : <button type="button" className="link-btn" onClick={()=>setEditing(true)}>接口设置</button>}
              <span className="field-hint">结果可编辑，确认应用才生效。</span>
            </div>
            {busy && <p className="ai-loading" role="status"><span className="spinner"/>正在按「{COMPOSE_STYLES.find(s=>s.id===style)?.label}」{action}…</p>}
            {error && <div className="ai-error" role="alert">{error}{candidate && ' 已保留上一版预览。'}</div>}
            {candidate ? <div className="compose-preview">
              <div className="compose-preview-head"><strong>{action}结果</strong><span>未应用 · {COMPOSE_STYLES.find(s=>s.id===candidate.style)?.label}</span></div>
              {intent === 'rewrite' && <SummaryDiff original={checkSource} candidate={joinProse(candidate.text.split('\n'))}/> }
              <label className="field"><span className="field-label">确认事实与措辞，可直接修改</span><textarea aria-label={`${action}结果正文`} rows={7} value={candidate.text} disabled={busy} onChange={e=>setCandidate({...candidate,text:e.target.value})}/></label>
              {(styleChanged || sourceChanged) && <p className="field-hint warn" role="status">{sourceChanged?'原文已变化':`${action}风格已切换`}，请重新{action}后再应用。</p>}
              {intent !== 'rewrite' && numCheck && (numCheck.missing.length>0 || numCheck.extra.length>0) && <div className="rw-warn">
                {numCheck.missing.length>0 && <span>请核对未保留的数字：{numCheck.missing.join('、')}</span>}
                {numCheck.extra.length>0 && <span>请核对新增的数字：{numCheck.extra.join('、')}</span>}
              </div>}
            </div> : !busy && <div className="compose-preview-empty">选择风格后{action}一段总结，结果会显示在这里。</div>}
          </>}
        </div>
        <footer className="modal-foot compose-footer">
          <span className="ai-foot-note">确认后替换当前总结，保留原始 STAR；关闭即放弃本次预览。</span>
          <div className="compose-footer-actions"><button type="button" className="btn" onClick={onClose}>取消</button><button type="button" className="btn btn-primary" disabled={!canApply} onClick={apply}>确认应用</button></div>
        </footer>
      </div>
    </div>, document.querySelector('.app.workspace-theme') ?? document.body
  );
}
