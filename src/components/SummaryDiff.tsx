import { useMemo } from 'react';
import { diffSummary, summaryFactChanges } from '../summaryDiff';

export function SummaryDiff({original,candidate}:{original:string;candidate:string}){
 const parts=useMemo(()=>diffSummary(original,candidate),[original,candidate]);
 const facts=useMemo(()=>summaryFactChanges(original,candidate),[original,candidate]);
 const changed=parts.some(p=>p.kind!=='same');
 const rows=[{label:'数字',...facts.numbers},{label:'技术与研究术语',...facts.terms}];
 const factChanged=rows.some(row=>row.added.length||row.removed.length);
 return <details className="summary-diff" open>
  <summary>原文对比 <span>{changed?'删除线为移除，绿色下划线为新增':'与原文一致'}</span></summary>
  {changed&&<div className="summary-diff-columns">
   <section aria-label="改写前原文"><h3>改写前</h3><p>{parts.filter(p=>p.kind!=='added').map((p,i)=>p.kind==='removed'?<del key={i}>{p.text}</del>:<span key={i}>{p.text}</span>)}</p></section>
   <section aria-label="待应用正文"><h3>待应用 · 含手动修改</h3><p>{parts.filter(p=>p.kind!=='removed').map((p,i)=>p.kind==='added'?<ins key={i}>{p.text}</ins>:<span key={i}>{p.text}</span>)}</p></section>
  </div>}
  <div className="summary-facts" aria-label="数字与术语变化">
   <strong>事实核对</strong>
   {factChanged?rows.map(row=>(row.added.length||row.removed.length)>0&&<div className="summary-fact-row" key={row.label}><span>{row.label}</span><div>
    {row.removed.length>0&&<p><b>− 移除</b>{row.removed.map(text=><span className="fact-token removed" key={text}>{text}</span>)}</p>}
    {row.added.length>0&&<p><b>＋ 新增</b>{row.added.map(text=><span className="fact-token added" key={text}>{text}</span>)}</p>}
   </div></div>):<p className="field-hint">未检测到数字或已识别术语的增删。</p>}
   <p className="field-hint">自动识别仅辅助核对，不判断事实真伪；单位换算、专业词汇和成果归属仍需人工确认。</p>
  </div>
 </details>;
}
