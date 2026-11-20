import { useState } from 'react';
import { DotsHorizontalIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { ActionMenu } from './ActionMenu';
export function CategoryName({name,onSave,onDelete,headerActions,editable=true}:{name:string;onSave:(name:string)=>void;onDelete?:()=>void;headerActions?:React.ReactNode;editable?:boolean}) {
 const [editing,setEditing]=useState(false);const [value,setValue]=useState(name);
 if(editing)return <form className="category-name-editor" onSubmit={e=>{e.preventDefault();if(!value.trim())return;onSave(value.trim());setEditing(false);}}><input autoFocus aria-label="类别名称" value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setEditing(false);}}}/><button className="btn" type="submit" disabled={!value.trim()}>保存</button><button className="btn" type="button" onClick={()=>setEditing(false)}>取消</button></form>;
 return <div className="category-name-display">
   <h2>{name}</h2>
   <div className="category-heading-actions">
     {headerActions}
     {editable && <ActionMenu label={`${name}类别操作`} icon={<DotsHorizontalIcon width={18} height={18} />}>
       <button className="category-menu-item" type="button" aria-label={`修改${name}类别名称`} onClick={()=>{setValue(name);setEditing(true);}}><Pencil1Icon aria-hidden="true"/>重命名类别</button>
       {onDelete&&<button className="category-menu-item danger" type="button" aria-label={`删除${name}类别`} onClick={onDelete}><TrashIcon aria-hidden="true"/>删除类别</button>}
     </ActionMenu>}
   </div>
 </div>;
}
