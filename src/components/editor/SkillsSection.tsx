import { SkillCard } from '../SkillCard';
import { TrashIcon } from '@radix-ui/react-icons';
import { newSkill } from '../../data';
import { locate } from '../../locate';
import { IconButton } from '../ui';
import { Section } from './Section';
import type { EditorSectionProps } from './types';

export function SkillsSection({ master, actions, onSupplement, expandNewExperience, activeSection, isVariant }: EditorSectionProps) {
  const { setSkills, removeItem } = actions;
  return <>
      <div data-locate="skills">
      <Section title="技能" onSupplement={onSupplement ? () => onSupplement('skills') : undefined} count={master.skills.length} onAdd={() => {
        const item = newSkill();
        expandNewExperience(item.id, 'skills');
        setSkills([...master.skills, item]);
        locate('skills');
        locate(item.id, { focus: true });
      }} addLabel="添加分组">
        {master.skills.map((s) => activeSection !== undefined || isVariant ? (
          <SkillCard key={s.id} skill={s} onChange={patch => setSkills(master.skills.map(x => x.id === s.id ? { ...x, ...patch } : x))} onRemove={() => removeItem('skills', s.id, s.label || '技能分组')} />
        ) : (
          <div className="inline-row" key={s.id} data-locate={s.id}>
            <input
              className="w-90"
              value={s.label}
              placeholder="语言"
              onChange={(e) => setSkills(master.skills.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))}
            />
            <input
              value={s.value}
              placeholder="Go、Java、Python、SQL"
              onChange={(e) => setSkills(master.skills.map((x) => (x.id === s.id ? { ...x, value: e.target.value } : x)))}
            />
            <IconButton title="删除" danger onClick={() => removeItem('skills', s.id, s.label || '技能分组')}>
              <TrashIcon aria-hidden="true" />
            </IconButton>
          </div>
        ))}
      </Section>
      </div>
  </>;
}
