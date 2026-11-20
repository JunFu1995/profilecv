import { Section } from './Section';
import { ProjectCard } from './ProjectCard';
import type { EditorSectionProps } from './types';

export function ProjectsSection({ master, actions, onSupplement }: EditorSectionProps) {
  const { addProject, patchProject, removeProject, moveProject } = actions;
  return <>
      <Section
        title="独立项目" onSupplement={onSupplement ? () => onSupplement('projects') : undefined}
        count={master.sideProjects.length}
        onAdd={() => addProject(null)}
        addLabel="添加项目"
        hint="开源 / 个人作品 / 竞赛，不属于任何公司。"
      >
        {master.sideProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            targetRole={master.basics.title}
            onChange={(patch) => patchProject(null, p.id, patch)}
            onRemove={() => removeProject(null, p.id)}
            onMoveUp={() => moveProject(null, p.id, -1)}
            onMoveDown={() => moveProject(null, p.id, 1)}
          />
        ))}
      </Section>

  </>;
}
