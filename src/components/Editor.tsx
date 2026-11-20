import { restoreMaterialItem } from '../materialItemsTrash';
import { emptyMaterialTrash } from '../materialTrash';
import { CustomMaterials } from './CustomMaterials';
import { ArchiveReorderContext } from './ArchiveDragHandle';
import { reorderArchiveCategory } from '../archiveCategoryOrder';
import { reorderArchiveMaterial } from '../archiveReorder';
import { ArchiveSidebar, archiveCategories } from './ArchiveSidebar';
import { TrashIcon } from '@radix-ui/react-icons';
import { LibrarySectionContext, type LibrarySection } from './LibraryNav';
import { MaterialDisclosureContext, ExclusiveMaterialDisclosureContext, type ExclusiveMaterialGroups, expandNewLibraryMaterial } from '../useMaterialDisclosure';
import { useContext, useId, useRef, useState } from 'react';
import type { Master } from '../types';

export { MaterialImportContext, MaterialRewriteContext } from './editor/contexts';
import { useEditorActions } from './editor/useEditorActions';
import { BasicsSection } from './editor/BasicsSection';
import { WorkSection } from './editor/WorkSection';
import { ProjectsSection } from './editor/ProjectsSection';
import { ResearchSection } from './editor/ResearchSection';
import { PublicationsSection, PublicationImport } from './editor/PublicationsSection';
import { EducationSection } from './editor/EducationSection';
import { SkillsSection } from './editor/SkillsSection';

type ArchiveSaveStatus = 'idle' | 'saved' | 'failed' | 'paused';

function ArchiveEditorPane({ enabled, hidden, id, label, children }: {
  enabled: boolean; hidden: boolean; id: string; label: string; children: React.ReactNode;
}) {
  return enabled ? <div id={id} className="archive-inline-editor" hidden={hidden} role="region" aria-label={label}>{children}</div> : <>{children}</>;
}

