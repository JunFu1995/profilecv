import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { downloadJson, inspectStoredDoc } from './storage';
import { acquireWorkspaceLock, FLUSH_WORKSPACE_EVENT, type WorkspaceLease } from './workspaceLock';
import './workspaceGate.css';

// Importing the editor must not read or initialize storage before we own the lock.
const App = lazy(() => import('./App'));
type Access = 'checking' | 'editing' | 'blocked' | 'released' | 'unsupported';

export default function WorkspaceGate() {
  const [access, setAccess] = useState<Access>('checking');
  const [stored, setStored] = useState(inspectStoredDoc);
  const controls = useRef({ retry: () => {}, release: () => {} });

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let lease: WorkspaceLease | null = null;
    let acquiring = false;
    let releasing = false;

    const refresh = () => setStored(inspectStoredDoc());
    const acquire = async () => {
      if (disposed || acquiring || releasing || lease) return;
      acquiring = true;
      const attempt = ++generation;
      setAccess('checking');
      try {
        const next = await acquireWorkspaceLock(navigator.locks);
        if (disposed || generation !== attempt) { await next?.release(); return; }
        lease = next;
        refresh();
        setAccess(next ? 'editing' : 'blocked');
      } catch {
        if (!disposed && generation === attempt) setAccess('unsupported');
      } finally {
        if (generation === attempt) acquiring = false;
      }
    };
    const release = () => {
      if (releasing) return;
      // Save failure vetoes a handoff: keep the original editor and its unsaved content.
      if (lease && !window.dispatchEvent(new Event(FLUSH_WORKSPACE_EVENT, { cancelable: true }))) return;
      ++generation;
      acquiring = false;
      releasing = true;
      // Synchronously remove all timers, storage effects and async editor callbacks
      // before another document is allowed to acquire the lock.
      flushSync(() => setAccess('released'));
      refresh();
      const previous = lease;
      lease = null;
      void (previous?.release() ?? Promise.resolve()).finally(() => { releasing = false; });
    };
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) void acquire();
    };
    controls.current = { retry: () => void acquire(), release };
    window.addEventListener('storage', refresh);
    window.addEventListener('pagehide', release);
    window.addEventListener('pageshow', onShow);
    // StrictMode replays effects synchronously. Do not let the discarded mount
    // briefly own the browser lock and deny its replacement mount.
    void Promise.resolve().then(acquire);
    return () => {
      disposed = true;
      ++generation;
      window.removeEventListener('storage', refresh);
      window.removeEventListener('pagehide', release);
      window.removeEventListener('pageshow', onShow);
      void lease?.release();
    };
  }, []);

  if (access === 'editing') return <div className="workspace-session">
    <Suspense fallback={<div className="app-loading">正在打开简历工作台…</div>}><App onEndEditing={() => controls.current.release()} /></Suspense>
  </div>;

  const title = access === 'checking' ? '正在检查编辑状态…'
    : access === 'blocked' ? '此档案正在另一个标签页编辑'
    : access === 'released' ? '本页已结束编辑' : '当前环境暂时无法安全编辑';

  return <main className="workspace-access" aria-labelledby="workspace-access-title">
    <a className="workspace-access-brand" href="/">履笺</a>
    <p className="workspace-access-label">{access === 'checking' ? '正在连接本地档案' : '本页只读 · 内容不会被覆盖'}</p>
    <h1 id="workspace-access-title">{title}</h1>
    <p>{access === 'unsupported'
      ? '请使用 HTTPS 或 localhost 打开网页，并使用支持多标签页保护的新版浏览器。当前仍可下载已保存的备份。'
      : access === 'released'
        ? '内容已保存，可以在其他标签页继续编辑，也可以点击下方按钮重新进入本页。'
        : '要在这里继续，请先关闭原编辑标签页，或在原页面进入「档案库 → 档案工具」，点击「结束本页编辑」，然后点击下方按钮。进入时会读取最新保存的内容。'}</p>
    <div className="workspace-access-actions">
      <button type="button" className="btn btn-primary" disabled={access === 'checking'} onClick={() => controls.current.retry()}>在此继续编辑</button>
      {stored.status === 'ready' && <button type="button" className="btn" onClick={() => {
        const latest = inspectStoredDoc();
        setStored(latest);
        if (latest.status === 'ready') downloadJson(latest.doc);
      }}>下载已保存的备份</button>}
    </div>
    <section className="workspace-saved-summary" aria-label="已保存的档案" aria-live="polite">
      <h2>已保存的档案</h2>
      {stored.status === 'ready' ? <>
        <p><strong>{stored.doc.master.basics.name || '未填写姓名'}</strong>{stored.doc.master.basics.title && ` · ${stored.doc.master.basics.title}`}</p>
        <p>{stored.doc.variants.length} 份投递简历</p>
        {stored.doc.variants.length > 0 && <ul>{stored.doc.variants.map(variant => <li key={variant.id}>{variant.name}</li>)}</ul>}
        <small>这里只显示已保存内容，原页面尚未保存的修改不会出现在这里。</small>
      </> : <p>{stored.status === 'error' ? '存档暂时无法读取。原始数据仍保留，请在编辑页处理读取问题。' : '暂时没有已保存的档案。'}</p>}
    </section>
  </main>;
}
