import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import type { Doc, Variant } from '../types';
import { resolveVariant } from '../variants';
import { layoutFor } from '../variantLayout';
import { localizeView } from '../translate';
import { A4_WIDTH_PX, createPaperPage, paginatePaper } from '../pagination';
import { Paper } from './Paper';

/** Render the same first page as the editor, without its editing controls. */
export const ResumeThumbnail = memo(function ResumeThumbnail({ doc, variant }: { doc: Doc; variant: Variant }) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const layout = layoutFor(doc, variant);
  const view = useMemo(() => {
    const resolved = resolveVariant(doc.master, variant);
    return layout.locale === 'en' ? localizeView(resolved, doc.translations).view : resolved;
  }, [doc.master, doc.translations, variant, layout.locale]);

  useLayoutEffect(() => {
    const paper = sourceRef.current?.querySelector<HTMLElement>('.paper');
    const sheet = sheetRef.current;
    const page = pageRef.current;
    if (!paper || !sheet || !page) return;
    let frame = 0;
    let disposed = false;
    const resize = () => { page.style.transform = `scale(${sheet.clientWidth / A4_WIDTH_PX})`; };
    const render = () => {
      if (disposed) return;
      try {
        const pagination = paginatePaper(paper);
        page.replaceChildren(createPaperPage(paper, pagination.slices[0], pagination));
      } catch {
        // A malformed oversized entry must not prevent managing the document.
        page.replaceChildren(paper.cloneNode(true));
      }
      resize();
    };
    const schedule = () => { if (!disposed) { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); } };
    const paperObserver = new ResizeObserver(schedule);
    const sheetObserver = new ResizeObserver(resize);
    paperObserver.observe(paper);
    sheetObserver.observe(sheet);
    paper.addEventListener('load', schedule, true);
    void document.fonts.ready.then(schedule);
    render();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      paperObserver.disconnect();
      sheetObserver.disconnect();
      paper.removeEventListener('load', schedule, true);
    };
  }, [view, layout.template, layout.locale, layout.theme.accent, layout.layoutScale, layout.layoutStretch]);

  return <div className="resume-thumbnail" aria-hidden="true" inert>
    <div className="resume-thumbnail-source" ref={sourceRef}>
      <Paper view={view} accent={layout.theme.accent} locale={layout.locale} template={layout.template} scale={layout.layoutScale} stretch={layout.layoutStretch} />
    </div>
    <div className="resume-thumbnail-sheet" ref={sheetRef}><div className="resume-thumbnail-page" ref={pageRef} /></div>
  </div>;
});
