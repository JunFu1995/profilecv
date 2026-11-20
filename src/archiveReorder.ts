import type { Master } from './types';

export type DropPosition = 'before' | 'after';

export function reorderItems<T extends { id: string }>(items: T[], source: string, target: string, position: DropPosition): T[] {
  const from = items.findIndex(item => item.id === source);
  const to = items.findIndex(item => item.id === target);
  if (from < 0 || to < 0 || from === to) return items;
  const next = items.filter(item => item.id !== source);
  const index = next.findIndex(item => item.id === target) + (position === 'after' ? 1 : 0);
  next.splice(index, 0, items[from]);
  return next.every((item, i) => item === items[i]) ? items : next;
}

/** Only reorder within one category or one company's project list. */
export function reorderArchiveMaterial(master: Master, source: string, target: string, position: DropPosition): Master {
  for (const key of ['work', 'sideProjects', 'research', 'education', 'publications', 'skills'] as const) {
    const items = master[key];
    const next = reorderItems<{ id: string }>(items, source, target, position);
    if (next !== items) return { ...master, [key]: next };
  }
  for (const key of ['work', 'research'] as const) {
    for (const entry of master[key]) {
      const projects = reorderItems(entry.projects, source, target, position);
      if (projects !== entry.projects) return { ...master, [key]: master[key].map(item => item.id === entry.id ? { ...item, projects } : item) };
    }
  }
  return master;
}
