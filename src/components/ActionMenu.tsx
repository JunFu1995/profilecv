import { useEffect, useRef } from 'react';

export function ActionMenu({ label, primary, icon, leadingIcon, children }: { label: string; primary?: boolean; icon?: React.ReactNode; leadingIcon?: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute('open'); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && ref.current?.open) { ref.current.removeAttribute('open'); ref.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  return <details className="action-menu" ref={ref}>
    <summary className={`btn${primary ? ' btn-primary' : ''}${icon ? ' action-menu-icon' : ''}`} aria-label={icon ? label : undefined} title={icon ? label : undefined}>{icon ? <span aria-hidden="true">{icon}</span> : <>{leadingIcon}{label} <span aria-hidden>⌄</span></>}</summary>
    <div className="action-menu-content" onClick={event => {
      const button = (event.target as HTMLElement).closest('button');
      if (button && !button.disabled) ref.current?.removeAttribute('open');
    }}>{children}</div>
  </details>;
}
