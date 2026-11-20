import type { Master, Project, WorkEntry, Publication } from '../types';
import { uid } from '../id';

export interface ParsedProject {
  name: string; role: string; start: string; end: string; stack: string; summary: string;
  situation: string; task: string; actions: string[]; results: string[];
}
export interface ParsedWork {
  company: string; role: string; start: string; end: string; location: string; detail: string;
  summary: string; bullets: string[]; projects: ParsedProject[];
  star: {situation:string;task:string;action:string;result:string};
}
export type ParsedPublication = Omit<Publication, 'id'>;
export interface ParsedResume {
  basics: {name:string;title:string;email:string;phone:string;city:string;summary:string;links:{label:string;url:string}[]};
  work: ParsedWork[]; research: ParsedWork[]; publications: ParsedPublication[];
  sideProjects: ParsedProject[];
  education: {org:string;role:string;degree:string;start:string;end:string;location:string;detail:string;bullets:string[]}[];
  skills: {label:string;value:string}[];
  unassigned: string;
}
const str=(v:unknown):string=>typeof v==='string'?v.trim():'';
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'?v as Record<string,unknown>:{};
const list=(v:unknown)=>arr(v).map(str).filter(Boolean);
export function coerceProject(raw:unknown):ParsedProject {
  const p=obj(raw);
  return {name:str(p.name),role:str(p.role),start:str(p.start),end:str(p.end),stack:str(p.stack),summary:str(p.summary),
    situation:str(p.situation),task:str(p.task),actions:list(p.actions),results:list(p.results)};
}
export function coerceWork(raw:unknown):ParsedWork {
  const w=obj(raw),s=obj(w.star);
  return {company:str(w.company),role:str(w.role),start:str(w.start),end:str(w.end),location:str(w.location),detail:str(w.detail),
    summary:str(w.summary),bullets:list(w.bullets),projects:arr(w.projects).map(coerceProject),
    star:{situation:str(s.situation),task:str(s.task),action:str(s.action),result:str(s.result)}};
}
export function coercePublication(raw:unknown):ParsedPublication {
  const p=obj(raw);
  return {title:str(p.title),authors:str(p.authors),highlight:str(p.highlight),venue:str(p.venue),venueShort:str(p.venueShort),level:str(p.level),
    year:str(p.year),volume:str(p.volume),issue:str(p.issue),pages:str(p.pages),doi:str(p.doi),note:str(p.note),abstract:str(p.abstract),
    status:['published','accepted','review','preprint'].includes(str(p.status))?p.status as Publication['status']:'unknown',
    selfPosition:['first','co-first','corresponding'].includes(str(p.selfPosition))?p.selfPosition as Publication['selfPosition']:'other'};
}
/** Normalize extraction only; missing facts remain empty and the draft is never persisted here. */
export function coerceParsed(raw:unknown):ParsedResume {
  const r=obj(raw),b=obj(r.basics);
  return {basics:{name:str(b.name),title:str(b.title),email:str(b.email),phone:str(b.phone),city:str(b.city),summary:str(b.summary),
    links:arr(b.links).map(l=>({label:str(obj(l).label),url:str(obj(l).url)})).filter(l=>l.label||l.url)},
    work:arr(r.work).map(coerceWork),research:arr(r.research).map(coerceWork),publications:arr(r.publications).map(coercePublication),
    sideProjects:arr(r.sideProjects).map(coerceProject),
    education:arr(r.education).map(e=>{const o=obj(e);return {org:str(o.org),role:str(o.role),degree:str(o.degree),start:str(o.start),end:str(o.end),location:str(o.location),detail:str(o.detail),bullets:list(o.bullets)};}),
    skills:arr(r.skills).map(s=>({label:str(obj(s).label),value:str(obj(s).value)})).filter(s=>s.label||s.value),unassigned:str(r.unassigned)};
}
function toProject(p:ParsedProject):Project {
  return {...p,id:uid(),display:'summary',actions:p.actions.map(text=>({id:uid(),text})),results:p.results.map(text=>({id:uid(),text})),
    ...(p.summary?{composed:{mode:'paragraph' as const,text:p.summary,bullets:[],sourceHash:''}}:{})};
}
export function toMaster(p:ParsedResume):Master {
  const work=(w:ParsedWork,research=false):WorkEntry=>({...w,id:uid(),projects:w.projects.map(toProject),bullets:w.bullets.map(text=>({id:uid(),text})),
    ...(research?{researchDisplay:'summary' as const,...(w.summary?{researchDraft:{mode:'paragraph' as const,text:w.summary,bullets:[],sourceHash:''}}:{})}:{})});
  return {basics:{...p.basics,links:p.basics.links.map(l=>({...l,id:uid()}))},work:p.work.map(w=>work(w)),research:p.research.map(w=>work(w,true)),
    publications:p.publications.map(p=>({...p,id:uid()})),sideProjects:p.sideProjects.map(toProject),
    education:p.education.map(e=>({...e,id:uid(),bullets:e.bullets.map(text=>({id:uid(),text}))})),skills:p.skills.map(s=>({...s,id:uid()})),
    ...(p.unassigned?{customCategories:[{id:uid(),name:'导入待整理',fields:[],items:[{id:uid(),title:'尚未归类的原文',body:p.unassigned,values:{}}]}]}:{})};
}

