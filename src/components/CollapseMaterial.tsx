import { useContext } from 'react';
import { MaterialDisclosureContext } from '../useMaterialDisclosure';

export function CollapseMaterial({ onCollapse }: { onCollapse: () => void }) {
  const isResumeEditor = useContext(MaterialDisclosureContext) !== null;
  if (isResumeEditor) return null;

  return <button type="button" className="btn-ghost small collapse-material" onClick={event => {
    // 此按钮随正文卸载，先安排提交后的焦点恢复。
    const card = event.currentTarget.closest<HTMLElement>('.card, .pcard');
    if (card) {
      requestAnimationFrame(() => {
        if (!card.isConnected) return;
        card.querySelector<HTMLButtonElement>(':scope > .card-head .card-toggle, :scope > .pcard-head .card-toggle')?.focus({ preventScroll: true });
        card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      });
    }
    onCollapse();
  }}>↑ 收起并返回标题</button>;
}
