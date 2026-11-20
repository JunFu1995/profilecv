import { useEffect, useId, useRef, useState } from 'react';
import { AI_PROVIDERS, detectAiProvider, selectAiProvider } from '../aiProviders';
import type { AiConfig } from '../ai';
import { DEFAULT_AI, clearAiConfig, isAiVerified, loadAiConfig, testAiConnection, validateAiConfig } from '../ai';

/** 所有 AI 功能共用的配置表单。 */
export function AiConfigForm({ onSave, onCancel, saveLabel = '保存' }: {
  onSave: (config: AiConfig) => void;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const keyInputId = useId();
  const [draft, setDraft] = useState<AiConfig>(() => ({ ...loadAiConfig(), remember: loadAiConfig().remember ?? true }));
  const [provider, setProvider] = useState(() => detectAiProvider(loadAiConfig().baseUrl));
  const selectedProvider = AI_PROVIDERS.find(p => p.id === provider);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verified, setVerified] = useState(() => isAiVerified(loadAiConfig()));
  const controller = useRef<AbortController | null>(null);
  const errorMessage = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (error) errorMessage.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);
  const change = (patch: Partial<AiConfig>) => {
    controller.current?.abort();
    controller.current = null;
    setTesting(false);
    setVerified(false);
    setError('');
    setDraft(d => ({ ...d, ...patch }));
  };
  const normalized = (): AiConfig => ({ ...draft, baseUrl: draft.baseUrl.trim().replace(/\/+$/, ''), model: draft.model.trim(), apiKey: draft.apiKey.trim() });
  const submit = () => {
    const next = normalized();
    const invalid = validateAiConfig(next);
    if (invalid) { setError(invalid); return; }
    try { onSave(next); } catch (err) { setError(err instanceof Error ? err.message : '保存失败'); }
  };
  const test = async () => {
    const next = normalized();
    const invalid = validateAiConfig(next);
    if (invalid) { setError(invalid); return; }
    const ctrl = new AbortController();
    controller.current?.abort();
    controller.current = ctrl;
    setTesting(true); setError(''); setVerified(false);
    const timeout = setTimeout(() => ctrl.abort(new Error('连接超时，请检查地址或网络后重试。')), 60000);
    try {
      await testAiConnection(next, ctrl.signal);
      if (controller.current === ctrl) setVerified(true);
    } catch (err) {
      if (controller.current === ctrl) setError(ctrl.signal.aborted ? '连接测试已取消或超时，请重试。' : err instanceof Error ? err.message : '连接失败');
    } finally {
      clearTimeout(timeout);
      if (controller.current === ctrl) setTesting(false);
    }
  };
  return <div className="ai-form ai-config-form">
    <div className="ai-config-fields">
      <section className="ai-config-card" aria-label="服务与模型">
        <h3>服务与模型</h3>
        <div className="ai-config-grid">
          <label className="ai-field"><span className="field-label">服务商</span>
            <select value={provider} onChange={e => {
              const id = e.target.value;
              setProvider(id); setVisible(false);
              change(selectAiProvider(draft, id));
            }}>
              {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="custom">自定义 · OpenAI 兼容接口</option>
            </select>
          </label>
          <label className="ai-field"><span className="field-label">模型</span>
            <input value={draft.model} placeholder={selectedProvider?.model ?? '填写模型 ID'} onChange={e => change({ model: e.target.value })} autoComplete="off" />
          </label>
        </div>
        <label className="ai-field"><span className="field-label">接口地址</span>
          <input value={draft.baseUrl} placeholder={DEFAULT_AI.baseUrl} onChange={e => { change({ baseUrl: e.target.value, apiKey: '' }); setVisible(false); }} autoComplete="off" />
        </label>
        <p className="ai-provider-hint">{selectedProvider ? <>{selectedProvider.hint} <a href={selectedProvider.docs} target="_blank" rel="noreferrer">官方接入文档 ↗</a></> : '填写自己的兼容接口地址和模型名称。'}</p>
      </section>
      <section className="ai-config-card" aria-label="访问与保存">
        <h3>访问与保存</h3>
        <div className="ai-field">
          <label className="field-label" htmlFor={keyInputId}>API Key</label>
          <div className="ai-key-control">
            <input id={keyInputId} type={visible ? 'text' : 'password'} value={draft.apiKey} placeholder="sk-..." onChange={e => change({ apiKey: e.target.value })} autoComplete="off" spellCheck={false} />
            <button type="button" className="btn" onClick={() => setVisible(v => !v)} aria-pressed={visible} aria-controls={keyInputId}>{visible ? '隐藏 Key' : '显示 Key'}</button>
          </div>
        </div>
        <label className="ai-field"><span className="field-label">保存方式</span>
          <select value={draft.remember === false ? 'session' : 'local'} onChange={e => change({ remember: e.target.value === 'local' })}>
            <option value="local">记住配置（当前浏览器）</option>
            <option value="session">仅本次使用（刷新后清除）</option>
          </select>
        </label>
        <p className="ai-note">请求由浏览器直接发送至填写的地址。{draft.remember === false ? '仅保留在本页内存中；保存后移除之前持久保存的配置。' : 'Key 保存在当前浏览器的本地存储中。'}</p>
      </section>
      <section className="ai-config-card" aria-label="连接验证">
        <div className="ai-config-card-heading">
          <h3>连接验证</h3>
          <button type="button" className="btn" disabled={testing} onClick={() => void test()}>测试连接</button>
        </div>
        <div className="ai-connection-status" role="status" aria-live="polite">{testing ? '正在测试连接…' : verified ? '连接验证成功（本次页面会话）' : '当前填写内容尚未验证'}</div>
        <p className="ai-note">只发送固定短消息，不发送简历，可能产生少量接口费用。</p>
        {error && <div ref={errorMessage} className="ai-error" role="alert">{error}</div>}
      </section>
    </div>
    <div className="ai-actions ai-config-actions">
      <button type="button" className="btn config-clear" disabled={testing} onClick={() => {
        if (!window.confirm('清除全局 AI 配置及已保存的 API Key？简历内容不受影响。')) return;
        try { clearAiConfig(); setProvider('deepseek'); change({ ...DEFAULT_AI, remember: true }); } catch (err) { setError(err instanceof Error ? err.message : '清除失败'); }
      }}>清除配置</button>
      {onCancel && <button type="button" className="btn" onClick={onCancel}>取消</button>}
      <button type="button" className="btn btn-primary" disabled={testing} onClick={submit}>{saveLabel}</button>
    </div>
  </div>;
}
