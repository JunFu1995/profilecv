import { useState } from 'react';
import type { BulletGroup, Master, Project, SkillGroup, WorkEntry } from '../../types';
import { newProject } from '../../data';
import { locate } from '../../locate';
import { move } from './move';

export function useEditorActions(master: Master, onChange: (master: Master) => void, expandNewExperience: (id: string, group: string) => void) {
  const set = (fn: (m: Master) => Master) => onChange(fn(master));
  const [, setDeletions] = useState<{ label: string; restore: (m: Master) => Master }[]>([]);
  const removeItem = <K extends 'work' | 'research' | 'publications' | 'education' | 'skills' | 'sideProjects'>(key: K, id: string, label: string) => {
    const list = master[key];
    const index = list.findIndex(item => item.id === id);
    if (index < 0) return;
    const item = list[index];
    onChange({ ...master, [key]: list.filter(entry => entry.id !== id) });
    setDeletions(history => [...history, { label, restore: m => {
      if (m[key].some(entry => entry.id === id)) return m;
      const restored = [...m[key]];
      restored.splice(Math.min(index, restored.length), 0, item);
      return { ...m, [key]: restored };
    } }]);
  };
  const patchWork = (id: string, p: Partial<WorkEntry>) =>
    set((m) => ({ ...m, work: m.work.map((w) => (w.id === id ? { ...w, ...p } : w)) }));

  const patchResearch = (id: string, p: Partial<WorkEntry>) =>
    set((m) => ({ ...m, research: m.research.map((w) => (w.id === id ? { ...w, ...p } : w)) }));

  const setResearch = (fn: (m: Master) => Master) => set(fn);
  const setPublication = (fn: (m: Master) => Master) => set(fn);

  const patchProject = (workId: string | null, pid: string, p: Partial<Project>) =>
    set((m) => {
      if (workId === null) {
        return { ...m, sideProjects: m.sideProjects.map((x) => (x.id === pid ? { ...x, ...p } : x)) };
      }
      return {
        ...m,
        work: m.work.map((w) =>
          w.id !== workId ? w : { ...w, projects: w.projects.map((x) => (x.id === pid ? { ...x, ...p } : x)) },
        ),
      };
    });

  const addProject = (workId: string | null) => {
    const p = newProject();
    expandNewExperience(p.id, workId === null ? 'projects' : `projects:${workId}`);
    set((m) => {
      if (workId === null) return { ...m, sideProjects: [...m.sideProjects, p] };
      return { ...m, work: m.work.map((w) => (w.id === workId ? { ...w, projects: [...w.projects, p] } : w)) };
    });
    locate(p.id, { focus: true });
  };

  const removeProject = (workId: string | null, pid: string) => {
    if (workId === null) { removeItem('sideProjects', pid, master.sideProjects.find(p => p.id === pid)?.name || '未命名项目'); return; }
    const work = master.work.find(w => w.id === workId);
    const index = work?.projects.findIndex(p => p.id === pid) ?? -1;
    const project = work?.projects[index];
    if (!project) return;
    set(m => ({ ...m, work: m.work.map(w => w.id === workId ? { ...w, projects: w.projects.filter(p => p.id !== pid) } : w) }));
    setDeletions(history => [...history, { label: project.name || '未命名项目', restore: m => ({ ...m, work: m.work.map(w => {
      if (w.id !== workId || w.projects.some(p => p.id === pid)) return w;
      const projects = [...w.projects];
      projects.splice(Math.min(index, projects.length), 0, project);
      return { ...w, projects };
    }) }) }]);
  };

  const moveProject = (workId: string | null, pid: string, delta: number) =>
    set((m) => {
      if (workId === null) {
        const i = m.sideProjects.findIndex((x) => x.id === pid);
        return { ...m, sideProjects: move(m.sideProjects, i, delta) };
      }
      return {
        ...m,
        work: m.work.map((w) => {
          if (w.id !== workId) return w;
          const i = w.projects.findIndex((x) => x.id === pid);
          return { ...w, projects: move(w.projects, i, delta) };
        }),
      };
    });

  const setSkills = (skills: SkillGroup[]) => set((m) => ({ ...m, skills }));
  const patchEducation = (id: string, p: Partial<BulletGroup>) =>
    set((m) => ({ ...m, education: m.education.map((g) => (g.id === id ? { ...g, ...p } : g)) }));

  return {
    set,
    removeItem,
    setDeletions,
    patchWork,
    patchResearch,
    setResearch,
    setPublication,
    patchProject,
    addProject,
    removeProject,
    moveProject,
    setSkills,
    patchEducation,
  };
}

export type EditorActions = ReturnType<typeof useEditorActions>;
