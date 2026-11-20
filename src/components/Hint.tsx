import { useId, useLayoutEffect, useRef, useState } from 'react';
import { InfoCircledIcon } from '@radix-ui/react-icons';

/** Click-only help in the browser's top layer, so cards cannot clip it. */
export function Hint({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const button = trigger.current;
      const popup = panel.current;
      if (!button || !popup) return;
      const anchor = button.getBoundingClientRect();
      if (!button.getClientRects().length || anchor.bottom < 0 || anchor.top > window.innerHeight) {
        popup.hidePopover();
        return;
      }
      const bounds = popup.getBoundingClientRect();
      const left = Math.max(16, Math.min(anchor.left, window.innerWidth - bounds.width - 16));
      const below = window.innerHeight - anchor.bottom - 16;
      const top = below < bounds.height && anchor.top > below
        ? Math.max(16, anchor.top - bounds.height - 8)
        : Math.min(anchor.bottom + 8, window.innerHeight - bounds.height - 16);
      popup.style.left = `${left}px`;
      popup.style.top = `${Math.max(16, top)}px`;
    };
    position();
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      document.removeEventListener('scroll', position, true);
    };
  }, [open]);

  return <span className="form-hint">
    <button ref={trigger} type="button" className="form-hint-trigger" aria-label={label}
      aria-expanded={open} aria-controls={id} popoverTarget={id}>
      <InfoCircledIcon width={16} height={16} aria-hidden="true" />
    </button>
    <div ref={panel} id={id} className="form-hint-popover" popover="auto" role="note" aria-label={label}
      onToggle={event => setOpen(event.newState === 'open')}>
      {children}
    </div>
  </span>;
}
