import type { Master } from './types';
/** 清空回收站；内置类别清空内容后可重新使用，自定义类别彻底移除。 */
export function emptyMaterialTrash(master:Master):Master {
 const hidden=new Set(master.hiddenCategories??[]);
 const next:Master={...master,trashItems:[],hiddenCategories:[],categoryNames:Object.fromEntries(Object.entries(master.categoryNames??{}).filter(([key])=>!hidden.has(key))),customCategories:(master.customCategories??[]).filter(c=>!hidden.has(`custom:${c.id}`))};
 const keys={'工作经历':'work','独立项目':'sideProjects','科研经历':'research','发表论文':'publications','教育经历':'education','技能':'skills'} as const;
 for(const [label,key] of Object.entries(keys))if(hidden.has(label))next[key]=[];
 if(hidden.has('基本信息'))next.basics={name:'',title:'',phone:'',email:'',city:'',links:[],summary:''};
 return next;
}
