import { ArchiveDragHandle } from './ArchiveDragHandle';
import { archiveCategoryOrder } from '../archiveCategoryOrder';
import type { DropPosition } from '../archiveReorder';
import type { Master } from '../types';
import { LIBRARY_SECTIONS, LibrarySectionIcon, type LibrarySection } from './LibraryNav';

export function archiveCategories(master: Master) {
  const counts: Record<typeof LIBRARY_SECTIONS[number], number> = {
    基本信息: 0, 工作经历: master.work.length, 独立项目: master.sideProjects.length,
    科研经历: master.research.length, 发表论文: master.publications.length,
    教育经历: master.education.length, 技能: master.skills.length,
  };
  const categories = [
    ...LIBRARY_SECTIONS.map(key => ({ key: key as LibrarySection, name: master.categoryNames?.[key] || key, count: counts[key] })),
    ...(master.customCategories ?? []).map(category => ({ key: `custom:${category.id}` as LibrarySection, name: category.name || '未命名类别', count: category.items.length })),
  ];
  return archiveCategoryOrder(master).filter(key => !master.hiddenCategories?.includes(key)).map(key => categories.find(category => category.key === key)!);
}

export function ArchiveSidebar({ master, active, contentId, onSelect, onReorder }: {
  master: Master; active: LibrarySection | null; contentId: string;
  onSelect: (key: LibrarySection) => void;
  onReorder: (source: string, target: string, position: DropPosition) => void;
}) {
  const categories = archiveCategories(master);
  return <nav className="archive-book-index" aria-label="档案类别">
    {categories.map((category, index) => <div key={category.key} className="archive-index-item" data-category-key={category.key}>
      <ArchiveDragHandle id={category.key} label={category.name} kind="category" onReorder={onReorder} />
      <button type="button" className="archive-index-tab"
      data-archive-section={category.key} aria-current={active === category.key ? 'true' : undefined} aria-controls={contentId}
      onClick={() => onSelect(category.key)} onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + categories.length) % categories.length;
        onSelect(categories[next].key);
        const button = event.currentTarget.closest('nav')?.querySelectorAll<HTMLButtonElement>('[data-archive-section]')[next];
        button?.focus({ preventScroll: true }); button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }}>
      <span className="archive-index-icon" aria-hidden="true"><LibrarySectionIcon title={category.key} size={16} /></span>
      <span className="archive-index-name">{category.name}</span>
      {category.key !== '基本信息' && <span className="archive-index-count">{category.count}</span>}
    </button></div>)}
  </nav>;
}
