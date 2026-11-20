import { useEscapeKey } from '../useEscapeKey';
import { loadImportUndo, saveImportUndo, clearImportUndo, type ImportUndo } from '../import/apply';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FLUSH_WORKSPACE_EVENT } from '../workspaceLock';
import type { Doc } from '../types';
import { emptyDoc, sampleDoc } from '../data';
import { getDemoFlag, inspectStoredDoc, loadSnapshot, saveSnapshot, saveDoc, setDemoFlag } from '../storage';

/** 首次打开给一份示例，让人立刻看到排版效果；有存档则恢复存档。 */
function bootstrap(initialStorage: ReturnType<typeof inspectStoredDoc>): { doc: Doc; demo: boolean } {
  if (initialStorage.status === 'ready') return { doc: initialStorage.doc, demo: getDemoFlag() };
  if (initialStorage.status === 'error') return { doc: emptyDoc(), demo: false };
  setDemoFlag(true);
  return { doc: sampleDoc(), demo: true };
}

/** Owns a single mounted editing session and its durable recovery records. */
export function useWorkspaceDocument(cancelPendingWork: () => void) {
  // Re-read after every lock handoff; module-level snapshots survive unmounts.
  const [initialStorage] = useState(inspectStoredDoc);
  const [initialDocument] = useState(() => bootstrap(initialStorage));
  const [storageBlocked, setStorageBlocked] = useState(initialStorage.status === 'error');
  const [snapshot, setSnapshot] = useState<Doc | null>(() => loadSnapshot());
  const [recoveryError, setRecoveryError] = useState('');
  const [doc, setDoc] = useState<Doc>(initialDocument.doc);
  const [importUndo, setImportUndo] = useState<ImportUndo | null>(() => loadImportUndo());
  const [undoImportConfirm, setUndoImportConfirm] = useState(false);
  useEscapeKey(() => setUndoImportConfirm(false), undoImportConfirm);
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [isDemo, setIsDemo] = useState(initialDocument.demo);
  const sessionActive = useRef(true);
  useLayoutEffect(() => {
    sessionActive.current = true;
    return () => { sessionActive.current = false; cancelPendingWork(); };
  }, [cancelPendingWork]);
  // 自动保存：每次改动后延迟写入，避免每次按键都写 localStorage。
  useLayoutEffect(() => {
    if (storageBlocked) {
      const blockRelease = (event: Event) => {
        event.preventDefault();
        setRecoveryError('存档读取问题尚未处理，无法保存并结束编辑。请先导出原始存档，再保留副本并继续。');
      };
      window.addEventListener(FLUSH_WORKSPACE_EVENT, blockRelease);
      return () => window.removeEventListener(FLUSH_WORKSPACE_EVENT, blockRelease);
    }
    const persist = () => {
      if (!sessionActive.current) return false;
      const saved = saveDoc(doc);
      setStatus(saved ? 'saved' : 'failed');
      return saved;
    };
    const onFlush = (event: Event) => { if (!persist()) event.preventDefault(); };
    const onHidden = () => { if (document.visibilityState === 'hidden') persist(); };
    const t = setTimeout(persist, 400);
    window.addEventListener('pagehide', persist);
    window.addEventListener(FLUSH_WORKSPACE_EVENT, onFlush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pagehide', persist);
      window.removeEventListener(FLUSH_WORKSPACE_EVENT, onFlush);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [doc, storageBlocked]);

  useEffect(() => {
    if (status !== 'saved') return;
    const t = setTimeout(() => setStatus('idle'), 1600);
    return () => clearTimeout(t);
  }, [status]);

  const checkpoint = () => {
    if (!sessionActive.current) return false;
    if (storageBlocked) {
      setRecoveryError('请先处理存档读取错误，再执行此操作。');
      return false;
    }
    if (!saveSnapshot(doc)) {
      setRecoveryError('无法保存恢复快照，操作已停止。请先导出 JSON 备份并检查存储空间。');
      return false;
    }
    cancelPendingWork();
    setSnapshot(doc);
    setRecoveryError('');
    return true;
  };

  const restoreSnapshot = () => {
    if (!snapshot || storageBlocked) return false;
    if (!window.confirm('恢复到上次重要操作之前？当前内容会保存为新的恢复快照。')) return false;
    const previous = snapshot;
    if (!checkpoint()) return false;
    setDoc(previous);
    setIsDemo(false);
    setDemoFlag(false);
    return true;
  };

  const commitImport = (next: Doc): boolean => {
    if (!checkpoint()) return false;
    const receipt = { before: doc, after: next, wasDemo: isDemo };
    if (!saveImportUndo(receipt)) { setRecoveryError('无法保存导入撤销记录，导入未执行。'); return false; }
    if (!saveDoc(next)) {
      if (importUndo) saveImportUndo(importUndo); else clearImportUndo();
      setRecoveryError('浏览器存储空间不足，导入未执行。'); return false;
    }
    setImportUndo(receipt);
    setDoc(next); setIsDemo(false); setDemoFlag(false);
    return true;
  };
  const undoImport = (confirmed = false) => {
    if (!importUndo || storageBlocked) return false;
    if (!confirmed && JSON.stringify(doc) !== JSON.stringify(importUndo.after)) { setUndoImportConfirm(true); return false; }
    if (!checkpoint() || !saveDoc(importUndo.before)) { setRecoveryError('无法保存撤销结果，请先检查浏览器存储空间。'); return false; }
    setDoc(importUndo.before); setIsDemo(importUndo.wasDemo); setDemoFlag(importUndo.wasDemo);
    setImportUndo(null); clearImportUndo(); setUndoImportConfirm(false);
    return true;
  };

  const loadSample = () => {
    if (!window.confirm('载入示例会覆盖当前内容（含所有版本），建议先导出 JSON 备份。继续？')) return false;
    if (!checkpoint()) return false;
    setDoc(sampleDoc());
    setIsDemo(true);
    setDemoFlag(true);
    return true;
  };

  const resetAll = () => {
    if (!window.confirm('确定清空全部档案和简历？操作前会保存恢复快照，建议先下载完整备份。')) return false;
    if (!checkpoint()) return false;
    setDoc(emptyDoc());
    setIsDemo(false);
    setDemoFlag(false);
    return true;
  };

  const dismissDemo = () => {
    setIsDemo(false);
    setDemoFlag(false);
  };

  return {
    initialStorage,
    doc,
    setDoc,
    storageBlocked,
    setStorageBlocked,
    snapshot,
    recoveryError,
    setRecoveryError,
    status,
    isDemo,
    importUndo,
    undoImportConfirm,
    setUndoImportConfirm,
    checkpoint,
    restoreSnapshot,
    commitImport,
    undoImport,
    loadSample,
    resetAll,
    dismissDemo,
  };
}
