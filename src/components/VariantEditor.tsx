import { syncEditorSelection, focusEditorItem, type EditorSelection } from '../editorDisclosure';
import {VariantCustomMaterials} from './VariantCustomMaterials';
import { SupplementDialog } from './SupplementDialog';
import { useMemo, useState } from 'react';
import { EditorItemDisclosureContext, MaterialDisclosureContext } from '../useMaterialDisclosure';
import type { Master, Variant } from '../types';
import { editableVariantContent, updateVariantContent, supplementSource, SECTION_KEYS, sectionGroups } from '../variants';
import { applyVariantSupplement } from '../supplement';
import { Editor, MaterialRewriteContext, MaterialImportContext } from './Editor';

export function VariantEditor({ master, variant, onChange, onRewrite, onOpenMaster }: {
  master: Master;
  variant: Variant;
  onChange: (v: Variant) => void;
  onOpenMaster?: (category: string) => void;
  onRewrite: (bulletId: string) => void;
}) {
  const [selection, setSelection] = useState<EditorSelection>({path: [], activeId: undefined});
  const [supplement, setSupplement] = useState<string | null>(null);
  const disclosure = useMemo(() => ({ remembered: new Map<string, boolean>(), collapsed: true }), [variant.id]);
  return <EditorItemDisclosureContext.Provider value={{path: selection.path, activeId: selection.activeId, setActiveId: id => setSelection(previous => focusEditorItem(previous, id)), setPath: value => setSelection(previous => syncEditorSelection(previous, typeof value === 'function' ? value(previous.path) : value))}}><MaterialDisclosureContext.Provider value={disclosure}><div className="variant-full-editor">

    <MaterialImportContext.Provider value={id=>{
      if(id?.startsWith('projects:')){setSupplement(id);return;}
      const content=editableVariantContent(master,variant);
      for(const section of SECTION_KEYS)for(const group of sectionGroups(content,section))if(group.id===id||group.bullets.some(b=>b.id===id)){setSupplement(`${section}:${group.id}`);return;}
      setSupplement('all');
    }}><MaterialRewriteContext.Provider value={onRewrite}><Editor onSupplement={setSupplement} master={editableVariantContent(master, variant)} onChange={content => onChange(updateVariantContent(variant, content))} /></MaterialRewriteContext.Provider></MaterialImportContext.Provider>
    <VariantCustomMaterials categories={editableVariantContent(master,variant).customCategories??[]} onSupplement={setSupplement} onChange={categories=>{
      const content=editableVariantContent(master,variant);
      onChange(updateVariantContent(variant,{...content,customCategories:categories}));
    }}/>
    {supplement !== null && <SupplementDialog master={supplementSource(master, variant)} variant={variant} initialCategory={supplement.startsWith('projects:') ? 'projects' : supplement} targetWorkId={supplement.startsWith('projects:') ? supplement.slice('projects:'.length) : undefined} onClose={() => setSupplement(null)} onOpenMaster={onOpenMaster ? () => { const category=supplement.startsWith('projects:') ? 'work' : supplement.startsWith('custom:')?supplement:supplement.split(':')[0]; setSupplement(null); onOpenMaster(category); } : undefined} onApply={(next, projectIds) => {
      const target = supplement.startsWith('projects:') ? {kind:'work' as const,workId:supplement.slice('projects:'.length)} : supplement === 'projects' ? {kind:'independent' as const} : undefined;
      onChange(applyVariantSupplement(master,variant,next,projectIds,target));
      setSupplement(null);
    }} />}
  </div></MaterialDisclosureContext.Provider></EditorItemDisclosureContext.Provider>;
}
