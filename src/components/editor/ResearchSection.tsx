import { newWork } from '../../data';
import { locate } from '../../locate';
import { Section } from './Section';
import { move } from './move';
import { WorkCard } from './WorkCard';
import type { EditorSectionProps } from './types';

export function ResearchSection({ master, actions, onSupplement, expandNewExperience }: EditorSectionProps) {
  const { set, patchResearch, removeItem, setResearch } = actions;
  return <>
      <Section
        title="科研经历" onSupplement={onSupplement ? () => onSupplement('research') : undefined}
        count={master.research.length}
        materialIds={master.research.flatMap(w => [w.id, ...w.projects.map(p => p.id)])}
        onAdd={() => {
          const item = newWork();
          expandNewExperience(item.id, 'research');
          set((m) => ({ ...m, research: [...m.research, item] }));
          locate(item.id, { focus: true });
        }}
        addLabel="添加科研经历"
        hint="实验室 / 研究机构 / 导师项目，结构和公司经历一样。"
      >
        {master.research.map((w, i) => (
          <WorkCard
            key={w.id}
            work={w}
            index={i}
            total={master.research.length}
            companyLabel="机构 / 实验室"
            roleLabel="身份"
            showProjects={false}
            showSummary
            targetRole={master.basics.title}
            onChange={(p) => patchResearch(w.id, p)}
            onRemove={() => removeItem('research', w.id, w.company || '未命名科研经历')}
            onMoveUp={() => setResearch((m) => ({ ...m, research: move(m.research, i, -1) }))}
            onMoveDown={() => setResearch((m) => ({ ...m, research: move(m.research, i, 1) }))}
            onAddProject={() => {}}
            onProjectChange={() => {}}
            onProjectRemove={() => {}}
            onProjectMove={() => {}}
          />
        ))}
      </Section>

  </>;
}
