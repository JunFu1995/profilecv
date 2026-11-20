import { educationCardSummary, type ArchiveCardSummaryData } from '../../archiveCardSummary';
import { Hint } from '../Hint';
import { ArchiveDragHandle } from '../ArchiveDragHandle';
import { TrashIcon } from '@radix-ui/react-icons';
import { LibrarySectionContext } from '../LibraryNav';
import { CollapseMaterial } from '../CollapseMaterial';
import { MaterialDisclosureContext, useMaterialDisclosure } from '../../useMaterialDisclosure';
import { useContext, useEffect } from 'react';
import { newEducation } from '../../data';
import { locate, registerLocate } from '../../locate';
import { AutoTextarea, Field, IconButton } from '../ui';
import { Section } from './Section';
import { ExperienceSummary } from './ExperienceSummary';
import type { EditorSectionProps } from './types';

function EducationCard({ id, title, subtitle, role, period, summary, children, onRemove }: { id: string; title: string; subtitle: string; role: string; period: string; summary: ArchiveCardSummaryData; children: React.ReactNode; onRemove: () => void }) {
  const isVariant = !!useContext(MaterialDisclosureContext);
  const compact = !!useContext(LibrarySectionContext);
  const [open, setOpen, itemProps] = useMaterialDisclosure(id, compact ? false : !title, 'education');
  useEffect(() => registerLocate(id, () => setOpen(true)), [id]);
  return <div className={`card${compact ? ' experience-card' : ''}`} data-locate={id} {...itemProps}>
    <div className="card-head">
      {(compact || isVariant) && <ArchiveDragHandle id={id} label={title || '未命名学校'} />}
      <button type="button" className="card-toggle" aria-expanded={open} aria-controls={`education-${id}`} onClick={event => setOpen(!open, event.currentTarget)}>
        <span className={`caret${open ? ' open' : ''}`}>▸</span>
        {compact ? <ExperienceSummary title={title || '未命名学校'} role={role} period={period} showRole={false} summary={!open ? summary : undefined} /> : <><span className="card-title">{title || '（未命名学校）'}</span><span className="card-sub">{subtitle}</span></>}
        {!isVariant && <span className="disclosure-label">{open ? '收起' : '展开编辑'}</span>}
      </button>
      {(!isVariant || !open) && <IconButton title="删除教育经历" danger onClick={onRemove}><TrashIcon aria-hidden="true" /></IconButton>}
    </div>
    <div className="education-card-body" id={`education-${id}`} hidden={!open}>{children}<CollapseMaterial onCollapse={() => setOpen(false)} /></div>
  </div>;
}

function EditableBullets({ items, onChange }: { items: {id:string;text:string}[]; onChange: (items: {id:string;text:string}[]) => void }) {
  return <>{items.map((bullet, index) => <div className="field-block" data-locate={bullet.id} key={bullet.id}><span className="field-label">要点 {index + 1}</span><AutoTextarea value={bullet.text} onChange={text => onChange(items.map(b => b.id === bullet.id ? {...b, text} : b))} /></div>)}</>;
}

export function EducationSection({ master, actions, onSupplement, expandNewExperience }: EditorSectionProps) {
  const { set, patchEducation, removeItem } = actions;
  return <>
      <Section
        title="教育经历" onSupplement={onSupplement ? () => onSupplement('education') : undefined}
        count={master.education.length}
        onAdd={() => {
          const item = newEducation();
          expandNewExperience(item.id, 'education');
          set((m) => ({ ...m, education: [...m.education, item] }));
          locate(item.id, { focus: true });
        }}
        addLabel="添加教育"
      >
        {master.education.map((g) => (
          <EducationCard summary={educationCardSummary(g)} key={g.id} id={g.id} title={g.org} role={[g.role, g.degree].filter(Boolean).join(' · ')} period={[g.start, g.end].filter(Boolean).join(' – ')} subtitle={[g.role,g.degree, [g.start, g.end].filter(Boolean).join(' – '), g.detail].filter(Boolean).join(' · ')} onRemove={() => removeItem('education', g.id, g.org || '未命名教育经历')}>
            <div className="card-body">
              <div className="grid-2">
                <div className="field"><div className="field-label-row"><label className="field-label" htmlFor={`education-school-${g.id}`}>学校</label><Hint label="学校填写说明">可输入校名搜索建议，也可直接填写其他学校。</Hint></div><input id={`education-school-${g.id}`} list={`education-schools-${g.id}`} value={g.org} onChange={e=>patchEducation(g.id,{org:e.target.value})} placeholder="输入或选择学校"/><datalist id={`education-schools-${g.id}`}>{Array.from(new Set([...master.education.map(e=>e.org.trim()).filter(Boolean),'清华大学','北京大学','中国科学技术大学','浙江大学','上海交通大学','复旦大学','南京大学','武汉大学','华中科技大学','哈尔滨工业大学','西安交通大学','北京航空航天大学','同济大学','东南大学','中山大学','四川大学','电子科技大学','北京理工大学','天津大学','南开大学','山东大学','厦门大学','吉林大学','大连理工大学','西北工业大学','北京师范大学','中国人民大学','中南大学','华南理工大学','重庆大学','湖南大学','东北大学','兰州大学','中国农业大学','中国海洋大学','中央民族大学','国防科技大学','西北农林科技大学','华东师范大学','深圳大学','南方科技大学','香港大学','香港中文大学','香港科技大学'])).map(school=><option key={school} value={school}/>)}</datalist></div>
                <Field
                  label="专业"
                  value={g.role}
                  onChange={(v) => patchEducation(g.id, { role: v })}
                  placeholder="计算机科学与技术"
                />
                <label className="field"><span className="field-label">学历 / 学位</span><input list={`education-degrees-${g.id}`} value={g.degree??''} onChange={e=>patchEducation(g.id,{degree:e.target.value})} placeholder="选择或填写学历"/><datalist id={`education-degrees-${g.id}`}>{['博士后','博士','硕士','本科','大专','中专','高中'].map(degree=><option key={degree} value={degree}/>)}</datalist></label>
                <Field label="开始" value={g.start} onChange={(v) => patchEducation(g.id, { start: v })} placeholder="2016.09" />
                <Field label="结束" value={g.end} onChange={(v) => patchEducation(g.id, { end: v })} placeholder="2020.06" />
                <label className="field"><span className="field-label">城市（可空）</span><input list={`education-cities-${g.id}`} value={g.location} onChange={e=>patchEducation(g.id,{location:e.target.value})} placeholder="选择或输入城市"/><datalist id={`education-cities-${g.id}`}>{['北京','上海','广州','深圳','杭州','南京','武汉','合肥','成都','重庆','西安','天津','长沙','苏州','厦门','青岛','济南','郑州','大连','沈阳','哈尔滨','长春','兰州','香港','澳门','台北'].map(city=><option value={city} key={city}/>)}</datalist></label>
                <Field
                  label="副标题（可空）"
                  value={g.detail}
                  onChange={(v) => patchEducation(g.id, { detail: v })}
                  placeholder="GPA 3.7/4.0 · 校级奖学金 2 次"
                />
              </div>
            </div>
            <EditableBullets items={g.bullets} onChange={bullets => patchEducation(g.id, {bullets})} />
          </EducationCard>
        ))}
      </Section>

  </>;
}
