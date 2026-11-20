import { useMemo, useState } from 'react';
import type { ResumeView, Variant } from '../types';
import { flattenView, lintView } from '../lint';
import { analyzeJd } from '../keywords';

const advice:Record<string,string>={
 'no-metric':'核对是否有真实的效果、交付物或验证结论。没有可靠数字时，用具体结果说明，不必强行量化。',
 'weak-verb':'补充你实际做了什么、如何完成。保留参与或协助的真实职责，不必改成主导。',
 'too-long':'优先保留行动、关键方法和结果，删去重复背景，结合预览判断是否需要拆分。',
 'dup-verb':'检查相邻要点是否重复表达；确有不同贡献时，可用更具体的行动描述。',
};
export function CheckDrawer({view,variant,onLocate,onRewrite,onEditJd,onClose,embedded=false}:{
 view:ResumeView;variant:Variant|null;onLocate:(id:string)=>void;onRewrite:(id:string)=>void;onEditJd:()=>void;onClose:()=>void;embedded?:boolean;
}){
 const [tab,setTab]=useState<'content'|'job'>('content');
 const [filter,setFilter]=useState('all');
 const [folded,setFolded]=useState<Set<string>>(new Set());
 const lint=useMemo(()=>lintView(view),[view]);
 const jd=variant?.jobTarget.jdText.trim()??'';
 const match=useMemo(()=>analyzeJd(jd,flattenView(view)),[jd,view]);
 const issues=lint.issues.filter(issue=>filter==='all'||issue.rules.some(r=>r.code===filter));
 const projects=view.projects.filter(p=>lint.projectsWithoutResult.includes(p.name));
 return <aside className={`drawer no-print${embedded?' drawer-embedded':''}`} aria-label="检查">
  <header className="drawer-head"><div><h2>投递前检查</h2><p className="drawer-sub-title">{variant?.name} · 修改后自动更新</p></div><button className="btn" onClick={onClose}>返回编辑</button></header>
  <div className="check-tabs" role="group" aria-label="检查类型"><button className={`btn${tab==='content'?' selected':''}`} aria-pressed={tab==='content'} onClick={()=>setTab('content')}>内容检查 ({lint.issues.length})</button><button className={`btn${tab==='job'?' selected':''}`} aria-pressed={tab==='job'} onClick={()=>setTab('job')}>岗位关键词</button></div>
  <div className="drawer-body">
   {tab==='content'?<>
    <div className="check-overview"><strong>{lint.issues.length?`${lint.issues.length} 条要点可进一步核对`:'暂未发现规则可识别的要点问题'}</strong><p>已检查 {lint.total} 条要点。以下是表达建议，不代表经历不合格，也不能验证事实真伪。</p></div>
    <div className="check-filters" role="group" aria-label="建议筛选">{[['all','全部'],['no-metric','成果证据'],['weak-verb','行动描述'],['too-long','篇幅'],['dup-verb','重复表达']].map(([code,label])=><button className={`btn small${filter===code?' selected':''}`} aria-pressed={filter===code} key={code} onClick={()=>setFilter(code)}>{label} ({code==='all'?lint.issues.length:lint.byRule[code]??0})</button>)}</div>
    {!issues.length&&<p className="vempty">此分类暂无待核对项。</p>}
    {issues.map(issue=><article className="check-issue" key={issue.key}><div className="issue-meta"><strong>{issue.groupLabel}</strong></div><button className="link-btn check-fold" onClick={()=>setFolded(prev=>{const next=new Set(prev);const key=issue.key+issue.text;if(next.has(key))next.delete(key);else next.add(key);return next;})}>{folded.has(issue.key+issue.text)?'展开建议':'暂时收起'}</button><div hidden={folded.has(issue.key+issue.text)}><blockquote>{issue.text}</blockquote><div className="chips">{issue.rules.map(rule=><span className="chip" key={rule.code}>{rule.label}</span>)}</div><ul className="check-advice">{issue.rules.filter(r=>filter==='all'||r.code===filter).map(rule=><li key={rule.code}>{advice[rule.code]}</li>)}</ul><div className="check-actions"><button className="btn small" onClick={()=>onLocate(issue.composed ? issue.groupId : issue.bulletId)}>定位编辑</button>{!issue.composed&&<button className="btn small" onClick={()=>onRewrite(issue.bulletId)}>改写这条</button>}</div></div></article>)}
    {projects.length>0&&<details className="check-projects"><summary>{projects.length} 个项目尚未单独填写结果</summary><p className="drawer-note">若成果已写在其他要点中，无需重复添加。</p>{projects.map(p=><div className="check-project-row" key={p.id}><span>{p.name}</span><button className="btn small" onClick={()=>onLocate(p.id)}>查看项目</button></div>)}</details>}
   </>:<>
    <div className="check-overview"><strong>对照岗位要求，检查表达是否完整</strong><p>关键词未出现不代表经历不相关；仅在有真实经验支撑时补充。此处不是 ATS 分数。</p></div>
    {!jd?<div className="check-empty"><p>当前版本尚未填写岗位描述。</p><button className="btn" onClick={onEditJd}>填写 JD</button></div>:<>
     <p className="check-keyword-count">识别 {match.total} 个关键词 · 已提及 {match.matched} 个 · 待核对 {match.missing.length} 个</p>
     {!match.total?<p className="vempty">暂未识别到关键词，可补充更完整的岗位要求。</p>:<section className="drawer-sec"><h3>尚未提及</h3><div className="chips">{match.missing.map(k=><span className="chip" key={k.term}>{k.display}</span>)}</div>{!match.missing.length&&<p>已提及识别到的全部关键词。</p>}<p className="drawer-note">先确认自己是否具备相关经历，再通过对应章节的「补充」加入素材，或调整现有表达。</p><button className="btn small" onClick={onClose}>返回内容整理</button><details className="check-projects"><summary>已提及的关键词 ({match.present.length})</summary><div className="chips">{match.present.map(k=><span className="chip" key={k.term}>{k.display}</span>)}</div></details></section>}
     <details className="check-projects"><summary>查看本版 JD</summary><p className="check-jd">{jd}</p><button className="btn small" onClick={onEditJd}>编辑 JD</button></details>
    </>}
   </>}
  </div>
 </aside>;
}
