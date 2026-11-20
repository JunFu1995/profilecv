import type { DropPosition } from './archiveReorder';
type Rect = { left: number; right: number; top: number; bottom: number };

/** Choose the closest card in visual grid order, including full-width expanded cards. */
export function gridDropTarget(rects: Rect[], point: { x: number; y: number }, containerWidth: number): { index: number; position: DropPosition } | null {
  if (!rects.length) return null;
  let index = 0, distance = Infinity;
  rects.forEach((rect, current) => {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    const next = dx * dx + dy * dy;
    if (next < distance) { distance = next; index = current; }
  });
  const rect = rects[index];
  const fullWidth = rect.right - rect.left > containerWidth * .9;
  const before = point.y < rect.top || (point.y <= rect.bottom && (fullWidth ? point.y < (rect.top + rect.bottom) / 2 : point.x < (rect.left + rect.right) / 2));
  return { index, position: before ? 'before' : 'after' };
}