export function Editor({ master, onChange, onSupplement, activeSection: requestedSection, onSelectSection, saveStatus, trashOpen = false, onTrashOpenChange, onCreateCategory, archiveTools }: { master: Master; onChange: (m: Master) => void; onSupplement?: (category: string) => void; activeSection?: LibrarySection | null; onSelectSection?: (section: LibrarySection | null) => void; saveStatus?: ArchiveSaveStatus; trashOpen?: boolean; onTrashOpenChange?: (open: boolean) => void; onCreateCategory?: () => void; archiveTools?: React.ReactNode }) {
  const isVariant = !!useContext(MaterialDisclosureContext);
  const [paperImport, setPaperImport] = useState(false);
  const setTrashOpen = (open: boolean) => onTrashOpenChange?.(open);
  const [expandedGroups, setExpandedGroups] = useState<ExclusiveMaterialGroups>({});
  const expandNewExperience = (id: string, group: string) => {
    if (requestedSection !== undefined) setExpandedGroups(previous => ({ ...previous, [group]: id }));
    else expandNewLibraryMaterial(id);
  };
  const contentId = useId();
  const categories = archiveCategories(master);
  const activeSection = requestedSection === undefined ? undefined : categories.find(category => category.key === requestedSection)?.key ?? categories[0]?.key ?? null;
  const activeName = categories.find(category => category.key === activeSection)?.name ?? '档案';
  const editorRef = useRef<HTMLDivElement>(null);
  const openSection = (section: LibrarySection) => {
    setTrashOpen(false); onSelectSection?.(section);
  };
  const showOverview = () => {
    editorRef.current?.querySelectorAll<HTMLElement>(':popover-open').forEach(popover => popover.hidePopover());
    editorRef.current?.querySelectorAll('.action-menu[open]').forEach(menu => menu.removeAttribute('open'));
    setTrashOpen(false); onSelectSection?.(null);
    requestAnimationFrame(() => {
      const card = editorRef.current?.querySelector<HTMLButtonElement>('[data-archive-section][aria-current="true"]');
      (card ?? editorRef.current?.closest('#work-content')?.querySelector<HTMLButtonElement>('.archive-trash-button'))?.focus({ preventScroll: true });
    });
  };
  const deleteCategory=(key:string)=>{
    set(m=>({...m,hiddenCategories:[...(m.hiddenCategories??[]),key]}));
    showOverview();
  };
  const actions = useEditorActions(master, onChange, expandNewExperience);
  const { set, setDeletions } = actions;
  const sectionProps = { master, actions, onSupplement, expandNewExperience, activeSection, isVariant };

  return (
    <ArchiveReorderContext.Provider value={activeSection !== undefined || isVariant ? (source, target, position) => set(master => reorderArchiveMaterial(master, source, target, position)) : null}><ExclusiveMaterialDisclosureContext.Provider value={activeSection !== undefined ? { groups: expandedGroups, setGroups: setExpandedGroups } : null}><LibrarySectionContext.Provider value={activeSection !== undefined && onSelectSection ? { active: activeSection, select: onSelectSection, names: master.categoryNames, remove:deleteCategory, rename:(key,name)=>set(m=>({...m,categoryNames:{...m.categoryNames,[key]:name}})) } : null}><div ref={editorRef} className="editor" data-archive-view={activeSection === undefined ? undefined : trashOpen ? 'trash' : 'inline'} data-trash-open={trashOpen} onClickCapture={event=>{
      if(onSupplement)return;
      const button=(event.target as HTMLElement).closest('button');
      if(!button||button.disabled||button.matches('[data-archive-section]'))return;
      const action=button.getAttribute('aria-label')||button.title||button.textContent||'';
      if(!/删除|移除/.test(action)||/还原|恢复|撤销/.test(action))return;
      const container=button.closest('.card, .pcard, .custom-material-item');
      const name=container?.querySelector('.experience-name, .card-title, .pcard-title, strong')?.textContent?.trim();
      const target=name?`「${name}」中的${action}`:action;
      if(!window.confirm(`确认${target}？`)||!window.confirm('再次确认：将所选素材移入回收站。若删除整个类别或经历，其下内容也会一并移入，之后可在回收站还原。')){event.preventDefault();event.stopPropagation();}
    }}>
      {activeSection !== undefined && onSelectSection && <aside className="archive-sidebar"><ArchiveSidebar master={master} active={trashOpen ? null : activeSection} contentId={contentId} onSelect={openSection} onReorder={(source, target, position) => { if (!trashOpen && activeSection) onSelectSection?.(activeSection); set(master => reorderArchiveCategory(master, source, target, position)); }} />{archiveTools}</aside>}
      {trashOpen&&<section className="category-trash-panel"><header className="section-head"><h2>回收站</h2><button className="btn trash-clear" disabled={!((master.hiddenCategories??[]).length+(master.trashItems??[]).length)} onClick={()=>{if(window.confirm('永久清除回收站中的所有素材？')&&window.confirm('再次确认：清空后无法还原。内置类别恢复为空类别，自定义类别彻底移除。')){set(emptyMaterialTrash);setDeletions([]);}}}>清空回收站</button><button className="btn" onClick={showOverview}>返回档案库</button></header><p className="section-hint">已删除的类别和素材可逐项还原；子条目需先还原所属经历或类别。</p>{!((master.hiddenCategories??[]).length+(master.trashItems??[]).length)&&<div className="library-empty"><TrashIcon width={24} height={24}/><strong>回收站为空</strong><p>删除的类别和素材会出现在这里。</p></div>}{(master.hiddenCategories??[]).map(key=>{const custom=key.startsWith('custom:')?master.customCategories?.find(c=>`custom:${c.id}`===key):null;const name=custom?.name||master.categoryNames?.[key]||key;return <div className="category-trash-row" key={key}><div><strong>{name}</strong><p>类别内容已保留</p></div><button className="btn" onClick={()=>set(m=>({...m,hiddenCategories:(m.hiddenCategories??[]).filter(k=>k!==key)}))}>还原</button></div>;})}{(master.trashItems??[]).map(item=><div className="category-trash-row" key={item.id}><div><strong>{item.label}</strong><p>素材条目 · {new Date(item.deletedAt).toLocaleString()}</p></div><button className="btn" onClick={()=>{const restored=restoreMaterialItem(master,item.id);if(restored)onChange(restored);else window.alert('请先还原所属经历或类别，再还原此条目。');}}>还原</button></div>)}</section>}
      <ArchiveEditorPane enabled={activeSection !== undefined} hidden={trashOpen} id={contentId} label={`编辑${activeName}`}>
      {activeSection !== undefined && (saveStatus === 'failed' || saveStatus === 'paused') && <p className="archive-inline-save-error" role="alert">{saveStatus === 'failed' ? '保存失败，请先备份内容' : '保存已暂停'}</p>}
      {activeSection === null && <div className="library-empty"><strong>暂无档案类别</strong><button type="button" className="btn" onClick={onCreateCategory}>新增类别</button></div>}
      {(master.customCategories??[]).filter(c=>activeSection===`custom:${c.id}`).map(c=><CustomMaterials key={c.id} category={c} onChange={next=>set(m=>({...m,customCategories:(m.customCategories??[]).map(x=>x.id===c.id?next:x)}))} onDelete={()=>{deleteCategory(`custom:${c.id}`);}}/>)}
      <BasicsSection {...sectionProps} />
      <WorkSection {...sectionProps} />
      <ProjectsSection {...sectionProps} />
      <ResearchSection {...sectionProps} />
      <PublicationsSection {...sectionProps} onImport={() => setPaperImport(true)} />
      <EducationSection {...sectionProps} />
      <SkillsSection {...sectionProps} />
      {paperImport && <PublicationImport master={master} actions={actions} onClose={() => setPaperImport(false)} />}
      </ArchiveEditorPane>
    </div></LibrarySectionContext.Provider></ExclusiveMaterialDisclosureContext.Provider></ArchiveReorderContext.Provider>
  );
}
