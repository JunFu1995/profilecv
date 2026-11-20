import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { COMPOSE_STYLES } from './composeStyles';
import { MobileLandingDemo } from './MobileLandingDemo';

const archiveCards = [
  { name: '工作经历' },
  { name: '项目经历' },
  { name: '科研经历' },
  { name: '发表论文' },
  { name: '教育经历' },
  { name: '技能' },
];

function DemoFrame({ title, children }: { title: string; children: ReactNode }) {
  return <div className="demo-frame"><div className="demo-frame-head"><strong>{title}</strong></div>{children}</div>;
}

function InkCheck() {
  return <svg className="demo-ink-check" viewBox="0 0 28 28" aria-hidden="true"><path pathLength="1" d="M5 15 Q9 18 11 22 C15 16 19 9 24 5" /><path className="demo-ink-echo" pathLength="1" d="M6 17 L11 23 Q17 13 23 7" /></svg>;
}

function ArchiveDemo({ step, onSelect }: { step: number; onSelect: (index: number) => void }) {
  return <DemoFrame title="职业档案">
    <div className="demo-archive-folder">
      <div className="archive-folder-back" aria-hidden="true" />
      <div className="archive-paper-stack" aria-hidden="true"><i /><i /></div>
      <div className="archive-folder-index" role="group" aria-label="档案类别">
        {archiveCards.map((card, index) => <button type="button" key={card.name} className={step === index ? 'is-selected' : ''} aria-pressed={step === index} aria-label={`查看${card.name}`} onClick={() => onSelect(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{card.name}</strong></button>)}
      </div>
      {archiveCards.map((card, index) => <div key={card.name} className={'archive-folder-paper' + (step === index ? ' is-selected' : '')} aria-hidden={step !== index}>
        <h4>{card.name}</h4>
        <div className="archive-paper-entries" aria-label="两条档案内容示意">{[0, 1].map(entry => <div className="archive-paper-entry" key={entry} aria-hidden="true"><i className="archive-entry-title-line" /><i className="archive-entry-meta-line" /><div className="archive-entry-body-lines"><i /><i /><i /></div></div>)}</div>
      </div>)}
      <div className="archive-folder-pocket" aria-hidden="true" />
    </div>
  </DemoFrame>;
}

const variantExperiences = [
  {
    title: '个性化推荐系统', category: '项目经历',
    keywords: [['接口优化', '缓存设计'], ['模型结构', '特征工程']],
  },
  {
    title: '推荐平台研发实习', category: '工作经历',
    keywords: [['服务拆分', '性能调优'], ['模型训练', '离线评估']],
  },
];
const variantJobs = [
  { title: '开发工程师' },
  { title: '算法工程师' },
];

function VariantDemo({ step, onSelect }: { step: number; onSelect: (job: number) => void }) {
  const currentJob = step >= 1 ? 1 : 0;
  return <DemoFrame title="岗位简历 · 推荐系统">
    <div className="demo-job-versions" data-job={currentJob}>
      <div className="job-jd-tabs" role="group" aria-label="选择目标岗位">
        <span className="job-jd-indicator" aria-hidden="true" />
        {variantJobs.map((job, index) => <button type="button" key={job.title} aria-pressed={currentJob === index} onClick={() => onSelect(index)}><small>JD {index + 1}</small><span>{job.title}</span></button>)}
      </div>
      <div className="job-resume-preview">
        <div className="job-resume-header"><strong>XX</strong><div className="job-resume-roles">{variantJobs.map((job, index) => <span key={job.title} className={currentJob === index ? 'is-visible' : ''} aria-hidden={currentJob !== index}>{job.title}</span>)}</div></div>
        <div className="job-resume-experiences">
          <div className="job-resume-group">{variantExperiences.map((record, order) => <div className="job-resume-section" key={record.title}>
            <h4>{record.category}</h4><strong>{record.title}</strong>
            <div className="job-keyword-variants">{record.keywords.map((keywords, index) => <div key={index} className={'job-resume-keywords' + (currentJob === index ? ' is-visible' : '')} aria-hidden={currentJob !== index}>
              {keywords.map((keyword, position) => <span key={keyword} style={{ '--keyword-order': order * 2 + position } as CSSProperties}>{keyword}</span>)}
            </div>)}</div>
            <div className="job-resume-lines" aria-hidden="true"><i /><i /><i /></div>
          </div>)}</div>
        </div>
        <div className="job-resume-foot" aria-hidden="true"><i /></div>
      </div>
    </div>
  </DemoFrame>;
}

const demoAiStyles = [COMPOSE_STYLES[1], COMPOSE_STYLES[2]];
type DemoAiStyle = (typeof demoAiStyles)[number]['id'];
function AiDemo({ step, acceptedStyle, onStyleChange, onAdopt }: { step: number; acceptedStyle?: DemoAiStyle; onStyleChange: (style: DemoAiStyle) => void; onAdopt: (style: DemoAiStyle) => void }) {
  const style = step >= 5 ? acceptedStyle ?? 'technical' : step >= 3 ? 'technical' : 'concise';
  const started = step >= 1;
  const adopted = step >= 5;
  const processing = step === 1 || step === 3;
  const ready = step === 2 || step === 4;
  const star = [['S', '背景', '高峰期订单响应偏慢'], ['T', '任务', '优化关键路径，降低延迟'], ['A', '行动', '拆分同步调用，合并重复查询'], ['R', '结果', 'P99 延迟 480ms → 90ms']];
  return <DemoFrame title="AI 润色">
    <div className={'demo-ai-new ai-style-' + style + (started ? ' is-started' : '') + (adopted ? ' is-adopted' : '')} data-style={style}>
      <div className="demo-ai-notes"><div className="demo-mini-label"><span>STAR 素材</span></div>
        <div className="demo-star-list">{star.map(([letter, label, content]) => <div className={'demo-star-row' + (started && letter === (style === 'concise' ? 'R' : 'A') ? ' is-emphasized' : '')} key={letter}><b>{letter}</b><div><strong>{label}</strong><span>{content}</span></div></div>)}</div>
      </div>
      <div className="ai-style-picker"><span>润色风格</span><div role="group" aria-label="选择润色偏好">{demoAiStyles.map(option => <button key={option.id} type="button" aria-pressed={started && style === option.id} onClick={() => onStyleChange(option.id)}><span>{option.label}</span></button>)}</div></div>
      <div className={'demo-ai-draft' + (processing ? ' is-processing' : '')}><div className="demo-mini-label"><span>结果</span><span key={style} className="ai-processing" aria-hidden="true"><i /><i /><i /></span></div>
        <div className="ai-style-expression">
          <p className={'ai-style-copy ai-style-copy-concise' + (started && style === 'concise' ? ' is-visible' : '')} aria-hidden={!started || style !== 'concise'}>优化订单调用与查询。<mark>P99 延迟从 <strong>480ms</strong> 降至 <strong>90ms</strong>。</mark></p>
          <p className={'ai-style-copy ai-style-copy-technical' + (started && style === 'technical' ? ' is-visible' : '')} aria-hidden={!started || style !== 'technical'}>针对高峰期订单响应偏慢的问题，<mark>拆分同步调用、合并重复查询</mark>，优化订单关键路径。P99 延迟由 <strong>480ms</strong> 降至 <strong>90ms</strong>，完成链路性能优化。</p>
          <div className={'ai-expression-placeholder' + (started ? ' is-hidden' : '')} aria-hidden="true"><i /><i /><i /></div>
        </div>
        <div className="ai-draft-footer"><button className="ai-adopt-button" type="button" aria-label={adopted ? '已采用润色建议' : '采用润色建议'} disabled={!ready || adopted} onClick={() => onAdopt(style)}>{adopted ? <InkCheck /> : '采用'}</button></div>
      </div>
    </div>
  </DemoFrame>;
}

const layoutSections = [
  { title: '个人简介', detail: '高并发服务 · 工程效率', x: 30, y: 178 },
  { title: '工作经历', detail: '交易平台后端', x: 30, y: 243 },
  { title: '科研经历', detail: '分布式故障恢复研究', x: 30, y: 308 },
  { title: '发表论文', detail: '故障恢复策略评估', x: 250, y: 144 },
  { title: '专业技能', detail: 'Go · SQL · Kafka', x: 250, y: 215 },
];

function LayoutDemo({ step }: { step: number }) {
  const fitting = step >= 1;
  const transferring = step >= 2;
  const fitted = step >= 3;
  return <DemoFrame title="智能一页">
    <div className={'demo-layout-studio' + (fitting ? ' is-fitting' : '') + (transferring ? ' is-transferring' : '') + (fitted ? ' is-fitted' : '')}>
      <svg className="demo-layout-canvas" viewBox="0 60 440 320" role="img" aria-label={fitted ? '两页简历的全部内容已收进一页' : '第二页内容逐步排入第一页'}>
        <g className="demo-layout-result" style={{ transform: fitted ? 'translateX(108px)' : 'translateX(0)' }}>
          <g className="demo-layout-paper" transform="translate(12 78)">
            <rect width="200" height="283" rx="2" />
          </g>
        </g>
        <g className="demo-layout-paper demo-layout-paper-second" transform="translate(228 78)">
          <rect width="200" height="283" rx="2" />
        </g>
        <g className="demo-layout-continuation" style={{ opacity: fitted ? 0 : 1 }}>
          <path d="M250 121 H406" />
          <text x="401" y="347" className="demo-layout-page-number">2 / 2</text>
        </g>
        <g className="demo-layout-result" style={{ transform: fitted ? 'translateX(108px)' : 'translateX(0)' }}>
          <g className="demo-layout-name" transform="translate(30 113)">
            <text className="demo-layout-person">XX</text>
            <text x="0" y="18" className="demo-layout-role">后端工程师</text>
            <path d="M0 29 H150" />
          </g>
          {layoutSections.map((section, index) => {
            const compact = index < 3 ? fitting : transferring;
            return <g key={section.title}
              className={'demo-layout-content demo-layout-block' + (index > 2 ? ` demo-layout-transfer demo-layout-transfer-${index}` : '')}
              style={{ transform: compact ? `translate(30px, ${160 + index * 38}px) scale(.9)` : `translate(${section.x}px, ${section.y}px)`, transitionDelay: transferring && index > 2 ? `${(index - 3) * 250}ms` : '0ms' }}>
              <text className="demo-layout-section-title">{section.title}</text>
              <text y="16" className="demo-layout-section-detail">{section.detail}</text>
              <path className="demo-layout-detail-line" d="M0 15 H128" />
              <path className="demo-layout-text-line" d="M0 22 H150" />
              <path className="demo-layout-text-line demo-layout-short-line" d={`M0 28 H${index === 4 ? 80 : 120}`} />
            </g>;
          })}
          <text x="30" y="347" className="demo-layout-page-number">{fitted ? '1 / 1' : '1 / 2'}</text>
        </g>
      </svg>
    </div>
  </DemoFrame>;
}

function PrivacyServerIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="9" rx="2" /><rect x="5" y="18" width="22" height="9" rx="2" /><path d="M10 9.5 H10.1 M10 22.5 H10.1 M17 9.5 H22 M17 22.5 H22" /></svg>;
}

function PrivacyDemo({ step, onConnect }: { step: number; onConnect: () => void }) {
  const connected = step >= 1;
  const scene = useRef<HTMLDivElement>(null);
  const [routes, setRoutes] = useState({ width: 1, height: 1, direct: '', arrow: '', labelX: 0, labelY: 0 });
  useLayoutEffect(() => {
    const node = scene.current;
    if (!node) return;
    const source = node.querySelector<HTMLElement>('.privacy-source')!;
    const destination = node.querySelector<HTMLElement>('.privacy-destination')!;
    const measure = () => {
      const bounds = node.getBoundingClientRect();
      const rect = (element: HTMLElement) => {
        const box = element.getBoundingClientRect();
        return { left: box.left - bounds.left, right: box.right - bounds.left, top: box.top - bounds.top, bottom: box.bottom - bounds.top, x: box.left - bounds.left + box.width / 2, y: box.top - bounds.top + box.height / 2 };
      };
      const from = rect(source), to = rect(destination);
      if (bounds.width <= 480) {
        const midY = (from.bottom + to.top) / 2;
        setRoutes({ width: bounds.width, height: bounds.height,
          direct: `M${from.x} ${from.bottom} L${to.x} ${to.top}`,
          arrow: `M${to.x - 4} ${to.top - 7} L${to.x} ${to.top - 2} L${to.x + 4} ${to.top - 7}`,
          labelX: from.x + 66, labelY: midY - 16 });
      } else {
        const midX = (from.right + to.left) / 2;
        setRoutes({ width: bounds.width, height: bounds.height,
          direct: `M${from.right} ${from.y} L${to.left} ${to.y}`,
          arrow: `M${to.left - 7} ${to.y - 4} L${to.left - 2} ${to.y} L${to.left - 7} ${to.y + 4}`,
          labelX: midX, labelY: from.y + 18 });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    [node, source, destination].forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <DemoFrame title="本地存储 · AI 直连">
    <div ref={scene} className={`demo-privacy${connected ? ' is-connected' : ''}`}>
      <div className="privacy-source">
        <strong className="privacy-source-title">本地浏览器</strong>
        <div className="privacy-source-data">
          <div className="privacy-data-item"><span className="privacy-document-symbol" aria-hidden="true"><i /><i /><i /></span><span><strong>简历内容</strong><i className="privacy-mini-lines" aria-hidden="true" /></span></div>
          <div className="privacy-data-item"><svg className="privacy-key-symbol" viewBox="0 0 44 44" aria-hidden="true"><circle cx="15" cy="15" r="8" /><path d="M21 21 36 36 M28 28 l5 -5 M32 32 l5 -5" /><circle cx="13" cy="13" r="1" /></svg><span><strong>API Key</strong><small aria-label="已隐藏的密钥">•••• ••••</small></span></div>
        </div>
        <span className="privacy-no-sync"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M7 21 H6 A4.5 4.5 0 0 1 5 12 A6 6 0 0 1 16 8 A4.5 4.5 0 0 1 23 13 A4 4 0 0 1 22 21 H17 M4 25 25 4" /></svg>无云端同步</span>
      </div>
      <div className="privacy-paths" role="img" aria-label="本地浏览器直连 AI 供应商，不经过本站中转">
        <svg viewBox={`0 0 ${routes.width} ${routes.height}`} aria-hidden="true">
          <path className="privacy-direct-track" d={routes.direct} />
          <path className="privacy-direct-flow" pathLength="1" d={routes.direct} />
          <path className="privacy-direct-arrow" d={routes.arrow} />
          {routes.direct && <circle className="privacy-direct-packet" r="3" style={{ offsetPath: `path("${routes.direct}")` }} />}
        </svg>
        <span className="privacy-direct-label" style={{ left: routes.labelX, top: routes.labelY }}><strong><InkCheck />不经本站中转</strong></span>
      </div>
      <button type="button" className="privacy-destination" onClick={onConnect} aria-label="演示浏览器直连模型" aria-pressed={connected}>
        <span className="privacy-destination-icon"><PrivacyServerIcon /></span><strong>AI 供应商</strong>
      </button>
    </div>
  </DemoFrame>;
}

// Each demo uses the same reading beat and replay envelope. The final phase
// includes its settling motion, followed by four seconds of a stable result.
const demoPace = { reading: 2800, resultHold: 4000, fadeOut: 600, hiddenReset: 150 };
const withReplay = (steps: number[], settling: number) => [
  ...steps, settling + demoPace.resultHold, demoPace.fadeOut, demoPace.hiddenReset,
];
const demoTimings = [
  withReplay(archiveCards.slice(0, -1).map(() => demoPace.reading), 1000),
  withReplay([demoPace.reading + 1000], 1600),
  withReplay([demoPace.reading, 2200, demoPace.reading, 2200, demoPace.reading + 1200], 850),
  withReplay([demoPace.reading, 1200, 2800], 1700),
  withReplay([demoPace.reading], 2100),
];
const demoNames = ['经历归档', '岗位版本', 'AI 润色', '智能一页', '本地保存'];

function DesktopLandingDemo({ kind }: { kind: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [variantReducedStep, setVariantReducedStep] = useState(0);
  const [privacyReducedStep, setPrivacyReducedStep] = useState(1);
  const [aiReducedStep, setAiReducedStep] = useState<number | null>(null);
  const [aiAccepted, setAiAccepted] = useState<{ cycle: number; style: DemoAiStyle } | null>(null);
  const [archiveSelection, setArchiveSelection] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState({ step: 0, cycle: 0 });
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window));
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clock = useRef({ phase: '', remaining: 0 });
  const finalStep = demoTimings[kind].length - 1;
  const lastContentStep = finalStep - 2;
  const playing = visible && pageVisible && !reducedMotion;
  const step = reducedMotion ? (kind === 0 ? archiveSelection ?? 0 : kind === 1 ? variantReducedStep : kind === 2 ? aiReducedStep ?? lastContentStep : kind === 4 ? privacyReducedStep : lastContentStep) : playhead.step;
  const resetting = step === finalStep;
  const restarting = step > lastContentStep;
  const contentStep = resetting ? 0 : Math.min(step, lastContentStep);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(query.matches);
    const updatePage = () => setPageVisible(!document.hidden);
    query.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updatePage);
    return () => {
      query.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updatePage);
    };
  }, []);

  useEffect(() => {
    const node = container.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting && entry.intersectionRatio >= .25;
      setVisible(inView);
    }, { threshold: .25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const phase = `${kind}:${playhead.cycle}:${playhead.step}`;
    if (clock.current.phase !== phase) {
      clock.current = { phase, remaining: demoTimings[kind][playhead.step] };
    }
    if (!playing) return;
    const began = performance.now();
    const timer = window.setTimeout(() => {
      setPlayhead(current => current.step === finalStep
        ? { step: 0, cycle: current.cycle + 1 }
        : { ...current, step: current.step + 1 });
    }, clock.current.remaining);
    return () => {
      window.clearTimeout(timer);
      clock.current.remaining = Math.max(0, clock.current.remaining - (performance.now() - began));
    };
  }, [playing, playhead, finalStep, kind]);

  const selectArchive = (index: number) => {
    setArchiveSelection(index);
    clock.current.phase = '';
    setPlayhead(current => ({ ...current, step: index }));
  };

  const selectVariant = (job: number) => {
    clock.current.phase = '';
    setVariantReducedStep(job);
    setPlayhead(current => ({ ...current, step: job }));
  };

  const selectAiStyle = (style: DemoAiStyle) => {
    clock.current.phase = '';
    setAiAccepted(null);
    setAiReducedStep(style === 'concise' ? 2 : 4);
    setPlayhead(current => ({ ...current, step: style === 'concise' ? 1 : 3 }));
  };
  const adoptAiSuggestion = (style: DemoAiStyle) => {
    clock.current.phase = '';
    setAiAccepted({ cycle: playhead.cycle, style });
    setAiReducedStep(5);
    setPlayhead(current => ({ ...current, step: 5 }));
  };

  const connectPrivacyDemo = () => {
    setPrivacyReducedStep(1);
    clock.current.phase = '';
    setPlayhead(current => ({ ...current, step: 1 }));
  };

  return <div className={`demo-player demo-fade-replay${playing ? ' is-playing' : ''}${restarting ? ' is-restarting' : ''}${resetting ? ' is-resetting' : ''}`} ref={container} style={{ '--demo-replay-fade': `${demoPace.fadeOut}ms` } as CSSProperties} aria-label={`${demoNames[kind]}功能演示`} data-step={step} data-cycle={playhead.cycle}>
    <div className="demo-cycle">
      {kind === 0 ? <ArchiveDemo step={contentStep} onSelect={selectArchive} /> : kind === 1 ? <VariantDemo step={contentStep} onSelect={selectVariant} /> : kind === 2 ? <AiDemo step={contentStep} acceptedStyle={aiAccepted?.cycle === playhead.cycle ? aiAccepted.style : undefined} onStyleChange={selectAiStyle} onAdopt={adoptAiSuggestion} /> : kind === 3 ? <LayoutDemo step={contentStep} /> : <PrivacyDemo step={contentStep} onConnect={connectPrivacyDemo} />}
    </div>
  </div>;
}

// Mount only one player so hidden desktop timers do not run on phones.
export function LandingDemo({ kind }: { kind: number }) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile ? <MobileLandingDemo kind={kind} renderLayout={step => <LayoutDemo step={step} />} /> : <DesktopLandingDemo kind={kind} />;
}
