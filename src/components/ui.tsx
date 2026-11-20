import { resizeTextarea } from '../textareaResize';
import { useId, useLayoutEffect, useRef } from 'react';
import { Hint } from './Hint';

export function Field({
  label,
  value,
  onChange,
  placeholder,
  grow,
  locateId,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  grow?: boolean;
  locateId?: string;
  hint?: string;
}) {
  const id = useId();
  if (!hint) return <label className={`field${grow ? ' field-grow' : ''}`} data-locate={locateId}>
    <span className="field-label">{label}</span>
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  </label>;
  return (
    <div className={`field${grow ? ' field-grow' : ''}`} data-locate={locateId}>
      <div className="field-label-row"><label className="field-label" htmlFor={id}>{label}</label>{hint && <Hint label={`${label}填写说明`}>{hint}</Hint>}</div>
      <input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 2,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let previousWidth = -1;
    const resize = () => {
      if (!el.getClientRects().length || !el.clientWidth) return;
      previousWidth = el.clientWidth;
      resizeTextarea(el, minRows);
    };
    resize();
    // Closed details and hidden cards have no measurable width. Resize on reveal
    // and when the editor pane changes width, without reacting to our own height.
    const observer = new ResizeObserver(() => {
      const width = el.clientWidth;
      if (width === previousWidth) return;
      previousWidth = width;
      resize();
    });
    observer.observe(el);
    // Browsers can preserve a closed details descendant's width; its toggle
    // must also trigger measurement even when ResizeObserver sees no change.
    const disclosures: HTMLDetailsElement[] = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) {
        disclosures.push(parent);
        parent.addEventListener('toggle', resize);
      }
    }
    return () => {
      observer.disconnect();
      disclosures.forEach(details => details.removeEventListener('toggle', resize));
    };
  }, [value, minRows]);
  return (
    <textarea
      ref={ref}
      aria-label={ariaLabel}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function IconButton({
  title,
  onClick,
  children,
  danger,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-btn${danger ? ' danger' : ''}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
