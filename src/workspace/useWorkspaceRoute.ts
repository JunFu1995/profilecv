import { type LibrarySection } from '../components/LibraryNav';
import { useEffect, useState } from 'react';
import type { Doc } from '../types';
import { loadUi, saveUi } from '../storage';

type WorkspaceMode = 'master' | 'resumes' | 'variant';

/** Keeps route, active resume and archive navigation in sync with browser history. */
export function useWorkspaceRoute(doc: Doc) {
  const DIRECT_EDITOR = /^\/editor\/?$/.test(window.location.pathname);
  const DIRECT_ARCHIVE = /^\/archive\/?$/.test(window.location.pathname);
  const DIRECT_RESUMES = /^\/resumes\/?$/.test(window.location.pathname);
  const [initialUi] = useState(loadUi);
  const [librarySection, setLibrarySection] = useState<LibrarySection | null>(null);
  const [archiveVisit, setArchiveVisit] = useState(0);
  const [archiveTrashOpen, setArchiveTrashOpen] = useState(false);
  const [archiveToolsOpen, setArchiveToolsOpen] = useState(initialUi.archiveToolsOpen === true);
  const selectLibrarySection = (section: LibrarySection | null) => { setLibrarySection(section); setArchiveTrashOpen(false); };
  const [mode, setModeState] = useState<WorkspaceMode>(
    DIRECT_RESUMES || (DIRECT_EDITOR && doc.variants.length === 0) ? 'resumes' : DIRECT_ARCHIVE || doc.variants.length === 0 ? 'master' : DIRECT_EDITOR ? 'variant' : initialUi.mode,
  );
  const [activeId, setActiveId] = useState<string | null>(new URLSearchParams(window.location.search).get('resume') ?? initialUi.activeVariantId);
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
  useEffect(() => {
    saveUi({ mode: mode === 'variant' ? 'variant' : 'master', activeVariantId: activeVariant?.id ?? null, archiveToolsOpen });
  }, [mode, activeVariant?.id, archiveToolsOpen]);

  return {
    mode,
    setMode,
    activeId,
    setActiveId,
    activeVariant,
    showVariant,
    librarySection,
    setLibrarySection,
    selectLibrarySection,
    archiveVisit,
    setArchiveVisit,
    archiveTrashOpen,
    setArchiveTrashOpen,
    archiveToolsOpen,
    setArchiveToolsOpen,
    followLibraryLink,
  };
}
