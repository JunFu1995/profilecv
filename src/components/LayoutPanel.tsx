import { CheckIcon } from '@radix-ui/react-icons';
import type { Doc } from '../types';
import { TEMPLATES } from '../templates';

const COLORS = [
  { value: '#1f5f9e', name: '蓝色' },
  { value: '#2d5f4c', name: '绿色' },
  { value: '#8a3d2f', name: '砖红' },
  { value: '#33373d', name: '深灰' },
  { value: '#4a3f7a', name: '紫色' },
];

export function LayoutPanel({ doc, onChange, onReview, onSmartFit }: {
  doc: Doc;
  onChange: (patch: Partial<Doc>) => void;
  onReview: () => void;
  onSmartFit: () => void;
}) {
  return <div className="layout-toolbar" role="toolbar" aria-label="简历排版">
    <div className="layout-selects">
      <label className="layout-tool-select layout-template-select"><span>模板</span>
        <select aria-label="版式模板" value={doc.template} onChange={event => onChange({ template: event.target.value as Doc['template'] })}>
          {TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      <label className="layout-tool-select"><span>语言</span>
        <select aria-label="简历语言" value={doc.locale} onChange={event => onChange({ locale: event.target.value as Doc['locale'] })}>
          <option value="zh">中文</option><option value="en">English</option>
        </select>
      </label>
    </div>
      <div className="layout-tool-colors" role="group" aria-label="主题色">
        <span>主题色</span>
        <div className="layout-color-options">{COLORS.map(color => <button
          type="button" key={color.value} className={`layout-color${doc.theme.accent === color.value ? ' selected' : ''}`}
          title={color.name} aria-label={`主题色：${color.name}`}
          aria-pressed={doc.theme.accent === color.value}
          onClick={() => onChange({ theme: { ...doc.theme, accent: color.value } })}>
          <span className="layout-color-swatch" style={{ background: color.value }} aria-hidden="true">
            {doc.theme.accent === color.value && <CheckIcon />}
          </span>
        </button>)}</div>
      </div>
    <div className="layout-actions">
      {doc.locale === 'en' && <button type="button" className="btn layout-review" onClick={onReview}>校对译文</button>}
      <button type="button" className="btn layout-fit" onClick={onSmartFit} title="保留全部文字，自动调整为一页">智能一页</button>
    </div>
  </div>;
}
