import { useEffect, useRef, useState } from 'react';
import type { Master } from '../types';
import { BASIC_FIELDS, type BasicField } from '../import/apply';
import { coerceParsed, coerceProject, coercePublication, coerceWork, type ParsedResume, type ParsedProject, type ParsedWork } from '../import/parse';
import { TrashIcon } from '@radix-ui/react-icons';

const basicLabels:Record<BasicField,string>={name:'姓名',title:'求职方向',email:'邮箱',phone:'电话',city:'城市',summary:'个人简介'};
type Spec = readonly [string,string,('text'|'long'|'lines')?];
function Fields({value,spec,onChange}:{value:object;spec:readonly Spec[];onChange:(key:string,value:string|string[])=>void}) {
 return <div className="import-field-grid">{spec.map(([key,label,type='text'])=>{const raw=(value as Record<string,unknown>)[key];const text=Array.isArray(raw)?raw.join('\n'):typeof raw==='string'?raw:'';return <label key={key} className={type==='text'?'field':'field import-wide'}><span>{label}</span>{type==='text'?<input value={text} onChange={e=>onChange(key,e.target.value)}/>:<textarea rows={type==='lines'?3:4} value={text} onChange={e=>onChange(key,type==='lines'?e.target.value.split('\n'):e.target.value)}/>}</label>;})}</div>;
}
function Card({title,children,onRemove,duplicate}:{title:string;children:React.ReactNode;onRemove:()=>void;duplicate?:boolean}){
 return <details className="import-edit-card" open><summary><strong>{title}</strong>{duplicate&&<span className="import-issue">可能重复，请核对</span>}</summary><div className="import-edit-card-body">{children}<button type="button" className="btn small import-remove" onClick={onRemove}><TrashIcon/>不导入此条</button></div></details>;
}
const projectSpec:Spec[]=[['name','项目名称'],['role','我的角色'],['start','开始时间'],['end','结束时间'],['stack','技术栈'],['summary','项目总结（原文）','long']];
const starSpec:Spec[]=[['situation','背景（S）','long'],['task','目标（T）','long'],['actions','行动（A），每行一条','lines'],['results','结果（R），每行一条','lines']];
const workSpec:Spec[]=[['company','公司 / 机构'],['role','职位 / 身份'],['start','开始时间'],['end','结束时间'],['location','城市'],['detail','补充信息'],['summary','经历正文 / 研究总结（原文）','long'],['bullets','其他原文条目，每行一条','lines']];
const pubSpec:Spec[]=[['title','论文标题','long'],['authors','作者'],['highlight','加粗作者'],['venue','期刊 / 会议'],['venueShort','期刊 / 会议简称'],['year','年份'],['volume','卷'],['issue','期'],['pages','页码'],['doi','DOI'],['level','论文等级（原文未注明则留空）'],['note','备注'],['abstract','摘要','long']];
const sections=[['basics','基本信息'],['work','工作经历'],['sideProjects','独立项目'],['research','科研经历'],['publications','发表论文'],['education','教育经历'],['skills','技能'],['unassigned','待整理原文']] as const;
type Section=typeof sections[number][0];
export function ImportReview({draft,onChange,existing,replaceBasics,onReplaceBasics,sourceText}:{draft:ParsedResume;onChange:(d:ParsedResume)=>void;existing:Master;replaceBasics:BasicField[];onReplaceBasics:(keys:BasicField[])=>void;sourceText:string}){
 const [section,setSection]=useState<Section>('basics');
 const editorRef=useRef<HTMLElement>(null);
 useEffect(()=>{const body=editorRef.current?.closest('.modal-body');if(body)body.scrollTop=0;},[section]);
 const set=(key:Section,value:unknown)=>onChange({...draft,[key]:value});
 const update=<T,>(items:T[],index:number,patch:Partial<T>)=>items.map((item,i)=>i===index?{...item,...patch}:item);
 const moveProject=(p:ParsedProject,from:string,index:number,to:string)=>{
  if(from===to)return;
  const next=structuredClone(draft);
  const group=(key:string)=>key==='sideProjects'?next.sideProjects:(()=>{const [kind,i]=key.split(':');return next[kind as 'work'|'research'][Number(i)].projects;})();
  group(from).splice(index,1);group(to).push(p);onChange(next);
 };
 const project=(p:ParsedProject,i:number,owner:string)=>{
  const items=owner==='sideProjects'?draft.sideProjects:(()=>{const [kind,j]=owner.split(':');return draft[kind as 'work'|'research'][Number(j)].projects;})();
  const change=(next:ParsedProject[])=>{if(owner==='sideProjects')set('sideProjects',next);else{const [kind,j]=owner.split(':');const key=kind as 'work'|'research';set(key,update(draft[key],Number(j),{projects:next}));}};
  const allExisting=[...existing.sideProjects,...existing.work.flatMap(w=>w.projects),...existing.research.flatMap(w=>w.projects)];
  return <Card key={i} title={p.name||`项目 ${i+1}`} duplicate={!!p.name&&allExisting.some(x=>x.name===p.name)} onRemove={()=>change(items.filter((_,j)=>j!==i))}>
   <label className="field"><span>项目归属</span><select value={owner} onChange={e=>moveProject(p,owner,i,e.target.value)}><option value="sideProjects">独立项目</option>{(['work','research'] as const).flatMap(key=>draft[key].map((w,j)=><option key={`${key}:${j}`} value={`${key}:${j}`}>{key==='work'?'工作':'科研'} · {w.company||`经历 ${j+1}`}</option>))}</select></label>
   <Fields value={p} spec={projectSpec} onChange={(key,value)=>change(update(items,i,{[key]:value}))}/>
   <details className="import-star"><summary>原文中的 STAR（如有）</summary><Fields value={p} spec={starSpec} onChange={(key,value)=>change(update(items,i,{[key]:value}))}/></details>
  </Card>;
 };
 const work=(w:ParsedWork,i:number,key:'work'|'research')=><Card key={i} title={w.company||`经历 ${i+1}`} duplicate={!!w.company&&existing[key].some(x=>x.company===w.company&&x.start===w.start)} onRemove={()=>set(key,draft[key].filter((_,j)=>i!==j))}>
   <Fields value={w} spec={workSpec} onChange={(field,value)=>set(key,update(draft[key],i,{[field]:value}))}/>
   {!w.start&&<p className="import-issue">开始时间未填写，可核对原文后补充。</p>}
   {key==='research'&&<details className="import-star"><summary>原文中的研究 STAR（如有）</summary><Fields value={w.star} spec={starSpec.map(([k,l])=>[k==='actions'?'action':k==='results'?'result':k,l,'long'])} onChange={(field,value)=>set(key,update(draft[key],i,{star:{...w.star,[field]:value}}))}/></details>}
   <div className="import-subhead"><strong>关联项目 · {w.projects.length}</strong><button type="button" className="btn small" onClick={()=>set(key,update(draft[key],i,{projects:[...w.projects,coerceProject({})]}))}>添加项目</button></div>
   {w.projects.map((p,j)=>project(p,j,`${key}:${i}`))}
  </Card>;
 const empty=section!=='basics'&&section!=='unassigned'&&draft[section].length===0;
 return <>
  <details className="import-source"><summary>查看提取原文，核对遗漏或识别错误</summary><pre>{sourceText}</pre></details>
  <div className="import-review-layout"><nav aria-label="核对内容分类">{sections.map(([key,label])=><button type="button" key={key} aria-current={section===key?'page':undefined} onClick={()=>setSection(key)}>{label}<span>{key==='basics'?'':key==='unassigned'?(draft.unassigned?'待整理':''):draft[key].length}</span></button>)}</nav>
  <section ref={editorRef} className="import-review-editor" aria-label={sections.find(s=>s[0]===section)?.[1]}>
   <h3>{sections.find(s=>s[0]===section)?.[1]}</h3>
   {empty&&<p className="import-empty">未识别到此类内容。可查看原文并手动添加。</p>}
   {section==='basics'&&<><p className="field-hint">已有信息默认保留；空字段自动补充。勾选后才更新有冲突的字段。</p><Fields value={draft.basics} spec={BASIC_FIELDS.map(key=>[key,basicLabels[key],key==='summary'?'long':'text'])} onChange={(key,value)=>set('basics',{...draft.basics,[key]:value})}/>
    {BASIC_FIELDS.filter(key=>existing.basics[key].trim()&&draft.basics[key].trim()&&existing.basics[key]!==draft.basics[key]).map(key=><label className="import-conflict" key={key}><input type="checkbox" checked={replaceBasics.includes(key)} onChange={e=>onReplaceBasics(e.target.checked?[...replaceBasics,key]:replaceBasics.filter(k=>k!==key))}/><span>用导入内容更新{basicLabels[key]}<small>当前：{existing.basics[key]}</small></span></label>)}
    <h4>个人链接</h4>{draft.basics.links.map((l,i)=><Card key={i} title={l.label||`链接 ${i+1}`} onRemove={()=>set('basics',{...draft.basics,links:draft.basics.links.filter((_,j)=>j!==i)})}><Fields value={l} spec={[["label","名称"],["url","网址"]]} onChange={(key,value)=>set('basics',{...draft.basics,links:update(draft.basics.links,i,{[key]:value})})}/></Card>)}<button className="btn small" type="button" onClick={()=>set('basics',{...draft.basics,links:[...draft.basics.links,{label:'',url:''}]})}>添加链接</button></>}
   {(section==='work'||section==='research')&&<>{draft[section].map((w,i)=>work(w,i,section))}<button className="btn" type="button" onClick={()=>set(section,[...draft[section],coerceWork({})])}>添加{section==='work'?'工作':'科研'}经历</button></>}
   {section==='sideProjects'&&<>{draft.sideProjects.map((p,i)=>project(p,i,'sideProjects'))}<button className="btn" type="button" onClick={()=>set('sideProjects',[...draft.sideProjects,coerceProject({})])}>添加独立项目</button></>}
   {section==='publications'&&<><p className="field-hint">请核对作者、标题和期刊。规则解析保留完整引用供你拆分；未注明的发表状态和作者位次不会推断。</p>{draft.publications.map((p,i)=><Card key={i} title={p.title||`论文 ${i+1}`} duplicate={existing.publications.some(x=>(p.doi&&x.doi===p.doi)||(p.title&&x.title===p.title))} onRemove={()=>set('publications',draft.publications.filter((_,j)=>j!==i))}><Fields value={p} spec={pubSpec} onChange={(key,value)=>set('publications',update(draft.publications,i,{[key]:value}))}/><div className="import-field-grid"><label className="field"><span>发表状态</span><select value={p.status} onChange={e=>set('publications',update(draft.publications,i,{status:e.target.value as typeof p.status}))}>{[['unknown','未注明'],['published','已发表'],['accepted','已接收'],['review','在审'],['preprint','预印本']].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label className="field"><span>作者位次</span><select value={p.selfPosition} onChange={e=>set('publications',update(draft.publications,i,{selfPosition:e.target.value as typeof p.selfPosition}))}>{[['other','未注明 / 其他'],['first','第一作者'],['co-first','共同一作'],['corresponding','通讯作者']].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label></div></Card>)}<button className="btn" type="button" onClick={()=>set('publications',[...draft.publications,coercePublication({})])}>添加论文</button></>}
   {section==='education'&&<>{draft.education.map((e,i)=><Card key={i} title={e.org||`教育经历 ${i+1}`} onRemove={()=>set('education',draft.education.filter((_,j)=>j!==i))}><Fields value={e} spec={[["org","学校"],["role","专业"],["degree","学历"],["start","开始时间"],["end","结束时间"],["location","城市"],["detail","补充信息","long"],["bullets","其他原文条目，每行一条","lines"]]} onChange={(key,value)=>set('education',update(draft.education,i,{[key]:value}))}/></Card>)}<button className="btn" type="button" onClick={()=>set('education',[...draft.education,coerceParsed({education:[{}]}).education[0]])}>添加教育经历</button></>}
   {section==='skills'&&<>{draft.skills.map((s,i)=><Card key={i} title={s.label||`技能 ${i+1}`} onRemove={()=>set('skills',draft.skills.filter((_,j)=>j!==i))}><Fields value={s} spec={[["label","分类"],["value","技能内容","long"]]} onChange={(key,value)=>set('skills',update(draft.skills,i,{[key]:value}))}/></Card>)}<button className="btn" type="button" onClick={()=>set('skills',[...draft.skills,{label:'',value:''}])}>添加技能</button></>}
   {section==='unassigned'&&<><p className="field-hint">尚未归类的文字会作为“导入待整理”素材保存。可把内容复制到对应分类，再从这里移除。</p><label className="field"><span>待整理原文</span><textarea rows={14} value={draft.unassigned} onChange={e=>set('unassigned',e.target.value)}/></label></>}
  </section></div>
 </>;
}
