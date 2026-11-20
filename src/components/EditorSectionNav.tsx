import { useEffect, useRef, useState } from 'react';
import type { Master } from '../types';

export function EditorSectionNav({ content }: { content: Master }) {
  const sections = [
    { id: 'editor-目标岗位', label: '目标岗位', count: undefined },
    { id: 'editor-工作经历', label: '工作经历', count: content.work.length },
    { id: 'editor-独立项目', label: '独立项目', count: content.sideProjects.length },
    { id: 'editor-科研经历', label: '科研经历', count: content.research.length },
    { id: 'editor-发表论文', label: '发表论文', count: content.publications.length },
    { id: 'editor-教育经历', label: '教育经历', count: content.education.length },
    { id: 'editor-技能', label: '技能', count: content.skills.length },
    ...(content.customCategories ?? []).map(category => ({
      id: `editor-custom-${category.id}`, label: category.name || '未命名类别', count: category.items.length,
    })),
  ];
  const navRef = useRef<HTMLElement>(null);
  const selectedTarget = useRef<string | null>(null);
  const [active, setActive] = useState(sections[0].id);
  const sectionIds = JSON.stringify(sections.map(section => section.id));

  useEffect(() => {
    const nav = navRef.current;
    const panel = nav?.closest<HTMLElement>('.panel');
    if (!nav || !panel) return;
    const ids: string[] = JSON.parse(sectionIds);
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (selectedTarget.current) return;
        const top = nav.getBoundingClientRect().bottom + 24;
        let current = ids[0];
        for (const id of ids) {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= top) current = id;
        }
        setActive(current);
      });
    };
    const resumeTracking = () => { selectedTarget.current = null; update(); };
    // A clicked/focused section stays selected even when it is too near the bottom to align at the top.
    const focusSection = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const section = target.closest<HTMLElement>('section[id]');
      if (section && ids.includes(section.id)) {
        selectedTarget.current = section.id;
        setActive(section.id);
      }
    };
    panel.addEventListener('scroll', update, { passive: true });
    panel.addEventListener('wheel', resumeTracking, { passive: true });
    panel.addEventListener('touchstart', resumeTracking, { passive: true });
    panel.addEventListener('pointerdown', resumeTracking, { passive: true });
    panel.addEventListener('keydown', resumeTracking);
    panel.addEventListener('focusin', focusSection);
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    if (nav.parentElement) observer.observe(nav.parentElement);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      panel.removeEventListener('scroll', update);
      panel.removeEventListener('wheel', resumeTracking);
      panel.removeEventListener('touchstart', resumeTracking);
      panel.removeEventListener('pointerdown', resumeTracking);
      panel.removeEventListener('keydown', resumeTracking);
      panel.removeEventListener('focusin', focusSection);
    };
  }, [sectionIds]);

  return <nav ref={navRef} className="editor-section-nav" aria-label="简历章节">
    {sections.map(section => <button type="button" key={section.id}
      aria-current={active === section.id ? 'location' : undefined}
      aria-controls={section.id}
      onClick={() => {
        const target = document.getElementById(section.id);
        const panel = navRef.current?.closest<HTMLElement>('.panel');
        if (!target || !panel || !navRef.current) return;
        selectedTarget.current = section.id;
        setActive(section.id);
        panel.scrollTo({ top: panel.scrollTop + target.getBoundingClientRect().top - panel.getBoundingClientRect().top - navRef.current.offsetHeight - 12, behavior: 'instant' });
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }}><span>{section.label}</span>{section.count !== undefined && <small>{section.count}</small>}</button>)}
  </nav>;
}
