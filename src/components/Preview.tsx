import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Locale, ResumeView } from '../types';
import type { TemplateId } from '../templates';
import { A4_HEIGHT_PX, fitFeedback, fitPaper } from '../fit';
import { Paper } from './Paper';
import { Cross2Icon, ExclamationTriangleIcon, FileTextIcon } from '@radix-ui/react-icons';

import { A4_WIDTH_PX, paginatePaper, createPaperPage } from '../pagination';
const PAGE_GAP = 20;
export interface PreviewControl { fit: () => void; preparePrint: () => void }

export function Preview({
  view,
  accent,
  locale,
  scale,
  stretch,
  template,
  renderToolbar,
  onLayout,
  onLocate,
  onRewrite,
  fitControl,
  activeBulletId,
  locateBasics = true,
}: {
  activeBulletId?: string | null;
  locateBasics?: boolean;
  fitControl?: React.Ref<PreviewControl>;
  view: ResumeView;
  accent: string;
  locale: Locale;
  scale: number;
  stretch: number;
  template: TemplateId;
  renderToolbar?: (viewControls: React.ReactNode) => React.ReactNode;
  onLayout: (next: { scale: number; stretch: number }) => void;
  onLocate?: (id: string) => void;
  onRewrite?: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<() => void>(() => {});
  const [pages, setPages] = useState(1);
  const [pageRevision, setPageRevision] = useState(0);
  const [zoom,setZoom]=useState(1);
  const [previewScale, setPreviewScale] = useState(1);
  const [paperHeight, setPaperHeight] = useState(A4_HEIGHT_PX);
  const [note, setNote] = useState<{text: string; scale: number; stretch: number; context: string} | null>(null);
  const noteContext = useMemo(() => JSON.stringify([view, template, locale]), [view, template, locale]);
  // 提示只描述产生它的那次排版，重置、改字号、换模板或修改正文后立即失效。
  const visibleNote = note?.context === noteContext && note.scale === scale && note.stretch === stretch ? note : null;
  const [selectedBullet, setSelectedBullet] = useState<{ id: string; text: string } | null>(null);
  useEffect(()=>{
    const element=scrollRef.current;
    if(!element)return;
    const wheel=(event:WheelEvent)=>{
      if(!event.ctrlKey&&!event.metaKey)return;
      event.preventDefault();
      if(event.deltaY===0)return;
      const delta=event.deltaMode===1?event.deltaY*16:event.deltaMode===2?event.deltaY*element.clientHeight:event.deltaY;
      setZoom(current=>Math.max(.4,Math.min(2.5,current*Math.exp(-Math.max(-100,Math.min(100,delta))*.002))));
    };
    element.addEventListener('wheel',wheel,{passive:false});
    return()=>element.removeEventListener('wheel',wheel);
  },[]);

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const paper = paperRef.current;
    if (!scroll || !paper) return;

    let frame = 0;
    let rendered = "";
    const measure = () => {
      // 隐藏的移动端面板没有可用尺寸，保留上次布局，避免先缩到 20% 再放大。
      if (scroll.clientWidth === 0 || scroll.clientHeight === 0) return;
      const style = getComputedStyle(scroll);
      const available = scroll.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const width = paper.querySelector<HTMLElement>('.paper')?.offsetWidth || A4_WIDTH_PX;
      const nextScale = Math.min(1, Math.max(0.2, Math.floor(available) / width));
      const source = paper.querySelector<HTMLElement>('.paper');
      // Printing hides the measurement source. Keep the already prepared pages intact.
      if (!source || !pagesRef.current || source.getBoundingClientRect().width === 0) return;
      const pagination = paginatePaper(source);
      const count = pagination.slices.length;
      const signature = source.outerHTML + JSON.stringify(pagination);
      if (signature !== rendered) {
        pagesRef.current.replaceChildren(...pagination.slices.map(slice => createPaperPage(source, slice, pagination)));
        rendered = signature;
        setPageRevision(revision => revision + 1);
      }
      setPages(count);
      const nextHeight = count * A4_HEIGHT_PX + (count - 1) * PAGE_GAP;
      setPreviewScale(previous => Math.abs(previous - nextScale) < 0.0005 ? previous : nextScale);
      setPaperHeight(previous => previous === nextHeight ? previous : nextHeight);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measureRef.current = measure;
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(scroll);
    ro.observe(paper);
    return () => { ro.disconnect(); cancelAnimationFrame(frame); measureRef.current = () => {}; };

  }, [view, scale, stretch, template, locale, accent, locateBasics]);

  useEffect(() => {
    const bullets=pagesRef.current?.querySelectorAll<HTMLElement>('[data-bullet-id]');
    bullets?.forEach(el => {
      el.classList.toggle('preview-bullet-active', el.dataset.bulletId === (activeBulletId ?? selectedBullet?.id));
      if (onLocate || onRewrite) {
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `编辑：${el.textContent}`);
      } else { el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); }
    });
    if (selectedBullet && !Array.from(bullets ?? []).some(el => el.dataset.bulletId === selectedBullet.id)) setSelectedBullet(null);
  }, [view, scale, stretch, template, locale, onLocate, onRewrite, activeBulletId, selectedBullet, pageRevision]);


  const runFit = () => {
    // 注意：paperRef 是外层 holder，--fit 必须设在真正的 .paper 上，
    // 否则测量的高度不随缩放变化，二分会被压到下限。
    const el = paperRef.current?.querySelector<HTMLElement>('.paper');
    if (!el) return;
    const result = fitPaper(el);
    onLayout({ scale: result.scale, stretch: result.stretch });
    const feedback = fitFeedback(result, paginatePaper(el).slices.length);
    setNote(feedback ? { text: feedback.text, scale: result.scale, stretch: result.stretch, context: noteContext } : null);
  };

  useImperativeHandle(fitControl, () => ({ fit: runFit, preparePrint: () => measureRef.current() }));

  const viewControls = <>
        <div className="preview-zoom-controls" role="group" aria-label="显示比例" title="仅调整屏幕预览大小，不影响导出排版">
          <span>显示比例</span>
          <div className="toolbar-stepper">
          <button type="button" className="btn small" aria-label="缩小预览" disabled={zoom <= .4} onClick={()=>setZoom(z=>Math.max(.4,Math.round((z-.1)*10)/10))}>−</button>
          <button type="button" className="btn small preview-zoom-value" title="重置为适合宽度" aria-label={`显示比例 ${Math.round(zoom*100)}%，点击适宽`} onClick={()=>setZoom(1)}>{zoom === 1 ? '适宽' : `${Math.round(zoom*100)}%`}</button>
          <button type="button" className="btn small" aria-label="放大预览" disabled={zoom >= 2.5} onClick={()=>setZoom(z=>Math.min(2.5,Math.round((z+.1)*10)/10))}>＋</button>
          </div>
        </div>
        <span className="preview-page-count" aria-live="polite"><FileTextIcon aria-hidden="true"/>A4 · 共 {pages} 页</span>
      </>;

  return (
    <div className="preview-wrap">
      <div className={`preview-controls no-print${renderToolbar ? '' : ' preview-view-toolbar'}`}>
        {renderToolbar ? renderToolbar(viewControls) : viewControls}
      </div>
      {visibleNote && <div className="preview-fit-feedback no-print warning">
        <div className="preview-fit-message" role="alert">
          <ExclamationTriangleIcon aria-hidden="true" />
          <div><strong>暂时无法排成一页</strong><p>{visibleNote.text}</p></div>
        </div>
        <button type="button" className="btn preview-fit-dismiss" aria-label="关闭排版提示" onClick={() => setNote(null)}><Cross2Icon aria-hidden="true" /></button>
      </div>}
      <div tabIndex={0} aria-label="简历预览，可用 Ctrl 或 Command 加减号缩放，0 重置" className={`preview${onRewrite ? ' preview-rewrite-enabled' : ''}`} ref={scrollRef} onKeyDown={e => {
        if((e.ctrlKey||e.metaKey)&&['+','=','-','_','0'].includes(e.key)){e.preventDefault();e.stopPropagation();setZoom(value=>e.key==='0'?1:Math.max(.4,Math.min(2.5,Math.round((value+(['+','='].includes(e.key)?.1:-.1))*10)/10)));return;}
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-bullet-id]');
        if (el && (onLocate || onRewrite)) {
          e.preventDefault(); e.stopPropagation();
          setSelectedBullet(el.dataset.locate ? null : { id: el.dataset.bulletId!, text: el.textContent ?? '' });
          onLocate?.(el.dataset.bulletId!);
        }
      }} onClick={e => {
        const id = (e.target as HTMLElement).closest<HTMLElement>('[data-locate]')?.dataset.locate;
        if (id) onLocate?.(id);
      }} onClickCapture={e => {
        const bullet = (e.target as HTMLElement).closest<HTMLElement>('[data-bullet-id]');
        if (bullet && (onLocate || onRewrite)) {
          e.stopPropagation();
          setSelectedBullet(bullet.dataset.locate ? null : { id: bullet.dataset.bulletId!, text: bullet.textContent ?? '' });
          onLocate?.(bullet.dataset.bulletId!);
        }
      }}>
        <div ref={paperRef} className="preview-source no-print" aria-hidden="true" inert>
          <Paper view={view} accent={accent} locale={locale} scale={scale} stretch={stretch} template={template} locateBasics={locateBasics}/>
        </div>
        <div className="preview-frame" style={{ width: A4_WIDTH_PX * previewScale * zoom, height: paperHeight * previewScale * zoom }}>
          <div className="paper-holder" style={{ transform: `scale(${previewScale * zoom})`, transformOrigin: 'top left' }}>
            <div className="preview-pages" ref={pagesRef}/>
          </div>
        </div>
      </div>
      {selectedBullet && onRewrite && <footer className="preview-footer no-print">
        {selectedBullet && onRewrite && <div className="preview-selection-actions">
          <span title={selectedBullet.text}>已选要点：{selectedBullet.text}</span>
          <button type="button" className="btn small" onClick={() => onLocate?.(selectedBullet.id)}>编辑原文</button>
          <button type="button" className="btn btn-primary small" onClick={() => onRewrite(selectedBullet.id)}>AI 改写</button>
          <button type="button" className="link-btn" aria-label="取消选择" onClick={() => setSelectedBullet(null)}>×</button>
        </div>}
      </footer>}
    </div>
  );
}
