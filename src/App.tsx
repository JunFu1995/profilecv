import { defaultViewTranslation } from './translate';
import './workspaceTheme.css';
import { useEscapeKey } from './useEscapeKey';
import { appendImport, loadImportUndo, saveImportUndo, clearImportUndo, type ImportUndo } from './import/apply';
import { collectMaterialDeletions } from './materialItemsTrash';

import { VariantJobContext } from './components/VariantJobContext';
import { type LibrarySection } from './components/LibraryNav';
import { RewriteDialog } from './components/RewriteDialog';
import { SECTION_KEYS, sectionGroups, setBulletText, clearBulletText } from './variants';
import { layoutFor, updateVariantLayout, type VariantLayout } from './variantLayout';
import { ManualCreateVariant } from './components/ManualCreateVariant';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { FLUSH_WORKSPACE_EVENT } from './workspaceLock';
import type { Doc, Master, Variant, SectionKey } from './types';
import { emptyDoc, sampleDoc } from './data';
import {
  downloadJson,
  getDemoFlag,
  inspectStoredDoc,
  loadSnapshot,
  saveSnapshot,
  preserveUnreadable,
  loadUi,
  saveDoc,
  saveUi,
  setDemoFlag,
} from './storage';
import { buildView, resolveVariant, editableVariantContent } from './variants';
import { locate, locatePath, locatePreview, summarySelection } from './locate';
import { localizeView, mergeTranslations, textKey } from './translate';
import { AiConfigDialog } from './components/AiConfigDialog';
import { ActionMenu } from './components/ActionMenu';
import { CategoryCreateDialog } from './components/CategoryCreateDialog';
import { InfoCircledIcon, PlusIcon, TrashIcon, DownloadIcon, GearIcon, UploadIcon, ChevronDownIcon, ExitIcon } from '@radix-ui/react-icons';
import { ResumeLibrary } from './components/ResumeLibrary';
import { LayoutPanel } from './components/LayoutPanel';
import { TranslationReview } from './components/TranslationReview';
import { AI_CONFIG_EVENT, isAiVerified, isConfigured, loadAiConfig, polishTranslation, translateTexts } from './ai';
import { translationBatches } from './translationBatches';
import { uid } from './id';
import { Editor } from './components/Editor';
import { VariantEditor } from './components/VariantEditor';
import { CompareDialog } from './components/CompareDialog';
import { Preview, type PreviewControl } from './components/Preview';
import { ImportDialog } from './components/ImportDialog';


/** 首次打开给一份示例，让人立刻看到排版效果；有存档则恢复存档。 */
function bootstrap(INITIAL_STORAGE: ReturnType<typeof inspectStoredDoc>): { doc: Doc; demo: boolean } {
  if (INITIAL_STORAGE.status === 'ready') return { doc: INITIAL_STORAGE.doc, demo: getDemoFlag() };
  if (INITIAL_STORAGE.status === 'error') return { doc: emptyDoc(), demo: false };
  setDemoFlag(true);
  return { doc: sampleDoc(), demo: true };
}

type WorkspaceMode = 'master' | 'resumes' | 'variant';

