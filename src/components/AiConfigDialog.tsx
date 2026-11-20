import { useEscapeKey } from '../useEscapeKey';
import type { AiConfig } from '../ai';
import { saveAiConfig } from '../ai';
import { AiConfigForm } from './AiConfigForm';

/** 从任何入口都能打开的接口配置弹窗（翻译、改写、合成、导入共用一套）。 */
export function AiConfigDialog({
  onSaved,
  onClose,
}: {
  onSaved: (config: AiConfig) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  return (
    <div className="modal-mask" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" onClick={onClose}>
      <div className="modal narrow ai-settings-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2 id="ai-settings-title">AI 设置</h2>
            <p className="modal-sub">
              所有 AI 功能共用此配置
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="modal-body">
          <AiConfigForm
            saveLabel="保存"
            onSave={(config) => {
              saveAiConfig(config);
              onSaved(config);
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
