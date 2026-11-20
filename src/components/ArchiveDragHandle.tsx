import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gridDropTarget } from '../gridDropTarget';
import type { DropPosition } from '../archiveReorder';

export const ArchiveReorderContext = createContext<((source: string, target: string, position: DropPosition) => void) | null>(null);
type Drag = { card: HTMLElement; rows: HTMLElement[]; panel: HTMLElement | null; horizontal: boolean; startX: number; startY: number; x: number; y: number; active: boolean; target: HTMLElement | null; position: DropPosition; frame: number };
const heading = (card: HTMLElement) => card.querySelector<HTMLElement>(':scope > .card-head, :scope > .pcard-head') ?? card;
function siblings(button: HTMLElement, kind: 'material' | 'category') {
  const card = button.closest<HTMLElement>(kind === 'category' ? '.archive-index-item' : '.card, .pcard')!;
  const rows = Array.from(card.parentElement!.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node.matches(kind === 'category' ? '.archive-index-item' : '.card[data-locate], .pcard[data-locate]'));
  return { card, rows };
}

export function ArchiveDragHandle({ id, label, kind = 'material', onReorder }: { id: string; label: string; kind?: 'material' | 'category'; onReorder?: (source: string, target: string, position: DropPosition) => void }) {
  const contextReorder = useContext(ArchiveReorderContext);
  const reorder = onReorder ?? contextReorder;
  const rowId = (row: HTMLElement) => kind === 'category' ? row.dataset.categoryKey : row.dataset.locate;
  const session = useRef<Drag | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const clear = () => {
    const drag = session.current;
    if (!drag) return;
    cancelAnimationFrame(drag.frame);
    drag.card.removeAttribute('data-dragging');
    drag.target?.removeAttribute('data-drop-position');
    session.current = null;
    setGhost(null);
  };
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && session.current) { event.preventDefault(); clear(); setAnnouncement('已取消排序'); } };
    document.addEventListener('keydown', cancel);
    return () => { document.removeEventListener('keydown', cancel); clear(); };
  }, []);
  if (!reorder) return null;

  const updateTarget = (drag: Drag) => {
    drag.target?.removeAttribute('data-drop-position');
    drag.target = null;
    const bounds = drag.card.parentElement!.getBoundingClientRect();
    if (drag.horizontal ? drag.y < bounds.top || drag.y > bounds.bottom : drag.x < bounds.left || drag.x > bounds.right) return;
    const others = drag.rows.filter(row => row !== drag.card);
    if (drag.card.parentElement!.classList.contains('archive-card-grid')) {
      const source = drag.card.getBoundingClientRect();
      if (drag.x >= source.left && drag.x <= source.right && drag.y >= source.top && drag.y <= source.bottom) return;
      const hit = gridDropTarget(others.map(row => row.getBoundingClientRect()), drag, bounds.width);
      if (hit) {
        drag.target = others[hit.index]; drag.position = hit.position;
        drag.target.setAttribute('data-drop-position', hit.position);
      }
      return;
    }
    const target = others.find(row => { const rect = heading(row).getBoundingClientRect(); return drag.horizontal ? drag.x < rect.left + rect.width / 2 : drag.y < rect.top + rect.height / 2; });
    drag.target = target ?? others.at(-1) ?? null;
    drag.position = target ? 'before' : 'after';
    drag.target?.setAttribute('data-drop-position', drag.position);
  };
  const tick = () => {
    const drag = session.current;
    if (!drag?.active) return;
    if (drag.panel) {
      const bounds = drag.panel.getBoundingClientRect();
      const start = Math.max(0, drag.horizontal ? bounds.left : bounds.top);
      const end = Math.min(drag.horizontal ? innerWidth : innerHeight, drag.horizontal ? bounds.right : bounds.bottom);
      const pointer = drag.horizontal ? drag.x : drag.y;
      const speed = pointer < start + 40 ? -12 : pointer > end - 40 ? 12 : 0;
      if (drag.horizontal) drag.panel.scrollLeft += speed;
      else drag.panel.scrollTop += speed;
    }
    updateTarget(drag);
    drag.frame = requestAnimationFrame(tick);
  };
  return <>
    <button ref={button} type="button" className="icon-btn archive-drag-handle" aria-label={`拖动排序：${label}`} title={kind === 'category' ? '拖动分类排序，也可聚焦后按方向键调整' : '拖动排序，也可聚焦后按 ↑ ↓ 调整'} onClick={event => event.stopPropagation()}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return;
        const { card, rows } = siblings(event.currentTarget, kind);
        if (rows.length < 2) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        const horizontal = kind === 'category' && getComputedStyle(card.parentElement!).flexDirection === 'row';
        session.current = { card, rows, horizontal, panel: horizontal ? card.parentElement : card.closest('.panel'), startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false, target: null, position: 'before', frame: 0 };
      }}
      onPointerMove={event => {
        const drag = session.current;
        if (!drag) return;
        drag.x = event.clientX; drag.y = event.clientY;
        if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
        event.preventDefault();
        if (!drag.active) { drag.active = true; drag.card.dataset.dragging = 'true'; drag.frame = requestAnimationFrame(tick); }
        setGhost({ x: drag.x, y: drag.y }); updateTarget(drag);
      }}
      onPointerUp={event => {
        const drag = session.current;
        if (!drag) return;
        const target = drag.target ? rowId(drag.target) : undefined, position = drag.position, active = drag.active;
        clear();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (active && target) { reorder(id, target, position); setAnnouncement(`${label}顺序已调整`); }
      }}
      onPointerCancel={clear} onLostPointerCapture={clear}
      onKeyDown={event => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation(); clear();
        const { card, rows } = siblings(event.currentTarget, kind), index = rows.indexOf(card);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : index + (['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1);
        if (!rows[next] || next === index) return;
        reorder(id, rowId(rows[next])!, next < index ? 'before' : 'after');
        setAnnouncement(`${label}已移至第 ${next + 1} 条，共 ${rows.length} 条`);
        requestAnimationFrame(() => button.current?.scrollIntoView({ block: 'nearest' }));
      }}><DragHandleDots2Icon aria-hidden="true" /></button>
    <span className="archive-sort-announcement" role="status" aria-live="polite">{announcement}</span>
    {ghost && createPortal(<div className="archive-drag-preview" style={{ left: Math.min(ghost.x + 12, innerWidth - 220), top: ghost.y + 12 }}><DragHandleDots2Icon aria-hidden="true" />{label}</div>, document.body)}
  </>;
}
