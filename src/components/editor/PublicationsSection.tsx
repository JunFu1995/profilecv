import { ActionMenu } from '../ActionMenu';
import { newPublication } from '../../data';
import { locate } from '../../locate';
import { PublicationCard } from '../PublicationCard';
import { PaperImport } from '../PaperImport';
import { hitToPublicationFields } from '../../crossref';
import { Section } from './Section';
import { move } from './move';
import type { EditorSectionProps } from './types';

export function PublicationsSection({ master, actions, onSupplement, expandNewExperience, onImport }: EditorSectionProps & { onImport: () => void }) {
  const { setPublication, removeItem } = actions;
  return <>
      <Section
        title="发表论文" onSupplement={onSupplement ? () => onSupplement('publications') : undefined}
        count={master.publications.length}
        addAction={<ActionMenu label="＋ 添加论文" primary>
          <button type="button" onClick={onImport}>
            <strong>按论文导入</strong>
            <span>搜索论文名称或粘贴 DOI，自动获取信息。</span>
          </button>
          <button type="button" onClick={() => {
            const item = newPublication();
            expandNewExperience(item.id, 'publications');
            setPublication(m => ({ ...m, publications: [...m.publications, item] }));
            locate(item.id, { focus: true });
          }}>
            <strong>手动编辑</strong>
            <span>新建空白论文，填写作者、标题和发表信息。</span>
          </button>
        </ActionMenu>}
      >
        {master.publications.map((p, i) => (
          <PublicationCard
            key={p.id}
            pub={p}
            defaultHighlight={master.basics.name}
            onChange={(patch) =>
              setPublication((m) => ({
                ...m,
                publications: m.publications.map((x) => (x.id === p.id ? { ...x, ...patch } : x)),
              }))
            }
            onRemove={() => removeItem('publications', p.id, p.title || '未命名论文')}
            onMoveUp={() => setPublication((m) => ({ ...m, publications: move(m.publications, i, -1) }))}
            onMoveDown={() => setPublication((m) => ({ ...m, publications: move(m.publications, i, 1) }))}
          />
        ))}
      </Section>

  </>;
}

export function PublicationImport({ master, actions, onClose }: Pick<EditorSectionProps, 'master' | 'actions'> & { onClose: () => void }) {
  const { set } = actions;
  return (
        <PaperImport
          existingDois={master.publications.map((p) => p.doi).filter(Boolean)}
          onAdd={(hit) =>
            set((m) => ({
              ...m,
              publications: [
                ...m.publications,
                {
                  ...newPublication(),
                  ...hitToPublicationFields(hit),
                  highlight: m.basics.name,
                },
              ],
            }))
          }
          onClose={onClose}
        />
  );
}
