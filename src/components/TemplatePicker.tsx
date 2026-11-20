import { useState } from 'react';
import { TEMPLATES, type TemplateId } from '../templates';

export function TemplatePicker({
  value,
  onChange,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = TEMPLATES.find((t) => t.id === value) ?? TEMPLATES[0];

  return (
    <div className="tpl-picker">
      <button type="button" className="tpl-trigger" onClick={() => setOpen((v) => !v)}>
        模板 · {current.name}
        <span className="tpl-caret">▾</span>
      </button>

      {open && (
        <>
          <div className="tpl-backdrop" onClick={() => setOpen(false)} />
          <div className="tpl-menu" role="menu">
            {TEMPLATES.map((t) => (
              <button
                type="button"
                key={t.id}
                role="menuitem"
                className={`tpl-item${t.id === value ? ' active' : ''}`}
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
              >
                <span className={`tpl-swatch tpl-${t.id}`} aria-hidden />
                <span className="tpl-text">
                  <span className="tpl-name">{t.name}</span>
                  <span className="tpl-desc">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