const HEADINGS: {key:'work'|'sideProjects'|'research'|'publications'|'education'|'skills'|'summary';re:RegExp}[]=[
  {key:'work',re:/^(工作经历|工作经验|职业经历|任职经历|工作履历|work\s*experience|employment)$/i},
  {key:'sideProjects',re:/^(独立项目(?:经历)?|项目经历|项目经验|主要项目|项目|projects?|selected\s*projects|personal\s*projects)$/i},
  {key:'research',re:/^(科研经历|研究经历|科研经验|学术经历|research(?:\s*experience)?)$/i},
  {key:'publications',re:/^(发表论文|学术论文|论文发表|论文|研究成果|publications?|selected\s*publications)$/i},
  {key:'education',re:/^(教育经历|教育背景|学历|education|academic\s*background)$/i},
  {key:'skills',re:/^(专业技能|技能|技术栈|skills|technical\s*skills)$/i},
  {key:'summary',re:/^(个人简介|个人总结|自我评价|职业概述|summary|profile)$/i},
];
const strip=(s:string)=>s.replace(/^[\s#•·*\-–—]+/,'').trim();
const range=/((?:19|20)\d{2}(?:\s*[./年-]\s*\d{1,2}月?)?)\s*(?:[-–—~至到]\s*((?:19|20)\d{2}(?:\s*[./年-]\s*\d{1,2}月?)?|至今|现在|Present|Current))/i;
function header(s:string){const m=s.match(range);return {title:(m?s.replace(m[0],''):s).replace(/^[\s|｜·]+|[\s|｜·]+$/g,''),start:m?.[1].replace(/\s/g,'')??'',end:m?.[2].replace(/\s/g,'')??''};}
const projectPrefix=/^(?:项目(?:名称)?|参与项目|负责项目|project(?:\s+name)?)\s*[：:]\s*/i;
function entries(lines:string[]):string[][] {
  const groups:string[][]=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i],h=header(line);
    if(!groups.length || (h.start&&h.title) || projectPrefix.test(line))groups.push([line]);
    else if(h.start&&!h.title){const prev=groups.at(-1)!;if(prev.length===1)prev[0]+=' '+line;else{const title=prev.pop()!;groups.push([title+' '+line]);}}
    else if(i+1<lines.length&&header(lines[i+1]).start&&!header(lines[i+1]).title)groups.push([line]);
    else groups.at(-1)!.push(line);
  }
  return groups;
}
/** Rule extraction keeps all unclassified text, and never invents STAR or publication metadata. */
export function heuristicParse(text:string):ParsedResume {
  const r=coerceParsed({}),lines=text.replace(/\r\n?/g,'\n').split('\n').map(strip).filter(Boolean);
  const buckets:Record<string,string[]>={head:[],work:[],sideProjects:[],research:[],publications:[],education:[],skills:[],summary:[]};
  let current='head';
  for(const line of lines){const heading=HEADINGS.find(h=>h.re.test(line.replace(/[：:]$/,'').replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g,'$1')));if(heading)current=heading.key;else buckets[current].push(line);}
  const head=buckets.head.join('\n');
  r.basics.email=head.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]??'';
  r.basics.phone=head.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}|0\d{2,3}[-\s]?\d{7,8}/)?.[0]??'';
  const simple=buckets.head.filter(l=>l.length>=2&&l.length<=24&&!/[\d@：:]/.test(l));
  r.basics.name=simple[0]??'';r.basics.title=simple[1]??'';r.basics.summary=buckets.summary.join('\n');
  r.unassigned=buckets.head.filter(l=>![r.basics.name,r.basics.title,r.basics.email,r.basics.phone].includes(l)).join('\n');
  const projectFromLines=([first,...rest]:string[]):ParsedProject=>{
    const h=header(first.replace(projectPrefix,''));
    const [name,role,...extra]=h.title.split(/\s*[|｜·]\s*/);
    const stack:string[]=[],body:string[]=[];
    for(const line of rest){const m=line.match(/^(?:技术栈|技术选型|tech(?:nology)?\s*stack)\s*[：:]\s*(.+)$/i);if(m)stack.push(m[1]);else body.push(line);}
    return coerceProject({name,role,start:h.start,end:h.end,stack:stack.join(' · '),summary:[...extra,...body].join('\n')});
  };
  for(const key of ['work','research'] as const){
    for(const group of entries(buckets[key])){
      if(projectPrefix.test(group[0])){
        const p=projectFromLines(group),owner=r[key].at(-1);
        if(owner)owner.projects.push(p);else r.sideProjects.push(p);
      }else{
        const [first,...rest]=group,h=header(first),[company,role,...extra]=h.title.split(/\s*[|｜·]\s*/);
        r[key].push(coerceWork({company,role,start:h.start,end:h.end,detail:extra.join(' · '),summary:rest.join('\n')}));
      }
    }
  }
  r.sideProjects.push(...entries(buckets.sideProjects).map(projectFromLines));
  r.education=entries(buckets.education).map(([first,...rest])=>{
    const h=header(first),[org,role,...extra]=h.title.split(/\s*[|｜·]\s*/);
    const degree=extra.find(s=>/^(?:博士|硕士|本科|学士|专科|大专|PhD|Ph\.D\.|Master|Bachelor)$/i.test(s))??'';
    return {org,role:role??'',degree,start:h.start,end:h.end,location:'',detail:[...extra.filter(s=>s!==degree),...rest].join('\n'),bullets:[]};
  });
  // Retain the full citation as the title for manual separation rather than guessing authors or status.
  const citations:string[]=[];
  for(const line of buckets.publications){if(/^\[?\d+[\].、)]\s*/.test(line)||!citations.length)citations.push(line);else citations[citations.length-1]+='\n'+line;}
  r.publications=citations.map(title=>coercePublication({title}));
  r.skills=buckets.skills.map(line=>{const m=line.match(/^([^:：]{1,20})[:：]\s*(.+)$/);return m?{label:m[1],value:m[2]}:{label:'',value:line};});
  return r;
}
