import { Hint } from '../Hint';
import { MaterialExample } from '../MaterialExample';
import { CategoryName } from '../CategoryName';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { LibrarySectionContext, LibrarySectionIcon, type LibrarySection } from '../LibraryNav';
import { ActionMenu } from '../ActionMenu';
import { MaterialDisclosureContext, useMaterialDisclosure, setMaterialDisclosure } from '../../useMaterialDisclosure';
import { useContext, useEffect, useRef } from 'react';
import { registerLocate } from '../../locate';

export function Section({
  title,
  hint,
  onAdd,
  addLabel,
  children,
  count,
  materialIds,
  addAction,
  onSupplement,
}: {
  title: string;
  hint?: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
  count?: number;
  materialIds?: string[];
  addAction?: React.ReactNode;
  onSupplement?: () => void;
}) {
  const context = useContext(MaterialDisclosureContext);
  const category = useContext(LibrarySectionContext);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!category) return;
    const ids = new Set([...(materialIds ?? []), ...Array.from(sectionRef.current?.querySelectorAll<HTMLElement>('[data-locate]') ?? []).map(el => el.dataset.locate!)]);
    if (title === '基本信息') ids.add('basics');
    if (title === '技能') ids.add('skills');
    const off = [...ids].map(id => registerLocate(id, () => category.select(title as LibrarySection)));
    return () => off.forEach(fn => fn());
  });
  const collapsible = !!context && (title === '基本信息' || title === '技能');
  const [open, setOpen] = useMaterialDisclosure(`section-${title}`, true);
  useEffect(() => {
    if (!collapsible) return;
    return registerLocate(title === '基本信息' ? 'basics' : 'skills', () => setOpen(true));
  }, [collapsible, title]);
  return (
    <section ref={sectionRef} className={`section${category ? ' library-accordion' : ''}`} data-open={category ? category.active === title : undefined} id={`editor-${title}`} data-material-ids={materialIds?.join(' ')}>
      {category && <h2 className="library-accordion-heading"><button type="button" id={`library-toggle-${title}`} aria-expanded={category.active === title} aria-controls={`library-body-${title}`} onClick={() => category.select(title as LibrarySection)} onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(sectionRef.current?.closest('.editor')?.querySelectorAll<HTMLButtonElement>('.library-accordion-heading button') ?? []);
        const index = buttons.indexOf(event.currentTarget);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}><span className="library-accordion-icon"><LibrarySectionIcon title={title} /></span><span className="library-accordion-label">{title}<small>{{ '基本信息': '姓名、联系方式与个人简介', '工作经历': '记录职责与代表成果', '独立项目': '个人作品、开源与竞赛', '科研经历': '研究方向与学术贡献', '发表论文': '论文信息与作者位次', '教育经历': '学校、专业与学历', '技能': '整理专长与技能清单' }[title]}</small></span>{typeof count === 'number' && <span className="library-accordion-count">{count} {title === '发表论文' ? '篇' : title === '技能' ? '组' : title === '独立项目' ? '个项目' : '段经历'}</span>}<span className="library-accordion-chevron" aria-hidden="true"><ChevronDownIcon width={18} height={18} /></span></button></h2>}
      <div id={category ? `library-body-${title}` : undefined} role={category ? 'region' : undefined} aria-labelledby={category ? `library-toggle-${title}` : undefined} hidden={!!category && category.active !== title} className={category ? 'library-accordion-body' : undefined}>
      <div className="section-head">
        {category?.rename ? <CategoryName editable={false} name={category.names?.[title]||title} onSave={name=>category.rename?.(title,name)} headerActions={<MaterialExample title={title} compact hint={hint}/>}/> : <h2>
          {collapsible ? <button type="button" className="section-toggle" aria-expanded={open} onClick={event => setOpen(!open, event.currentTarget)}>{open ? '▾' : '▸'} {title}<span>{open ? '收起' : '展开编辑'}</span></button> : title}
          {typeof count === 'number' && count > 0 && <span className="count">{count}</span>}
          {hint && <Hint label={`${title}填写说明`}>{hint}</Hint>}
        </h2>}
        {!context && !category?.rename && !!count && title !== '技能' && <div className="section-disclosure-actions"><ActionMenu label="更多">
          <button type="button" className="btn-ghost small" onClick={e => setMaterialDisclosure(e.currentTarget.closest('.section'), true)}>全部展开</button>
          <button type="button" className="btn-ghost small" onClick={e => setMaterialDisclosure(e.currentTarget.closest('.section'), false)}>全部收起</button>
        </ActionMenu></div>}
        {onSupplement && <button type="button" className="btn-ghost" onClick={onSupplement}>从素材库补充</button>}
        {!context && addAction}
        {!context && onAdd && (
          <button type="button" className="btn-ghost" onClick={onAdd}>
            ＋ {context ? '本版新增' : (addLabel ?? '添加')}
          </button>
        )}
      </div>
      <div hidden={collapsible && !open} className={category?.rename && ['工作经历', '独立项目', '科研经历', '发表论文', '教育经历', '技能'].includes(title) ? 'archive-card-grid' : undefined}>
        {category&&!category.rename&&<MaterialExample title={title}/>}
        {category && count === 0 && <div className="library-empty"><span aria-hidden="true">＋</span><strong>还没有{title}</strong><p>点击右上方的添加按钮，记录第一条素材。</p></div>}
        {children}
      </div>
      </div>
    </section>
  );
}
