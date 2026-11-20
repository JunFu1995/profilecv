import type { Master } from './types';
import type { DropPosition } from './archiveReorder';

export const LIBRARY_SECTIONS = ['基本信息', '工作经历', '独立项目', '科研经历', '发表论文', '教育经历', '技能'] as const;
export type LibrarySection = typeof LIBRARY_SECTIONS[number] | `custom:${string}`;

/** Keep hidden categories in the saved order so restoring one retains its place. */
export function archiveCategoryOrder(master: Master): LibrarySection[] {
  const defaults: LibrarySection[] = [...LIBRARY_SECTIONS, ...(master.customCategories ?? []).map(category => `custom:${category.id}` as const)];
  const valid = new Set<string>(defaults);
  return [...new Set([...(master.categoryOrder ?? []).filter(key => valid.has(key)) as LibrarySection[], ...defaults])];
}

export function reorderArchiveCategory(master: Master, source: string, target: string, position: DropPosition): Master {
  const order = archiveCategoryOrder(master);
  if (source === target || !order.includes(source as LibrarySection) || !order.includes(target as LibrarySection)) return master;
  const next = order.filter(key => key !== source);
  next.splice(next.indexOf(target as LibrarySection) + (position === 'after' ? 1 : 0), 0, source as LibrarySection);
  return next.every((key, index) => key === order[index]) ? master : { ...master, categoryOrder: next };
}
