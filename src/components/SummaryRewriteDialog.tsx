import { rewriteSummary } from '../ai';
import { SummaryAiDialog } from './SummaryAiDialog';

export function SummaryRewriteDialog({original, subject, targetRole, onApply, onClose}: {
  original: string;
  subject: '项目总结' | '研究总结';
  targetRole: string;
  onApply: (text: string) => void;
  onClose: () => void;
}) {
  return <SummaryAiDialog intent="rewrite" title={`AI 改写 · ${subject}`}
    subtitle={`基于当前${subject}优化表达${targetRole ? ` · 目标岗位 ${targetRole}` : ''}`}
    sourceKey={original} sourceLabel={`查看当前${subject}`} source={<p>{original}</p>} checkSource={original}
    request={(style,config,signal)=>rewriteSummary({original,subject,targetRole,style,config,signal})}
    onApply={onApply} onClose={onClose}/>;
}