export default function App({ onEndEditing }: { onEndEditing: () => void }) {
  const DIRECT_EDITOR = /^\/editor\/?$/.test(window.location.pathname);
  const DIRECT_ARCHIVE = /^\/archive\/?$/.test(window.location.pathname);
  const DIRECT_RESUMES = /^\/resumes\/?$/.test(window.location.pathname);
  // Re-read after every lock handoff; module-level snapshots survive unmounts.
  const [INITIAL_STORAGE] = useState(inspectStoredDoc);
  const [BOOT] = useState(() => bootstrap(INITIAL_STORAGE));
  const [BOOT_UI] = useState(loadUi);
  const [storageBlocked, setStorageBlocked] = useState(INITIAL_STORAGE.status === 'error');
  const [snapshot, setSnapshot] = useState<Doc | null>(() => loadSnapshot());
  const [recoveryError, setRecoveryError] = useState('');
  const [doc, setDoc] = useState<Doc>(BOOT.doc);
  const [librarySection, setLibrarySection] = useState<LibrarySection | null>(null);
  const [archiveVisit, setArchiveVisit] = useState(0);
  const [archiveTrashOpen, setArchiveTrashOpen] = useState(false);
  const [archiveToolsOpen, setArchiveToolsOpen] = useState(BOOT_UI.archiveToolsOpen === true);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const selectLibrarySection = (section: LibrarySection | null) => { setLibrarySection(section); setArchiveTrashOpen(false); };
  const [mode, setModeState] = useState<WorkspaceMode>(
    DIRECT_RESUMES || (DIRECT_EDITOR && BOOT.doc.variants.length === 0) ? 'resumes' : DIRECT_ARCHIVE || BOOT.doc.variants.length === 0 ? 'master' : DIRECT_EDITOR ? 'variant' : BOOT_UI.mode,
  );
  const [activeId, setActiveId] = useState<string | null>(new URLSearchParams(window.location.search).get('resume') ?? BOOT_UI.activeVariantId);
  const setMode = (next: WorkspaceMode, resumeId?: string, replace = false) => {
    const id = resumeId ?? activeId ?? doc.variants[0]?.id;
    const path = next === 'master' ? '/archive' : next === 'resumes' ? '/resumes' : `/editor${id ? `?resume=${encodeURIComponent(id)}` : ''}`;
    if (`${window.location.pathname}${window.location.search}` !== path) window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
    if (next === 'variant' && id) setActiveId(id);
    setModeState(next);
  };
  const followLibraryLink = (event: React.MouseEvent<HTMLAnchorElement>, next: 'master' | 'resumes') => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (next === 'master') { selectLibrarySection(null); setArchiveVisit(visit => visit + 1); }
    setMode(next);
  };
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      if (/^\/editor\/?$/.test(path) && doc.variants.length) {
        const requested = new URLSearchParams(window.location.search).get('resume');
        const id = doc.variants.find(v => v.id === requested)?.id ?? doc.variants[0].id;
        setActiveId(id); setModeState('variant');
        window.history.replaceState(null, '', `/editor?resume=${encodeURIComponent(id)}`);
      } else {
        const resumes = /^\/(resumes|editor)\/?$/.test(path);
        setModeState(resumes ? 'resumes' : 'master');
        if (!resumes) { selectLibrarySection(null); setArchiveVisit(visit => visit + 1); }
        if (/^\/editor\/?$/.test(path)) window.history.replaceState(null, '', '/resumes');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [doc.variants]);
  const [previewRewrite,setPreviewRewrite]=useState<{variantId:string;section:SectionKey;groupId:string;bulletId:string;original:string;initial:string}|null>(null);
  const [trialText,setTrialText]=useState<string|null>(null);
  const [recentRewrite,setRecentRewrite]=useState<string|null>(null);
  useEffect(()=>{if(!recentRewrite)return;const timer=window.setTimeout(()=>setRecentRewrite(null),2400);return ()=>clearTimeout(timer);},[recentRewrite]);
  const fitControl=useRef<PreviewControl>(null);
  const [rewriteUndo,setRewriteUndo]=useState<{variantId:string;section:SectionKey;groupId:string;bulletId:string;text:string|undefined}|null>(null);
  const [comparing, setComparing] = useState(false);

  const [editorWidth,setEditorWidth]=useState(35);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [workTab, setWorkTab] = useState<'content' | 'layout' | 'check'>('content');
  const checkScroll=useRef(0);
  const [,setReturnToCheck]=useState(false);
  const checkOpen = workTab === 'check';
  const setCheckOpen = (open: boolean) => { setWorkTab(open ? 'check' : 'content'); setPane('edit'); };
  const [importOpen, setImportOpen] = useState(false);
  const [importUndo, setImportUndo] = useState<ImportUndo | null>(() => loadImportUndo());
  const [undoImportConfirm, setUndoImportConfirm] = useState(false);
  useEscapeKey(() => setUndoImportConfirm(false), undoImportConfirm);
  const [translating, setTranslating] = useState(false);
  const [aiDialog, setAiDialog] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const translateAbort = useRef<AbortController | null>(null);
  const sessionActive = useRef(true);
  useLayoutEffect(() => {
    sessionActive.current = true;
    return () => { sessionActive.current = false; translateAbort.current?.abort(); };
  }, []);
  const autoTranslationAttempts = useRef(new Set<string>());
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [isDemo, setIsDemo] = useState(BOOT.demo);
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    const panel = document.querySelector<HTMLElement>('.panel');
    if (panel) panel.scrollTop = workTab==='check' ? checkScroll.current : 0;
  }, [workTab]);
  useEffect(() => { setWorkTab('content'); setPane('edit'); }, [mode]);

  const activeVariant = doc.variants.find((v) => v.id === activeId) ?? doc.variants[0] ?? null;
  const showVariant = mode === 'variant' && activeVariant !== null;
  useEffect(() => {
    const path = mode === 'variant' && activeVariant ? `/editor?resume=${encodeURIComponent(activeVariant.id)}` : mode === 'master' ? '/archive' : '/resumes';
    if (`${window.location.pathname}${window.location.search}` !== path) window.history.replaceState(null, '', path);
    document.title = `${mode === 'variant' && activeVariant ? activeVariant.name || '未命名简历' : mode === 'resumes' ? '简历库' : '档案库'} · Profile CV`;
  }, [mode, activeVariant?.id, activeVariant?.name]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.querySelector('.panel')?.scrollTo({ top: 0 }));
    return () => cancelAnimationFrame(frame);
  }, [mode]);
  const layout = layoutFor(doc, showVariant ? activeVariant : null);
  const changeLayout = (patch: Partial<VariantLayout>) => {
    if (activeVariant) setDoc(d => updateVariantLayout(d, activeVariant.id, patch));
  };
  useEffect(() => {setPreviewRewrite(null);setTrialText(null);setRewriteUndo(null);setReturnToCheck(false);setRecentRewrite(null);checkScroll.current=0;}, [activeId,mode]);
  const previewVariant = activeVariant && previewRewrite?.variantId === activeVariant.id && trialText !== null
    ? setBulletText(activeVariant,previewRewrite.section,previewRewrite.groupId,previewRewrite.bulletId,trialText) : activeVariant;
  const openPreviewRewrite=(bulletId:string)=>{
    if(!activeVariant)return;
    for(const section of SECTION_KEYS)for(const group of sectionGroups(activeVariant.content ?? doc.master,section)){
      const bullet=group.bullets.find(b=>b.id===bulletId);
      const picked=activeVariant[section].find(g=>g.groupId===group.id)?.bullets.find(b=>b.bulletId===bulletId);
      if(bullet && picked){setPane('edit');setTrialText(null);setPreviewRewrite({variantId:activeVariant.id,section,groupId:group.id,bulletId,original:bullet.text,initial:picked.text ?? bullet.text});return;}
    }
  };
  const view = useMemo(() => showVariant && activeVariant
    ? resolveVariant(doc.master, previewVariant!) : buildView(doc.master),
    [showVariant, doc.master, previewVariant]);
  // 英文模式下把内容翻一遍：命中的用译文，没命中的保留原文并计入 missing
  const localized = useMemo(
    () => (layout.locale === 'en' ? localizeView(view, doc.translations) : { view, missing: [] as string[] }),
    [view, layout.locale, doc.translations],
  );
  const displayView = localized.view;
  const missing = localized.missing;
  // configVersion 只是用来在保存配置后触发重算
  const aiReady = useMemo(() => isConfigured(loadAiConfig()), [configVersion]);

  const aiVerified = useMemo(() => isAiVerified(loadAiConfig()), [configVersion]);
  const pendingAiAction = useRef<(() => void) | null>(null);
  useEffect(() => {
    const changed = () => setConfigVersion(v => v + 1);
    window.addEventListener(AI_CONFIG_EVENT, changed);
    window.addEventListener('storage', changed);
    return () => {
      window.removeEventListener(AI_CONFIG_EVENT, changed);
      window.removeEventListener('storage', changed);
    };
  }, []);

  const runTranslate = useCallback(async (texts: string[]) => {
    if (texts.length === 0) return;
    const config = loadAiConfig();
    if (!isConfigured(config)) return;
    translateAbort.current?.abort();
    const ctrl = new AbortController();
    translateAbort.current = ctrl;
    texts.forEach(text => autoTranslationAttempts.current.add(text));
    setTranslating(true);
    setTranslateError('');
    try {
      for (const batch of translationBatches(texts)) {
        const part = await translateTexts({ texts: batch, config, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setDoc((d) => ({ ...d, translations: mergeTranslations(d.translations, batch, part) }));
      }
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setTranslateError(err instanceof Error ? err.message : '翻译失败');
    } finally {
      if (translateAbort.current === ctrl) setTranslating(false);
    }
  }, []);

  const setTranslation = (src: string, en: string, manual: boolean) =>
    setDoc((d) => {
      const next = { ...d.translations };
      const key = textKey(src);
      if (!en.trim()) delete next[key];
      else next[key] = manual ? { src: src.trim(), en, manual: true } : { src: src.trim(), en };
      return { ...d, translations: next };
    });

  const polishOne = async (src: string, current: string, hint: string): Promise<string[]> => {
    const config = loadAiConfig();
    if (!isConfigured(config)) {
      setAiDialog(true);
      throw new Error('翻译润色需要先配置接口。');
    }
    return polishTranslation({ zh: src, current, hint, config, signal: new AbortController().signal });
  };

  const applyPolish = (src: string, text: string) =>
    setDoc((d) => {
      const key = textKey(src);
      const prev = d.translations[key];
      return {
        ...d,
        translations: {
          ...d.translations,
          [key]: {
            src: src.trim(),
            en: text,
            manual: true,
            polished: true,
            previous: prev?.en,
          },
        },
      };
    });

  const undoPolish = (src: string) =>
    setDoc((d) => {
      const key = textKey(src);
      const cur = d.translations[key];
      if (!cur?.previous) return d;
      return {
        ...d,
        translations: {
          ...d.translations,
          [key]: { src: cur.src, en: cur.previous, manual: true },
        },
      };
    });

  const retranslateOne = async (src: string) => {
    const fallback = defaultViewTranslation(view, src);
    if (fallback) { setTranslation(src, fallback, false); return; }
    const config = loadAiConfig();
    if (!isConfigured(config)) {
      pendingAiAction.current = () => void retranslateOne(src);
      setAiDialog(true);
      return;
    }
    try {
      const [en] = await translateTexts({ texts: [src], config, signal: new AbortController().signal });
      if (!en?.trim() || en.trim() === src.trim()) {
        setTranslateError('这一条没翻出结果，模型原样返回了。');
        return;
      }
      setTranslation(src, en, false);
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : '重译失败');
    }
  };

  // 切换版本、语言或接口时停止旧请求，允许在新编辑上下文重试。
  useEffect(() => {
    translateAbort.current?.abort();
    autoTranslationAttempts.current.clear();
    setTranslating(false);
    setTranslateError('');
  }, [showVariant, activeVariant?.id, layout.locale, configVersion]);

  // 输入停顿后仅翻译缺失的新正文；同一内容失败后由手动按钮重试，避免循环请求。
  useEffect(() => {
    if (!showVariant || layout.locale !== 'en' || translating || !aiReady) return;
    const texts = missing.filter(text => !autoTranslationAttempts.current.has(text));
    if (!texts.length) return;
    const timer = window.setTimeout(() => void runTranslate(texts), 800);
    return () => window.clearTimeout(timer);
  }, [showVariant, activeVariant?.id, layout.locale, missing, translating, aiReady, configVersion, runTranslate]);

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
    saveUi({ mode: mode === 'variant' ? 'variant' : 'master', activeVariantId: activeVariant?.id ?? null, archiveToolsOpen });
  }, [mode, activeVariant?.id, archiveToolsOpen]);

  useEffect(() => {
    if (!checkOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCheckOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checkOpen]);

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
    translateAbort.current?.abort();
    setSnapshot(doc);
    setRecoveryError('');
    return true;
  };

  const restoreSnapshot = () => {
    if (!snapshot || storageBlocked) return;
    if (!window.confirm('恢复到上次重要操作之前？当前内容会保存为新的恢复快照。')) return;
    const previous = snapshot;
    if (!checkpoint()) return;
    setDoc(previous);
    setIsDemo(false);
    setDemoFlag(false);
    selectLibrarySection(null); setArchiveVisit(visit => visit + 1);
    setMode('master');
    setActiveId(null);
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
    setMode('master'); selectLibrarySection('基本信息'); setActiveId(null); setImportOpen(false);
    return true;
  };
  const undoImport = (confirmed = false) => {
    if (!importUndo || storageBlocked) return;
    if (!confirmed && JSON.stringify(doc) !== JSON.stringify(importUndo.after)) { setUndoImportConfirm(true); return; }
    if (!checkpoint() || !saveDoc(importUndo.before)) { setRecoveryError('无法保存撤销结果，请先检查浏览器存储空间。'); return; }
    setDoc(importUndo.before); setIsDemo(importUndo.wasDemo); setDemoFlag(importUndo.wasDemo);
    setMode('master'); setActiveId(null); selectLibrarySection('基本信息');
    setImportUndo(null); clearImportUndo(); setUndoImportConfirm(false);
  };

  const setMaster = (master: Master) => setDoc((d) => ({ ...d, master:collectMaterialDeletions(d.master,master) }));

  const updateVariant = (next: Variant) =>
    setDoc((d) => ({ ...d, variants: d.variants.map((v) => (v.id === next.id ? next : v)) }));

  const handleNewVariant = () => setCreatingVariant(true);
  const finishCreateVariant = (v: Variant) => {
    v = { ...v, content: editableVariantContent(doc.master,v), layout: v.layout ?? layoutFor(doc) };
    setDoc(d => ({ ...d, variants: [...d.variants, v] }));
    setMode('variant', v.id); setWorkTab('content'); setPane('edit'); setCreatingVariant(false);
  };

  const duplicateResume = (id: string, open = false) => {
    const source = doc.variants.find(v => v.id === id);
    if (!source) return;
    const baseName = `${source.name} 副本`;
    let name = baseName;
    let suffix = 2;
    while (doc.variants.some(v => v.name === name)) name = `${baseName} ${suffix++}`;
    const copy: Variant = {
      ...structuredClone(source), layout: structuredClone(layoutFor(doc, source)), id: uid(), name,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setDoc(d => ({ ...d, variants: [...d.variants, copy] }));
    if (open) setMode('variant', copy.id);
  };

  const deleteResume = (id: string) => {
    const target = doc.variants.find(v => v.id === id);
    if (!target || !window.confirm(`删除简历「${target.name}」？档案库不受影响。`)) return;
    if (!checkpoint()) return;
    const rest = doc.variants.filter(v => v.id !== id);
    setDoc(d => ({ ...d, variants: d.variants.filter(v => v.id !== id) }));
    if (activeVariant?.id === id) {
      setActiveId(rest[0]?.id ?? null);
      if (mode === 'variant' && rest.length) setMode('variant', rest[0].id, true);
    }
    if (rest.length === 0 && mode === 'variant') setMode('resumes', undefined, true);
  };

  const loadSample = () => {
    if (!window.confirm('载入示例会覆盖当前内容（含所有版本），建议先导出 JSON 备份。继续？')) return;
    if (!checkpoint()) return;
    setDoc(sampleDoc());
    setIsDemo(true);
    setDemoFlag(true);
    selectLibrarySection(null); setArchiveVisit(visit => visit + 1);
    setActiveId(null);
    setMode('master');
  };

  const resetAll = () => {
    if (!window.confirm('确定清空全部档案和简历？操作前会保存恢复快照，建议先下载完整备份。')) return;
    if (!checkpoint()) return;
    setDoc(emptyDoc());
    setIsDemo(false);
    setDemoFlag(false);
    selectLibrarySection(null); setArchiveVisit(visit => visit + 1);
    setActiveId(null);
    setMode('master');
  };

  const dismissDemo = () => {
    setIsDemo(false);
    setDemoFlag(false);
  };

  const handlePrint = () => {
    // On phones the preview starts hidden, so paginate before print CSS hides the source.
    const prevPane = pane;
    flushSync(() => setPane('preview'));
    fitControl.current?.preparePrint();
    const prevTitle = document.title;
    const name = displayView.basics.name || '简历';
    const role = displayView.basics.title ? `-${displayView.basics.title}` : '';
    const variantTag = showVariant ? `-${activeVariant.name}` : '';
    document.title = `${name}${role}${variantTag}-简历`;
    const restore = () => {
      document.title = prevTitle;
      setPane(prevPane);
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const previewLinkFrame = useRef<number | null>(null);
  const previewLinkScroll = useRef(false);
  useEffect(() => () => { if (previewLinkFrame.current !== null) cancelAnimationFrame(previewLinkFrame.current); }, []);
  const syncEditorPreview = (source: HTMLElement, interaction: 'focus' | 'click' | 'select') => {
    if (!showVariant) return;
    if (interaction !== 'focus') {
      const textField = source.tagName === 'TEXTAREA' && source.closest('.project-summary-workspace, .research-star-fields, .variant-custom-item');
      const namedInput = interaction === 'click' && source.tagName === 'INPUT' && source.closest('label[data-locate], .field[data-locate]');
      if (!textField && !namedInput) return;
    }
    if (previewLinkFrame.current !== null) cancelAnimationFrame(previewLinkFrame.current);
    previewLinkScroll.current ||= interaction !== 'select';
    // 等鼠标落点、选区和正文渲染更新后，再读取当前光标位置。
    previewLinkFrame.current = requestAnimationFrame(() => {
      previewLinkFrame.current = null;
      const scroll = previewLinkScroll.current ? 'always' : 'if-changed';
      previewLinkScroll.current = false;
      if (!source.isConnected) return;
      const id = locatePreview(source, {scroll});
      if (id) setRecentRewrite(id);
    });
  };

  return (
    <div className="app workspace-theme">
      {showVariant && <header className="resume-editor-header no-print">
        <nav className="resume-breadcrumb" aria-label="当前位置">
          <a href="/resumes" onClick={event => followLibraryLink(event, 'resumes')}>简历库</a><span aria-hidden="true">/</span>
          <select className="variant-select" value={activeVariant.id} onChange={event => setMode('variant', event.target.value)} aria-label="选择版本">
            {doc.variants.map(variant => <option key={variant.id} value={variant.id}>{variant.name || '未命名简历'}</option>)}
          </select>
        </nav>
        <div className="resume-editor-tools">
          <button type="button" className="btn btn-primary resume-export" onClick={handlePrint} title="保存为文字可选中的 PDF"><DownloadIcon aria-hidden="true" />导出 PDF</button>
        </div>
      </header>}

      {storageBlocked && (
        <div className="recovery-banner no-print" role="alert">
          <strong>存档读取失败，已暂停自动保存，原始数据未被覆盖。</strong>
          <span>可先导出原始存档，再保留副本并继续编辑，或刷新重试。</span>
          <button type="button" className="btn" onClick={() => window.location.reload()}>重新读取</button>
          {INITIAL_STORAGE.status === 'error' && INITIAL_STORAGE.raw !== null && <>
            <button type="button" className="btn" onClick={() => {
              const url = URL.createObjectURL(new Blob([INITIAL_STORAGE.raw!], { type: 'application/json' }));
              const a = document.createElement('a');
              a.href = url; a.download = 'resume-recovery.json'; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}>导出原始存档</button>
            <button type="button" className="btn" onClick={() => {
              if (preserveUnreadable(INITIAL_STORAGE.raw!)) setStorageBlocked(false);
              else setRecoveryError('原始存档备份失败，自动保存仍暂停。请导出原始存档并检查存储空间。');
            }}>保留原始副本并继续</button>
          </>}
        </div>
      )}
      {recoveryError && <div className="recovery-banner no-print" role="alert">{recoveryError}</div>}
      {showVariant && <div className="mobile-switch no-print">
        <button type="button" className={pane === 'edit' ? 'active' : ''} onClick={() => setPane('edit')}>
          编辑
        </button>
        <button type="button" className={pane === 'preview' ? 'active' : ''} onClick={() => setPane('preview')}>
          预览
        </button>
      </div>}

      <main className={`workspace${mode !== 'variant' ? ' library-workspace' : ' variant-workspace'}`} style={{'--editor-width':`${editorWidth}%`} as React.CSSProperties}>
        {status === 'failed' && (
          <div className="save-alert" role="alert">
            <span>
              自动保存失败：本地存储已满或被浏览器禁用，<strong>你的改动没有存下来</strong>。
              先导出 JSON 备份，再删掉不用的版本或照片。
            </span>
            <button type="button" className="btn small" onClick={() => downloadJson(doc)}>
              立即导出 JSON
            </button>
          </div>
        )}
        <aside onFocusCapture={event=>syncEditorPreview(event.target as HTMLElement, 'focus')} onClick={event=>syncEditorPreview(event.target as HTMLElement, 'click')} onSelect={event=>syncEditorPreview(event.target as HTMLElement, 'select')} onScroll={e=>{if(workTab==='check')checkScroll.current=e.currentTarget.scrollTop;}} className={`panel no-print${pane === 'edit' ? ' pane-active' : ''}`}>
          {previewRewrite && activeVariant && <RewriteDialog key={`${activeVariant.id}:${previewRewrite.bulletId}`} draftKey={`${activeVariant.id}:${previewRewrite.bulletId}`} original={previewRewrite.original} initial={previewRewrite.initial}
        context={{jd:activeVariant.jobTarget.jdText,role:activeVariant.jobTarget.role,company:activeVariant.jobTarget.company,peers:SECTION_KEYS.flatMap(section=>sectionGroups(activeVariant.content ?? doc.master,section).flatMap(g=>g.bullets.map(b=>b.text))).filter(text=>text.trim() && text!==previewRewrite.original).slice(0,6)}}
        onTry={setTrialText}
        onClose={()=>{setPreviewRewrite(null);setTrialText(null);}}
        onApply={text=>{setRecentRewrite(previewRewrite.bulletId);setRewriteUndo({...previewRewrite,text:activeVariant[previewRewrite.section].find(g=>g.groupId===previewRewrite.groupId)?.bullets.find(b=>b.bulletId===previewRewrite.bulletId)?.text});updateVariant(setBulletText(activeVariant,previewRewrite.section,previewRewrite.groupId,previewRewrite.bulletId,text));setPreviewRewrite(null);setTrialText(null);}} />}
          <div className="editor-panel-content" hidden={false}>

          <div id="work-content" data-library-page={mode} role="region" aria-label={showVariant ? "简历内容" : mode === 'resumes' ? "简历库" : "档案库"} hidden={mode === 'variant' && workTab !== 'content'}>
          {!showVariant && <div className="workspace-intro archive-intro">
            <div className="archive-header-row">
            <div className="archive-intro-main">
              <div className="workspace-intro-heading">
                <a className="workspace-home-link" href="/" aria-label="履笺，返回首页" title="返回首页">
                  <img src="/brand-mark.svg" width="28" height="32" alt="" />
                </a>
                <h1>{mode === 'resumes' ? '简历库' : '档案库'}</h1>
                {mode === 'master' && <button type="button" className="btn archive-header-import" onClick={() => setImportOpen(true)}><UploadIcon aria-hidden="true" />导入档案</button>}
                {isDemo && <div className="demo-hint"><ActionMenu label="示例数据说明" icon={<InfoCircledIcon width={17} height={17} />}>
                  <p>当前是示例数据，方便你先看排版和版本功能。</p>
                  <div className="demo-hint-actions"><button type="button" onClick={resetAll}>清空开始写</button><button type="button" onClick={dismissDemo}>保留并编辑</button></div>
                </ActionMenu></div>}
              </div>
              {mode === 'resumes' && <p>按公司和岗位，管理每一份投递简历。</p>}
            </div>
              <div className="library-header-actions">
                {(status === 'failed' || storageBlocked) && <span className="document-status error" role="alert">{storageBlocked ? '保存已暂停' : '保存失败'}</span>}
                {mode === 'master' ? <a className="btn btn-primary library-flow-link" href="/resumes" onClick={event => followLibraryLink(event, 'resumes')}>进入简历库<span aria-hidden="true">→</span></a> : <a className="btn library-flow-link" href="/archive" onClick={event => followLibraryLink(event, 'master')}><span aria-hidden="true">←</span>返回档案库</a>}

              </div>
            </div>

          </div>}

          {showVariant && <VariantJobContext key={`job:${activeVariant.id}`} variant={activeVariant} onChange={updateVariant} />}

          {showVariant && layout.locale === 'en' && (missing.length > 0 || translating || translateError) && (
            <div className="translate-banner">
              {translating ? (
                <span className="translate-status">
                  <span className="spinner" />
                  正在翻译 {missing.length} 段内容…
                </span>
              ) : translateError ? (
                <span className="translate-status error">{translateError}</span>
              ) : (
                <span className="translate-status">
                  英文版还有 {missing.length} 段内容是中文。
                  {!aiReady && '翻译需要先配置一个 OpenAI 兼容的接口。'}
                </span>
              )}
              {!translating && (
                <button
                  type="button"
                  onClick={() => { if (aiReady) void runTranslate(missing); else { pendingAiAction.current = () => void runTranslate(missing); setAiDialog(true); } }}
                  title={aiReady ? '调用接口翻译缺失内容' : '配置一个 OpenAI 兼容接口'}
                >
                  {aiReady ? '翻译' : '去配置'}
                </button>
              )}
            </div>
          )}

          {mode === 'master' && <Editor key={archiveVisit} master={doc.master} onChange={setMaster} activeSection={librarySection} onSelectSection={selectLibrarySection} saveStatus={storageBlocked ? 'paused' : status} trashOpen={archiveTrashOpen} onTrashOpenChange={setArchiveTrashOpen} onCreateCategory={() => setCreatingCategory(true)} archiveTools={<nav className="archive-sidebar-tools" aria-label="档案工具">
            <details className="archive-tools-disclosure" open={archiveToolsOpen} onToggle={event => {
              if (event.target !== event.currentTarget) return;
              setArchiveToolsOpen(event.currentTarget.open);
              if (event.target === event.currentTarget && !event.currentTarget.open) event.currentTarget.querySelectorAll('details[open]').forEach(menu => menu.removeAttribute('open'));
            }}>
            <summary className="archive-tools-heading"><span>档案工具</span><ChevronDownIcon aria-hidden="true" /></summary>
            <div className="archive-sidebar-tool-group">
              <button type="button" onClick={() => setCreatingCategory(true)}><PlusIcon aria-hidden="true" />新增类别</button>
              <button type="button" aria-pressed={archiveTrashOpen} onClick={() => { setLibrarySection(null); setArchiveTrashOpen(open => !open); }}><TrashIcon aria-hidden="true" />回收站{((doc.master.hiddenCategories?.length ?? 0) + (doc.master.trashItems?.length ?? 0)) > 0 && <span className="archive-tool-count">{(doc.master.hiddenCategories?.length ?? 0) + (doc.master.trashItems?.length ?? 0)}</span>}</button>
              <ActionMenu label="备份与恢复" leadingIcon={<DownloadIcon aria-hidden="true" />}>
                <section className="archive-data-menu-group" aria-label="备份与恢复">
                <h3>备份与恢复</h3>
                <button type="button" onClick={() => downloadJson(doc)}>下载完整备份<span>保留档案、简历与排版设置</span></button>
                <button type="button" onClick={() => setImportOpen(true)}>导入备份</button>
                <button type="button" disabled={!snapshot || storageBlocked} onClick={restoreSnapshot}>恢复上次操作前</button>
                {importUndo && <button type="button" disabled={storageBlocked} onClick={() => undoImport()}>撤销本次导入</button>}
                </section>
                <section className="archive-data-menu-group" aria-label="数据管理">
                <h3>数据管理</h3>
                <button type="button" onClick={loadSample}>载入示例</button>
                <button type="button" className="danger" onClick={resetAll} aria-label="清空全部内容" aria-describedby="archive-clear-warning"><strong><TrashIcon aria-hidden="true" />清空全部内容</strong><span id="archive-clear-warning">危险操作：清空所有档案和简历，建议先备份。</span></button>
                </section>
              </ActionMenu>
              <button type="button" title={aiReady ? aiVerified ? 'AI 设置：已连接' : 'AI 设置：已配置' : 'AI 设置：未配置'} onClick={() => { pendingAiAction.current = null; setAiDialog(true); }}><GearIcon aria-hidden="true" />AI 设置</button>
              <button type="button" onClick={onEndEditing}><ExitIcon aria-hidden="true" />结束本页编辑</button>
            </div>
            </details>
          </nav>} />}
          {mode === 'resumes' && <ResumeLibrary doc={doc} onCreate={handleNewVariant}
            onOpen={id => setMode('variant', id)}
            onRename={(id, name) => setDoc(d => ({...d, variants:d.variants.map(v => v.id === id ? {...v, name} : v)}))}
            onDuplicate={id => duplicateResume(id)} onDelete={deleteResume} onCompare={() => setComparing(true)} />}

          {mode === 'variant' &&
            (activeVariant ? (
              <VariantEditor
                key={activeVariant.id}
                master={doc.master}
                variant={activeVariant}
                onChange={updateVariant}
                onOpenMaster={category => { const sections: Record<string, LibrarySection> = {work:'工作经历',projects:'独立项目',research:'科研经历',education:'教育经历',publications:'发表论文',skills:'技能'}; selectLibrarySection(category.startsWith('custom:')?category as LibrarySection:sections[category] ?? '基本信息'); setMode('master'); }}
                onRewrite={openPreviewRewrite}
              />
            ) : (
              <div className="empty-panel">
                <h2>还没有投递版本</h2>
                <p>
                  填写 JD，手动选择素材创建版本；之后可继续补充和编辑。
                </p>
                <button type="button" className="btn btn-primary" onClick={handleNewVariant}>
                  ＋ 新建版本
                </button>
              </div>
            ))}

          </div>
        </div>
        </aside>

        {showVariant&&<div className="workspace-resizer no-print" role="separator" aria-label="调整编辑区与预览区宽度" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={55} aria-valuenow={editorWidth} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setEditorWidth(w=>Math.max(25,Math.min(55,w+(e.key==='ArrowRight'?2:-2))));}else if(e.key==='Home')setEditorWidth(35);}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const box=e.currentTarget.parentElement!.getBoundingClientRect();setEditorWidth(Math.max(25,Math.min(55,Math.round((e.clientX-box.left)/box.width*100))));}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}/>}
        {showVariant && <section className={`stage${pane === 'preview' ? ' pane-active' : ''}`}>
          <div className="preview-feedback no-print">
          {trialText !== null && <div className="preview-trial-note" role="status"><span>正在试排，尚未保存</span> <button className="btn small" onClick={()=>setTrialText(null)}>取消试排</button></div>}
          {rewriteUndo && trialText === null && <div className="preview-trial-note" role="status"><span>已应用改写</span> <button className="btn small" onClick={()=>{if(activeVariant && activeVariant.id===rewriteUndo.variantId){const u=rewriteUndo;updateVariant(u.text===undefined?clearBulletText(activeVariant,u.section,u.groupId,u.bulletId):setBulletText(activeVariant,u.section,u.groupId,u.bulletId,u.text));}setRewriteUndo(null);}}>撤销改写</button><button type="button" className="preview-feedback-close" aria-label="关闭改写提示" onClick={()=>setRewriteUndo(null)}>×</button></div>}
          </div>
          <Preview
            activeBulletId={previewRewrite?.bulletId ?? recentRewrite}
            fitControl={fitControl}
            view={displayView}
            accent={layout.theme.accent}
            locale={layout.locale}
            scale={layout.layoutScale}
            stretch={layout.layoutStretch}
            template={layout.template}
            renderToolbar={viewControls => <>
              <LayoutPanel doc={{ ...doc, ...layout }} onChange={changeLayout} onSmartFit={()=>fitControl.current?.fit()} onReview={()=>setReviewOpen(true)} />
              <div className="preview-workspace-tools">{viewControls}</div>
            </>}
            onLayout={({ scale: layoutScale, stretch: layoutStretch }) =>
              changeLayout({ layoutScale, layoutStretch })
            }
            onLocate={id => { setPreviewRewrite(null); setTrialText(null); setWorkTab('content'); setPane('edit'); const content = activeVariant ? editableVariantContent(doc.master, activeVariant) : doc.master; locate(id, { focus: true, path: locatePath(content, id), selection: summarySelection(content, id) }); }}
          />

        </section>}
      </main>


      {creatingCategory && <CategoryCreateDialog master={doc.master} onClose={() => setCreatingCategory(false)} onCreate={category => {
        setMaster({ ...doc.master, customCategories: [...(doc.master.customCategories ?? []), category] });
        setCreatingCategory(false); selectLibrarySection(`custom:${category.id}`);
      }} />}
      {creatingVariant && <ManualCreateVariant layout={layoutFor(doc)} master={doc.master} onCreate={finishCreateVariant} onClose={() => setCreatingVariant(false)} onOpenMaster={() => {
        setCreatingVariant(false); selectLibrarySection('工作经历'); setMode('master');
        requestAnimationFrame(() => {
          document.querySelector('.library-workspace .panel')?.scrollTo({ top: 0 });
          document.querySelector<HTMLElement>('.archive-index-tab[aria-current]')?.focus({ preventScroll: true });
        });
      }} />}

      {reviewOpen && (
        <TranslationReview
          view={view}
          translations={doc.translations}
          onChange={setTranslation}
          onRetranslate={retranslateOne}
          onPolish={polishOne}
          onApplyPolish={applyPolish}
          onUndoPolish={undoPolish}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {aiDialog && (
        <AiConfigDialog
          onSaved={() => {
            setAiDialog(false);
            setConfigVersion((v) => v + 1);
            const resume = pendingAiAction.current;
            pendingAiAction.current = null;
            resume?.();
          }}
          onClose={() => { pendingAiAction.current = null; setAiDialog(false); }}
        />
      )}

      {undoImportConfirm && <div className="modal-mask" role="alertdialog" aria-modal="true" aria-labelledby="undo-import-title" aria-describedby="undo-import-description" onClick={() => setUndoImportConfirm(false)}>
        <div className="modal narrow" onClick={e => e.stopPropagation()}>
          <header className="modal-head"><h2 id="undo-import-title">撤销本次导入？</h2></header>
          <div className="modal-body"><p id="undo-import-description">导入后还有新的修改。撤销将恢复导入前的整份内容，之后的修改也会一起撤回。当前内容会保留为恢复快照。</p></div>
          <footer className="modal-foot"><button type="button" className="btn" autoFocus onClick={() => setUndoImportConfirm(false)}>保留当前内容</button><button type="button" className="btn btn-primary" disabled={storageBlocked} onClick={() => undoImport(true)}>确认撤销</button></footer>
        </div>
      </div>}

      {importOpen && (
        <ImportDialog
          existing={doc.master}
          variantCount={doc.variants.length}
          onApplyDoc={commitImport}
          onApplyMaster={(master, fields) => commitImport(appendImport(doc, master, fields))}
          onClose={() => setImportOpen(false)}
        />
      )}

      {comparing && doc.variants.length > 1 && (
        <CompareDialog
          doc={doc}
          initialLeft={activeVariant?.id ?? doc.variants[0].id}
          initialRight={
            doc.variants.find((v) => v.id !== (activeVariant?.id ?? doc.variants[0].id))?.id ?? doc.variants[1].id
          }
          onClose={() => setComparing(false)}
        />
      )}
    </div>
  );
}
