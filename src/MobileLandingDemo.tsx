import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownIcon, CheckIcon, DesktopIcon, FileTextIcon, LockClosedIcon } from '@radix-ui/react-icons';
import './mobileLandingDemos.css';

const archive = [
  { name: '工作经历', title: 'XX 公司 · 开发实习', tags: ['接口优化', '缓存设计'] },
  { name: '项目经历', title: 'XX 推荐项目', tags: ['服务设计', '模型实验'] },
  { name: '科研经历', title: 'XX 研究课题', tags: ['实验设计', '结果分析'] },
  { name: '发表论文', title: 'XX 论文', tags: ['第一作者', 'XX 期刊'] },
  { name: '教育经历', title: 'XX 大学', tags: ['计算机专业', 'XX 学位'] },
  { name: '技能', title: '开发技能', tags: ['React', 'Python · XX'] },
];
const jobs = [
  { name: '开发工程师', tags: ['接口优化', '缓存设计'] },
  { name: '算法工程师', tags: ['模型结构', '特征工程'] },
];
const titles = ['职业档案', '一份经历，多种表达', 'AI 润色', '智能一页', '本地存储 · AI 直连'];

function MobileArchive({ autoStep }: { autoStep: number }) {
  const selected = Math.min(autoStep, archive.length - 1);
  const card = archive[selected];
  return <>
    <div className="mobile-demo-choices mobile-demo-categories" role="group" aria-label="档案类别">
      {archive.map((item, index) => <span key={item.name} className={selected === index ? 'is-current' : ''} aria-current={selected === index ? 'true' : undefined}>{item.name}</span>)}
    </div>
    <div key={selected} className="mobile-demo-paper mobile-demo-enter">
      <div className="mobile-demo-paper-heading"><h4>{card.name}</h4><span>0{selected + 1} / 06</span></div>
      <div className="mobile-demo-record"><strong>{card.title}</strong><div className="mobile-demo-keywords">{card.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div>
      <div className="mobile-demo-placeholder" aria-label="其余经历省略示意"><span>XX</span><span>XX · XX</span></div>
    </div>
    <p className="mobile-demo-footnote">分类积累，随时取用</p>
  </>;
}

function MobileVariant({ autoStep }: { autoStep: number }) {
  const selected = autoStep > 0 ? 1 : 0;
  const job = jobs[selected];
  return <>
    <div className="mobile-demo-source"><span>同一份档案</span><strong>XX 推荐项目</strong></div>
    <div className="mobile-demo-choices" role="group" aria-label="目标岗位">
      {jobs.map((item, index) => <span key={item.name} className={selected === index ? 'is-current' : ''} aria-current={selected === index ? 'true' : undefined}>{item.name}</span>)}
    </div>
    <div key={selected} className="mobile-demo-paper mobile-demo-enter">
      <div className="mobile-demo-paper-heading"><h4>岗位简历</h4><span>项目经历</span></div>
      <strong className="mobile-demo-record-title">XX 推荐项目</strong>
      <div className="mobile-demo-keywords">{job.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      <div className="mobile-demo-placeholder mobile-demo-placeholder-inline" aria-label="其余内容省略示意"><span>XX</span><span>XX · XX</span></div>
    </div>
    <p className="mobile-demo-footnote">岗位不同，重点不同</p>
  </>;
}

function MobileAi({ autoStep }: { autoStep: number }) {
  const style = autoStep >= 2 ? 'technical' : 'concise';
  const ready = autoStep >= 1;
  const complete = autoStep >= 2;
  return <>
    <div className="mobile-demo-source"><span>原始素材</span><p>接口偏慢；缓存优化后，480ms → 90ms。</p></div>
    <div className="mobile-demo-choices" role="group" aria-label="润色风格">
      {(['concise', 'technical'] as const).map(value => <span key={value} className={style === value ? 'is-current' : ''} aria-current={style === value ? 'true' : undefined}>{value === 'concise' ? '精简有力' : '技术导向'}</span>)}
    </div>
    <div className={'mobile-demo-paper mobile-demo-ai-result' + (complete ? ' is-adopted' : '')}>
      <div className="mobile-demo-paper-heading"><h4>润色结果</h4><span>事实不变</span></div>
      <div className="mobile-demo-ai-copy">{ready ? <p key={style} className="mobile-demo-enter">{style === 'concise' ? <>优化接口，<mark>延迟 480ms → 90ms。</mark></> : <>通过<mark>缓存优化</mark>，延迟 <mark>480ms → 90ms。</mark></>}</p> : <p className="mobile-demo-generating">正在润色…</p>}</div>
      <div className="mobile-demo-result-status" role="status">{complete && <CheckIcon aria-hidden="true" />}{complete ? '润色完成' : ready ? '突出重点' : '生成中'}</div>
    </div>
  </>;
}

function MobilePrivacy({ autoStep }: { autoStep: number }) {
  const phase = autoStep === 0 ? 'idle' : autoStep === 1 ? 'sending' : 'done';
  return <>
    <div className="mobile-demo-local"><div className="mobile-demo-local-title"><DesktopIcon aria-hidden="true" /><h4>本地浏览器</h4></div><div className="mobile-demo-local-items"><span><FileTextIcon aria-hidden="true" />职业档案</span><span><LockClosedIcon aria-hidden="true" />API Key</span></div><p>本地保存 · 可备份</p></div>
    <div className={'mobile-demo-route ' + phase}><ArrowDownIcon aria-hidden="true" /><div><strong>使用 AI 时直连</strong><span>不经本站中转</span></div></div>
    <div className="mobile-demo-paper mobile-demo-provider"><div><h4>AI 供应商</h4><p>仅发送所选内容。</p></div><div className="mobile-demo-result-status" role="status">{phase === 'done' && <CheckIcon aria-hidden="true" />}{phase === 'done' ? '直连示意 · 未发送数据' : phase === 'sending' ? '直连中…' : '浏览器 → AI 供应商'}</div></div>
  </>;
}

function MobileLayout({ autoStep, renderLayout }: { autoStep: number; renderLayout: (step: number) => ReactNode }) {
  return <><div className="mobile-demo-layout-preview">{renderLayout(autoStep)}</div><div className="mobile-demo-result-status" role="status">{autoStep === 3 && <CheckIcon aria-hidden="true" />}{autoStep === 3 ? '两页 → 一页' : '保留内容，自动排版'}</div></>;
}

// Short examples need only a one-second result hold before the next cycle.
// Both playback and the hold retain their remaining delay offscreen.
const entryTimings = [[650, 800, 800, 800, 800], [1100], [240, 950], [400, 550, 1000], [350, 550]];

export function MobileLandingDemo({ kind, renderLayout }: { kind: number; renderLayout: (step: number) => ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false), [pageVisible, setPageVisible] = useState(!document.hidden);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playhead, setPlayhead] = useState<{ step: number; cycle: number; phase: 'play' | 'out' | 'in' }>({ step: 0, cycle: 0, phase: 'play' });
  const autoStep = playhead.step;
  const clock = useRef({ phase: '', remaining: 0 });
  const skipAutoplay = useRef(reduced);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(query.matches), updatePage = () => setPageVisible(!document.hidden);
    query.addEventListener('change', updateMotion); document.addEventListener('visibilitychange', updatePage);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= .35), { rootMargin: '-112px 0px 0px', threshold: [0, .35] });
    if (host.current) observer.observe(host.current);
    return () => { observer.disconnect(); query.removeEventListener('change', updateMotion); document.removeEventListener('visibilitychange', updatePage); };
  }, []);
  const active = visible && pageVisible;
  useEffect(() => {
    if (reduced) skipAutoplay.current = true;
    if (skipAutoplay.current) return;
    const finalStep = entryTimings[kind].length;
    const phase = `${playhead.cycle}:${autoStep}:${playhead.phase}`;
    if (clock.current.phase !== phase) {
      // The layout needs 600ms to finish centering its final sheet.
      const hold = 1000 + (kind === 3 ? 600 : 220);
      const remaining = playhead.phase === 'out' ? 120 : playhead.phase === 'in' ? 160 : autoStep === finalStep ? hold : entryTimings[kind][autoStep];
      clock.current = { phase, remaining };
    }
    if (!active) return;
    const began = performance.now();
    const timer = window.setTimeout(() => setPlayhead(current => {
      if (current.phase === 'out') return { step: 0, cycle: current.cycle + 1, phase: 'in' };
      if (current.phase === 'in') return { ...current, phase: 'play' };
      if (current.step === finalStep) return { ...current, phase: 'out' };
      return { ...current, step: current.step + 1 };
    }), clock.current.remaining);
    return () => {
      window.clearTimeout(timer);
      clock.current.remaining = Math.max(0, clock.current.remaining - (performance.now() - began));
    };
  }, [active, reduced, autoStep, playhead.cycle, playhead.phase, kind]);
  const motionDisabled = reduced || skipAutoplay.current;
  const displayStep = motionDisabled ? entryTimings[kind].length : autoStep;
  const replayPhase = motionDisabled ? 'play' : playhead.phase;
  return <div ref={host} className={`demo-player mobile-demo${active ? ' is-playing' : ''}`} data-kind={kind} data-step={displayStep} data-cycle={playhead.cycle} data-replay-phase={replayPhase} aria-label={`${titles[kind]}功能演示`}>
    <div className="demo-frame-head"><strong>{titles[kind]}</strong><span>{reduced ? '功能示意' : '自动演示'}</span></div>
    <div className={`mobile-demo-body mobile-demo-replay-${replayPhase}`} key={playhead.cycle}>
      {kind === 0 ? <MobileArchive autoStep={displayStep} /> : kind === 1 ? <MobileVariant autoStep={displayStep} /> : kind === 2 ? <MobileAi autoStep={displayStep} /> : kind === 3 ? <MobileLayout autoStep={displayStep} renderLayout={renderLayout} /> : <MobilePrivacy autoStep={displayStep} />}
    </div>
  </div>;
}
