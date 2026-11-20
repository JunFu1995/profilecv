import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent, type Dispatch, type SetStateAction } from 'react';

import { prepareDisclosureScroll } from './disclosureScroll';
import { updateEditorDisclosure } from './editorDisclosure';

export const EditorItemDisclosureContext = createContext<{ path: string[]; activeId?: string; setActiveId?: (id: string) => void; setPath: Dispatch<SetStateAction<string[]>> } | null>(null);

export const MaterialDisclosureContext = createContext<{ remembered: Map<string, boolean>; collapsed: boolean } | null>(null);
export type ExclusiveMaterialGroups = Record<string, string | undefined>;
export const ExclusiveMaterialDisclosureContext = createContext<{
  groups: ExclusiveMaterialGroups;
  setGroups: Dispatch<SetStateAction<ExclusiveMaterialGroups>>;
} | null>(null);
const libraryRemembered = new Map<string, boolean>();

/** 新增条目还未挂载，先记录展开状态，避免依赖定位回调的注册时序。 */
export function expandNewLibraryMaterial(id: string) {
  libraryRemembered.set(id, true);
}

/** 批量展开按 DOM 范围生效，兼容经历内的子项目。 */
export function useMaterialDisclosure(id: string, initiallyOpen: boolean, group?: string) {
  const context = useContext(MaterialDisclosureContext);
  const itemContext = useContext(EditorItemDisclosureContext);
  const editorItem = id.startsWith('section-') ? null : itemContext;
  const exclusive = useContext(ExclusiveMaterialDisclosureContext);
  const exclusiveGroup = exclusive && group ? group : undefined;
  const remembered = context?.remembered ?? libraryRemembered;
  const [localOpen, updateOpen] = useState(() => remembered.get(id) ?? (context?.collapsed ? false : initiallyOpen));
  const open = editorItem ? editorItem.path.includes(id) : exclusiveGroup ? exclusive!.groups[exclusiveGroup] === id : localOpen;
  const pendingScroll = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const restore = pendingScroll.current;
    pendingScroll.current = null;
    restore?.();
  }, [open]);
  const setOpen = (value: SetStateAction<boolean>, trigger?: HTMLElement) => {
    const nextOpen = typeof value === 'function' ? value(open) : value;
    if (trigger && nextOpen !== open) {
      const parent = group?.startsWith('projects:') ? group.slice(9) : undefined;
      const switching = nextOpen && (editorItem
        ? editorItem.path.some(item => item !== id && item !== parent)
        : !!(exclusiveGroup && exclusive?.groups[exclusiveGroup] && exclusive.groups[exclusiveGroup] !== id));
      pendingScroll.current = prepareDisclosureScroll(trigger, switching);
    }
    if (editorItem) {
      editorItem.setPath(path => updateEditorDisclosure(path, id, typeof value === 'function' ? value(path.includes(id)) : value, group?.startsWith('projects:') ? group.slice(9) : undefined));
      return;
    }
    if (exclusiveGroup && exclusive) {
      exclusive.setGroups(previous => {
        const wasOpen = previous[exclusiveGroup] === id;
        const next = typeof value === 'function' ? value(wasOpen) : value;
        if (!next && !wasOpen) return previous;
        return { ...previous, [exclusiveGroup]: next ? id : undefined };
      });
      return;
    }
    updateOpen(previous => {
      const next = typeof value === 'function' ? value(previous) : value;
      remembered.set(id, next);
      return next;
    });
  };
  useEffect(() => {
    const handle = (event: Event) => {
      const scope = event.target;
      const card = document.querySelector(`.editor [data-locate="${CSS.escape(id)}"]`);
      if (scope instanceof HTMLElement && card && scope.contains(card)) {
        const expanded = (event as CustomEvent<boolean>).detail;
        if ((!exclusiveGroup && !editorItem) || !expanded) setOpen(expanded);
      }
    };
    const card = document.querySelector(`.editor [data-locate="${CSS.escape(id)}"]`);
    const section = card?.closest<HTMLElement>('[data-material-expanded]');
    if (!exclusiveGroup && !editorItem && !remembered.has(id) && section) setOpen(section.dataset.materialExpanded === 'true');
    document.addEventListener('material-disclosure', handle);
    return () => document.removeEventListener('material-disclosure', handle);
  }, [id, exclusiveGroup]);
  const activate = (event: SyntheticEvent<HTMLElement>) => {
    // A nested project's event also bubbles through its company; only the nearest item owns it.
    if (open && event.target instanceof Element && event.target.closest('[data-editor-item]') === event.currentTarget) {
      editorItem?.setActiveId?.(id);
    }
  };
  const itemProps = editorItem ? {
    'data-editor-item': id,
    'data-editor-state': open ? ((editorItem.activeId ?? editorItem.path.at(-1)) === id ? 'active' : 'expanded') : 'collapsed',
    onFocusCapture: activate,
    onPointerDownCapture: activate,
  } : {};
  return [open, setOpen, itemProps] as const;
}

export function setMaterialDisclosure(scope: HTMLElement | null, open: boolean) {
  if (scope) {
    scope.dataset.materialExpanded = String(open);
    // 尚未挂载的子项目也记录状态，展开经历时将按此状态初始化。
    const ids = scope.dataset.materialIds?.split(' ') ?? [];
    for (const id of ids) libraryRemembered.set(id, open);
  }
  scope?.dispatchEvent(new CustomEvent('material-disclosure', { bubbles: true, detail: open }));
}
