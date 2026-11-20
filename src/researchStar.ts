import { joinProse, normalizeProse } from './prose';
import type { WorkEntry } from './types';
export type ResearchStar = NonNullable<WorkEntry['star']>;
export function researchStar(work:WorkEntry):ResearchStar {
 const star=work.star;
 if(star&&work.summaryOnly)return star;
 // 旧概述或论文合成文本优先保留，不用过期 STAR 字段覆盖它。
 if(!star||(joinProse([star.situation,star.task,star.action,star.result])!==normalizeProse(work.summary??'').trim() && [star.situation,star.task,star.action,star.result].filter(x=>x.trim()).join('；')!==(work.summary??'')))return {situation:work.summary??'',task:'',action:'',result:''};
 return star;
}
export function updateResearchStar(work:WorkEntry,key:keyof ResearchStar,value:string):Pick<WorkEntry,'star'|'summary'> {
 const star={...researchStar(work),[key]:value};
 return {star,summary:joinProse([star.situation,star.task,star.action,star.result])};
}

export function researchRewriteSource(work:WorkEntry):string {
 const star=researchStar(work);
 const sections=[['背景（S）',star.situation],['目标（T）',star.task],['行动（A）',star.action],['结果（R）',star.result]].filter(([,text])=>text.trim());
 const summary=work.summary?.trim()||work.bullets.map(b=>b.text).filter(Boolean).join('\n');
 return [...sections.map(([label,text])=>`${label}：${text}`),...(summary?[`已有总结：${summary}`]:[])].join('\n\n');
}
