import { useEffect, useRef, useState } from 'react';
import { CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import type { CustomMaterialCategory, Master } from '../types';
import { CATEGORY_TEMPLATES, EXISTING_CATEGORY_TEMPLATES, availableCategoryName, createMaterialCategory, templatesFromCategories, type CategoryTemplate } from '../categoryTemplates';
import { LIBRARY_SECTIONS } from './LibraryNav';
import { useEscapeKey } from '../useEscapeKey';

export function CategoryCreateDialog({master,onCreate,onClose}:{master:Master;onCreate:(category:CustomMaterialCategory)=>void;onClose:()=>void}) {
  const names=[...LIBRARY_SECTIONS,...Object.values(master.categoryNames??{}),...(master.customCategories??[]).map(c=>c.name)];
  const [source,setSource]=useState<'common'|'existing'|'custom'>('common');
  const [template,setTemplate]=useState<CategoryTemplate|undefined>(CATEGORY_TEMPLATES[0]);
  const [name,setName]=useState(()=>availableCategoryName(CATEGORY_TEMPLATES[0].name,names));
  const [fields,setFields]=useState(CATEGORY_TEMPLATES[0].fields.join('、'));
  const [error,setError]=useState('');
  const dialogRef=useRef<HTMLDivElement>(null);
  const previousFocus=useRef(document.activeElement as HTMLElement|null);
  useEscapeKey(onClose);
  useEffect(()=>{
    const previous=previousFocus.current;
    dialogRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    return ()=>{if(previous?.isConnected)previous.focus();};
  },[]);
  const select=(next:CategoryTemplate|undefined)=>{
    setTemplate(next);setName(next?availableCategoryName(next.name,names):'');setFields(next?.fields.join('、')??'');setError('');
  };
  const existing=[...EXISTING_CATEGORY_TEMPLATES,...templatesFromCategories(master)];
  const parsedFields=fields.split(/[、,，\n]/).map(f=>f.trim()).filter(Boolean);
  return <div className="modal-mask category-template-mask" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div ref={dialogRef} className="modal category-template-dialog" role="dialog" aria-modal="true" aria-labelledby="category-create-title" onKeyDown={e=>{
      if(e.key!=='Tab')return;
      const nodes=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea')??[]);
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }}>
      <header className="modal-head"><div><h2 id="category-create-title">新增素材类别</h2><p>从模板开始，或按自己的经历设置字段。</p></div><button type="button" className="icon-btn" aria-label="关闭新增类别" onClick={onClose}><Cross2Icon/></button></header>
      <div className="modal-body">
        <div className="category-source-tabs" role="group" aria-label="类别创建方式">
          {([['common','常用模板'],['existing','已有类别结构'],['custom','完全自定义']] as const).map(([key,label])=><button autoFocus={key==='common'} type="button" key={key} aria-pressed={source===key} onClick={()=>{if(source===key)return;setSource(key);select(key==='common'?CATEGORY_TEMPLATES[0]:key==='existing'?existing[0]:undefined);}}>{label}</button>)}
        </div>
        {source==='common'&&<div className="category-template-grid" role="group" aria-label="常用类别模板">{CATEGORY_TEMPLATES.map(t=><button type="button" key={t.id} aria-pressed={template?.id===t.id} onClick={()=>{if(template?.id!==t.id)select(t);}}><span><strong>{t.name}</strong>{template?.id===t.id&&<CheckIcon/>}</span><small>{t.description}</small></button>)}</div>}
        {source==='existing'&&<div className="category-existing-source"><label className="field-block"><span className="field-label">参考类别</span><select value={template?.id} onChange={e=>select(existing.find(t=>t.id===e.target.value))}><optgroup label="内置类别">{EXISTING_CATEGORY_TEMPLATES.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</optgroup>{existing.length>EXISTING_CATEGORY_TEMPLATES.length&&<optgroup label="我的类别">{existing.slice(EXISTING_CATEGORY_TEMPLATES.length).map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</optgroup>}</select></label><p className="field-hint">仅复用字段，创建独立的素材类别。不复制内容，也不包含原类别的 STAR、AI 或论文检索功能。</p></div>}
        <form id="create-material-category" onSubmit={e=>{
          e.preventDefault();
          if(!name.trim()){setError('请填写类别名称');return;}
          if(names.some(n=>n.trim()===name.trim())){setError('已有同名类别，请换个名称；已删除的类别可到回收站还原。');return;}
          onCreate(createMaterialCategory(name,parsedFields,template));
        }}>
          <div className="category-template-preview">
            <label className="field-block"><span className="field-label">类别名称</span><input maxLength={40} value={name} onChange={e=>{setName(e.target.value);setError('');}} placeholder="例如：教学经历" aria-invalid={!!error} aria-describedby={error?'category-create-error':undefined}/></label>
            <label className="field-block"><span className="field-label">补充字段 <small>可调整，用顿号或逗号分隔</small></span><input value={fields} onChange={e=>setFields(e.target.value)} placeholder="例如：机构、担任角色、开始时间、结束时间"/></label>
            <div className="category-fields-preview" aria-label="创建后的字段"><span>{template?.titleLabel||'标题'}</span>{[...new Set(parsedFields)].map(f=><span key={f}>{f}</span>)}<span>{template?.bodyLabel||'正文'}</span></div>
            <p className="field-hint">{template?.bodyHint||'每条内容包含标题和正文；补充字段可留空，创建后仍可增删或改名。'}</p>
          </div>
          {error&&<p id="category-create-error" className="category-create-error" role="alert">{error}</p>}
        </form>
      </div>
      <footer className="category-create-footer"><p>创建后可在投递版本中选择内容，单独编辑。</p><div><button className="btn" type="button" onClick={onClose}>取消</button><button className="btn btn-primary" type="submit" form="create-material-category">创建类别</button></div></footer>
    </div>
  </div>;
}
