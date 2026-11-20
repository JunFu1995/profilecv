import { newWork } from '../../data';
import { locate } from '../../locate';
import { Section } from './Section';
import { move } from './move';
import { WorkCard } from './WorkCard';
import type { EditorSectionProps } from './types';

export function WorkSection({ master, actions, onSupplement, expandNewExperience }: EditorSectionProps) {
  const { set, patchWork, removeItem, addProject, patchProject, removeProject, moveProject } = actions;
  return <>
      <Section
        title="工作经历" onSupplement={onSupplement ? () => onSupplement('work') : undefined}
        count={master.work.length}
        materialIds={master.work.flatMap(w => [w.id, ...w.projects.map(p => p.id)])}
        onAdd={() => {
          const item = newWork();
          expandNewExperience(item.id, 'work');
          set((m) => ({ ...m, work: [...m.work, item] }));
          locate(item.id, { focus: true });
        }}
        addLabel="添加经历"
        hint="按时间倒序填写任职信息，在对应公司下添加项目，描述你的工作成果。"
      >
        {master.work.map((w, i) => (
          <WorkCard
            key={w.id}
            work={w}
            index={i}
            total={master.work.length}
            onChange={(p) => patchWork(w.id, p)}
            onRemove={() => removeItem('work', w.id, w.company || '未命名工作经历')}
            onMoveUp={() => set((m) => ({ ...m, work: move(m.work, i, -1) }))}
            onMoveDown={() => set((m) => ({ ...m, work: move(m.work, i, 1) }))}
            onAddProject={() => addProject(w.id)}
            onProjectChange={(pid, p) => patchProject(w.id, pid, p)}
            onProjectRemove={(pid) => removeProject(w.id, pid)}
            onProjectMove={(pid, d) => moveProject(w.id, pid, d)}
            targetRole={master.basics.title}
          />
        ))}
      </Section>

  </>;
}
