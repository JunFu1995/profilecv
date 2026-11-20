import { useEffect, useRef } from 'react';

/** 弹窗统一用 Esc 关闭：点遮罩能关，键盘也得能关。 */
export function useEscapeKey(onClose: () => void, enabled = true): void {
  const ref = useRef(onClose);
  ref.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
