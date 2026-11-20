/** Keep one active item, plus its parent when editing a company's project. */
export function updateEditorDisclosure(path: string[], id: string, open: boolean, parent?: string): string[] {
  const index = path.indexOf(id);
  if (open) return index >= 0 ? path : parent ? [parent, id] : [id];
  return index < 0 ? path : path.slice(0, index);
}

export interface EditorSelection { path: string[]; activeId: string | undefined }

/** Expansion changes select the newly opened leaf; focus can select its open parent. */
export function syncEditorSelection(state: EditorSelection, path: string[]): EditorSelection {
  return path === state.path ? state : { path, activeId: path.at(-1) };
}

export function focusEditorItem(state: EditorSelection, id: string): EditorSelection {
  return state.activeId === id || !state.path.includes(id) ? state : { ...state, activeId: id };
}
