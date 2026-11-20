import { joinProse } from '../prose';
import { composeProject, starFingerprint } from '../ai';
import type { Composed, Project } from '../types';
import { SummaryAiDialog } from './SummaryAiDialog';

export function ComposeDialog({project, subject = '项目总结', targetRole, onApply, onClose}: {
  project: Project;
  subject?: string;
  targetRole: string;
  onApply: (composed: Composed) => void;
  onClose: () => void;
}) {
  const sourceHash = starFingerprint(project);
  return <SummaryAiDialog intent="generate" title={`根据 STAR 生成${subject}`}
    subtitle={`${project.name || '未命名项目'}${targetRole ? ` · 目标岗位 ${targetRole}` : ''}`}
    sourceKey={sourceHash} sourceLabel="查看 STAR 原始记录"
    checkSource={[project.situation, ...project.actions.map(a=>a.text), ...project.results.map(r=>r.text)].filter(Boolean).join('\n')}
    source={<>
      {project.situation && <p>背景：{project.situation}</p>}
      {project.task && <p>目标：{project.task}</p>}
      {project.actions.length>0 && <p>行动：{joinProse(project.actions.map(a=>a.text))}</p>}
      {project.results.length>0 && <p>结果：{joinProse(project.results.map(r=>r.text))}</p>}
    </>}
    request={async(style, config, signal)=>{
      const result = await composeProject({subject, style, project, targetRole, jd:'', config, signal});
      return result.paragraph.trim() || joinProse(result.bullets);
    }}
    onApply={text=>onApply({mode:'paragraph',text,bullets:[],sourceHash})} onClose={onClose}/>
}
