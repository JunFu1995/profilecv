import { useState } from 'react';
import { useEscapeKey } from '../useEscapeKey';
import { canPickSavePath, sanitizeFileName } from '../exportPdf';

export function ExportDialog({
  defaultName,
  busy,
  error,
  onExport,
  onClose,
}: {
  defaultName: string;
  busy: boolean;
  error: string;
  onExport: (filename: string, usePicker: boolean) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [name, setName] = useState(defaultName);
  const supportsPicker = canPickSavePath();
  const finalName = `${sanitizeFileName(name)}.pdf`;

  return (
    <div className="modal-mask" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>导出 PDF</h2>
            <p className="modal-sub">图片版：版式和预览一致，但文字不可检索</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="modal-body">
          <label className="ai-field">
            <span className="field-label">文件名</span>
            <div className="filename-row">
              <input
                value={name}
                autoFocus
                placeholder="简历"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !busy) onExport(finalName, supportsPicker);
                }}
              />
              <span className="filename-ext">.pdf</span>
            </div>
          </label>

          <p className="ai-note">
            {supportsPicker
              ? '「保存到…」可以自己选目录和文件名；「直接下载」存到浏览器默认下载目录。'
              : '当前浏览器不支持自选目录，只能下载到默认下载目录（Chrome / Edge 支持自选路径）。'}
          </p>

          {error && (
            <div className="ai-error">
              <p>{error}</p>
            </div>
          )}

          <div className="ai-actions">
            {supportsPicker && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => onExport(finalName, true)}
              >
                {busy ? '生成中…' : '保存到…'}
              </button>
            )}
            <button
              type="button"
              className={supportsPicker ? 'btn' : 'btn btn-primary'}
              disabled={busy}
              onClick={() => onExport(finalName, false)}
            >
              {busy ? '生成中…' : '直接下载'}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
