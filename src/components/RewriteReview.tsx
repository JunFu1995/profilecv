import { factWarnings, textDiff } from '../rewriteReview';
export function RewriteReview({original,text}:{original:string;text:string}) {
 const changes=textDiff(original,text);const warnings=factWarnings(original,text);
 return <div className="rewrite-review"><details><summary>与素材原文对照 · <span>新增</span> / 删除</summary><p className="rewrite-diff">{changes.map((c,i)=>c.type==='added'?<ins key={i}>{c.text}</ins>:c.type==='removed'?<del key={i}>{c.text}</del>:<span key={i}>{c.text}</span>)}</p></details>
 {warnings.length>0&&<div className="rewrite-facts"><strong>应用前请核实</strong><ul>{warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
 <p className="ai-note">规则提示仅辅助核对，不能证明事实正确；请重点确认数字、职责和个人贡献。</p></div>;
}
