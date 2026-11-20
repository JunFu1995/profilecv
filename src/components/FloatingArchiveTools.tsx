import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function FloatingArchiveTools({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const visible = hovered || pinned || focused || menuOpen;

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setPinned(false); setHovered(false); setFocused(false);
      }
    };
    const observer = new MutationObserver(() => setMenuOpen(!!root.current?.querySelector('details[open]')));
    if (root.current) observer.observe(root.current, { subtree: true, attributes: true, attributeFilter: ['open'] });
    document.addEventListener('pointerdown', outside);
    return () => { observer.disconnect(); document.removeEventListener('pointerdown', outside); };
  }, []);

  return <div ref={root} className="archive-tools-zone" data-visible={visible}
    onPointerEnter={event => { if (event.pointerType === 'mouse' && matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)').matches) setHovered(true); }}
    onPointerLeave={() => setHovered(false)}
    onFocusCapture={event => { const target = event.target as HTMLElement; if (target !== trigger.current) setFocused(target.matches(':focus-visible')); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onClickCapture={event => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button || button.disabled || !button.closest('.archive-tools-floating')) return;
      setPinned(false); setHovered(false); setFocused(false);
      trigger.current?.focus({ preventScroll: true });
    }}
    onKeyDown={event => {
      if (event.key !== 'Escape' || root.current?.querySelector('details[open]')) return;
      event.preventDefault(); setPinned(false); setHovered(false); setFocused(false);
      trigger.current?.focus({ preventScroll: true });
    }}>
    <button ref={trigger} type="button" className="btn archive-tools-trigger" aria-label="档案工具" aria-expanded={visible} aria-controls={id}
      onClick={() => { if (visible) root.current?.querySelectorAll('details[open]').forEach(menu => menu.removeAttribute('open')); setPinned(!visible); setHovered(false); setFocused(false); }}>
      <MixerHorizontalIcon aria-hidden="true" /><span className="archive-tools-trigger-label">档案工具</span>
    </button>
    <div id={id} className="archive-tools-floating" inert={!visible}>{children}</div>
  </div>;
}
