import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LandingDemo } from './LandingDemos';
const heroPortrait = new URL('./assets/hangzhou-west-lake-mobile.webp', import.meta.url).href;
const heroLandscape = new URL('./assets/hangzhou-west-lake-watercolor.webp', import.meta.url).href;

const ARCHIVE = '/archive';

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="landing-arrow">{diagonal ? '↗' : '→'}</span>;
}

const questions = [
  { q: '要注册才能开始吗？', a: '无需注册。打开即可整理档案、制作简历，数据保存在当前浏览器。' },
  { q: '已有简历能导入吗？', a: '可以。支持文字版 PDF、DOCX、TXT 和 Markdown，也能恢复 Profile CV 导出的备份文件（JSON）。扫描版 PDF 暂不支持文字识别。' },
  { q: '必须使用 AI 吗？', a: '不需要。整理档案、制作简历和导出 PDF 均可独立完成。使用 AI 时，需配置模型接口和 API Key。' },
  { q: 'AI 会自动改动我的内容吗？', a: '不会。润色或翻译由你发起，相关内容直发你配置的 AI 供应商。建议经你确认后才会采用。' },
  { q: '一定能排进一页吗？', a: '智能一页会调整字号与间距，不删改文字。为避免字号过小，自动压缩设有下限；内容较多时，仍需精简或分多页呈现。' },
  { q: '档案怎么备份、换设备？', a: '导出备份文件（JSON），再到另一设备或浏览器导入即可。档案不支持云端同步；清除网站数据可能导致档案丢失，建议定期备份。' },
  { q: '导出的 PDF 能复制文字吗？', a: '可以。点击「导出 PDF」，在浏览器打印对话框中选择「另存为 PDF」，保存后的文字可选中、复制。' },
];

const features = [
  {
    id: 'feature-archive',
    label: '01 / 档案库',
    title: ['经历归档', '随时取用'],
    description: '从工作成果到科研论文，分类记录，持续积累。',
  },
  {
    id: 'feature-resumes',
    label: '02 / 岗位简历',
    title: ['一岗一版', '突出重点'],
    description: '按岗位要求调整经历与顺序，分别保存为简历版本。',
  },
  {
    id: 'feature-ai',
    label: '03 / AI 辅助',
    title: ['梳理成果', '打磨表达'],
    description: '按 STAR 理清经历，自选润色风格，确认后采用。',
  },
  {
    id: 'feature-layout',
    label: '04 / 智能一页',
    title: ['专注内容', '轻松排版'],
    description: '自动适配字号与间距，不删改文字，预览后导出 PDF。',
  },
  {
    id: 'privacy',
    label: '05 / 数据与隐私',
    title: ['本地保存', '安全为先'],
    description: '直连 AI 供应商，减少中转暴露，保护内容与密钥安全。',
  },
];

export default function Landing() {
  const [headerScrolled, setHeaderScrolled] = useState(() => window.scrollY > 24);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const featureMenu = useRef<HTMLDetailsElement>(null);
  const hoverCloseTimer = useRef<number | undefined>(undefined);
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    const ready = () => { if (!cancelled) setHeroReady(true); };
    // Release the page on a failed/stalled request; never leave an opening overlay stuck.
    const fallback = window.setTimeout(ready, 5000);
    image.fetchPriority = 'high';
    image.onload = () => { void image.decode().catch(() => undefined).then(ready); };
    image.onerror = ready;
    image.src = window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches ? heroPortrait : heroLandscape;
    return () => { cancelled = true; window.clearTimeout(fallback); image.onload = null; image.onerror = null; };
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (featureMenu.current && !featureMenu.current.contains(event.target as Node)) featureMenu.current.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => { document.removeEventListener('pointerdown', closeOutside); window.clearTimeout(hoverCloseTimer.current); };
  }, []);

  useEffect(() => {
    document.title = 'Profile CV · 一份职业档案，多份岗位简历';
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches || !('IntersectionObserver' in window)) return;

    const sections = document.querySelectorAll<HTMLElement>('.landing-reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.documentElement.classList.add('landing-motion-ready');
    sections.forEach((section) => observer.observe(section));
    const revealInView = () => {
      sections.forEach((section) => {
        if (section.classList.contains('is-visible')) return;
        const { top, bottom } = section.getBoundingClientRect();
        if (top < window.innerHeight * 0.9 && bottom > 0) {
          section.classList.add('is-visible');
          observer.unobserve(section);
        }
      });
    };
    revealInView();
    window.addEventListener('scroll', revealInView, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', revealInView);
      document.documentElement.classList.remove('landing-motion-ready');
    };
  }, []);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.landing-header');
    const targets = ['features', ...features.map(feature => feature.id), 'faq'].map(id => ({ id, element: document.getElementById(id) }));
    const updateProgress = () => {
      setHeaderScrolled(window.scrollY > 24);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      document.documentElement.style.setProperty('--landing-scroll-progress', `${Math.min(100, Math.max(0, progress))}%`);

      // Match the anchor's header clearance, without counting reveal transforms.
      const readingPosition = window.scrollY + (header?.offsetHeight ?? 74) + 25;
      let current: string | null = null;
      for (const target of targets) {
        if (!target.element) continue;
        let sectionTop = 0;
        for (let element: HTMLElement | null = target.element; element; element = element.offsetParent as HTMLElement | null) {
          sectionTop += element.offsetTop;
        }
        if (sectionTop <= readingPosition) current = target.id;
      }
      // The last section may not reach the header when the footer is short.
      if (scrollable > 0 && window.scrollY >= scrollable - 2) current = 'faq';
      setActiveSection(current);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
      document.documentElement.style.removeProperty('--landing-scroll-progress');
    };
  }, []);

  return <div className={`landing-root landing-storybook${heroReady ? '' : ' landing-hero-pending'}`} >
    <div className="landing-opening" aria-hidden="true">
      <span className="landing-opening-title"><span className="landing-opening-breath">Profile CV<span className="landing-opening-period">.</span></span></span>
    </div>
    <header className={`landing-header${headerScrolled ? ' is-scrolled' : ''}`}>
      <a href="#top" className="landing-logo" aria-label="Profile CV，返回顶部">
        <img className="landing-logo-mark" src="/brand-mark.svg" width="36" height="40" alt="" />
        <span>Profile CV</span>
      </a>
      <nav className="landing-nav" aria-label="首页导航">
        <details className="landing-feature-menu" ref={featureMenu}
          onPointerEnter={event => {
            window.clearTimeout(hoverCloseTimer.current);
            if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) event.currentTarget.open = true;
          }}
          onPointerLeave={event => {
            if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
            hoverCloseTimer.current = window.setTimeout(() => {
              if (featureMenu.current && !featureMenu.current.contains(document.activeElement)) featureMenu.current.open = false;
            }, 180);
          }}
          onKeyDown={event => {
            if (event.key === 'Tab') {
              window.setTimeout(() => {
                if (featureMenu.current && !featureMenu.current.contains(document.activeElement)) featureMenu.current.open = false;
              }, 0);
            }
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}>
          <summary aria-current={activeSection && activeSection !== 'faq' ? 'location' : undefined}>产品功能 <svg className="landing-menu-chevron" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
          <ul className="landing-feature-links" aria-label="产品功能列表">
            {features.map((feature, index) => <li key={feature.id}>
              <a href={`#${feature.id}`} aria-current={activeSection === feature.id ? 'location' : undefined}
                onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  if (featureMenu.current) featureMenu.current.open = false;
                  const target = document.getElementById(feature.id);
                  if (!target) return;
                  // Reveal transforms must not shift the anchor's final resting position.
                  let top = 0;
                  for (let element: HTMLElement | null = target; element; element = element.offsetParent as HTMLElement | null) top += element.offsetTop;
                  if (window.location.hash !== `#${feature.id}`) window.history.pushState(null, '', `#${feature.id}`);
                  target.focus({ preventScroll: true });
                  window.scrollTo({ top: top - parseFloat(getComputedStyle(target).scrollMarginTop) });
                }}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{feature.label.split(' / ')[1]}</a>
            </li>)}
          </ul>
        </details>
        <a href="#faq" aria-current={activeSection === 'faq' ? 'location' : undefined}>常见问题</a>
      </nav>
      <a className="landing-header-cta landing-button landing-button-dark" href={ARCHIVE}>开始整理档案 <Arrow diagonal /></a>
    </header>

    <main id="top">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-art" aria-hidden="true">
          <div className="landing-city-scene" />
        </div>
        <a className="landing-scroll-cue" href="#features" aria-label="向下浏览产品能力">
          <span>向下探索</span>
          <svg viewBox="0 0 40 62" fill="none" aria-hidden="true">
            <path d="M20 5 C18 17 23 32 20 52 M8 40 Q15 45 20 53 Q24 46 33 39" />
            <path className="landing-scroll-echo" d="M22 9 Q24 29 22 44 M9 43 Q15 49 19 54" />
          </svg>
        </a>
        <div className="landing-hero-copy">
          <h1 id="hero-title" aria-label="Compound Your Experience"><span className="landing-headline" aria-hidden="true">
            {['Compound', 'Your', 'Experience'].map((word, wordIndex) => <span key={word} className="landing-ink-word" style={{ '--word-delay': `${1.3 + wordIndex * .22}s`, '--underline-delay': `${1.64 + wordIndex * .22}s` } as CSSProperties}>
              <span className="landing-ink-text">{word}</span>
              {word === 'Compound' &&
            <svg className="landing-word-underline" viewBox="0 0 320 34" preserveAspectRatio="none" aria-hidden="true">
              <path className="landing-underline-stroke" d="M3 20 C35 13 73 12 108 10 C155 7 204 6 246 9 C272 10 299 13 316 17 C287 15 268 15 244 14 C199 11 156 13 109 16 C73 18 36 19 5 24 L15 20 Z" />
              <path className="landing-underline-echo" d="M28 29 C76 22 122 21 173 21 C215 20 253 21 282 24 C240 23 207 24 172 25 C116 24 73 27 28 30 Z" />
            </svg>}
            </span>)}
          </span></h1>
          <p className="landing-hero-description">一份职业档案，多份岗位简历。</p>
        </div>
      </section>

      <section className="landing-intro landing-reveal" id="features">
        <div className="landing-section-index">产品能力</div>
        <div><h2>每次投递，<br /><em>不必从零开始。</em></h2><p>经历持续积累，简历按岗组合。把准备过的内容，用在下一次机会。</p></div>
      </section>

      <section className="landing-feature-flow" aria-label="详细功能">
        {features.map((feature, index) => <article className={`landing-detail landing-reveal${index % 2 ? ' landing-detail-reverse' : ''}`} id={feature.id} tabIndex={-1} key={feature.label}>
          <div className="landing-detail-inner">
            <div className="landing-detail-copy">
              <span className="landing-detail-label">{feature.label}</span>
              <h3><span>{feature.title[0]}，</span><em>{feature.title[1]}</em></h3>
              <hr className="landing-detail-rule" />
              <p>{feature.description}</p>
            </div>
            <div className="landing-detail-image"><LandingDemo kind={index} /></div>
          </div>
        </article>)}
      </section>

      <section className="landing-faq landing-reveal" id="faq" aria-labelledby="faq-title"><div className="landing-faq-main"><h2 id="faq-title">常见问题</h2><p className="landing-faq-intro">导入、AI 与数据保存，常见问题在这里。</p><div className="landing-questions">{questions.map(({ q, a }) => <details key={q} name="landing-faq"><summary>{q}<span aria-hidden="true">＋</span></summary><p>{a}</p></details>)}</div></div></section>

    </main>

    <footer className="landing-footer"><a className="landing-logo" href="#top" aria-label="Profile CV，返回顶部"><img className="landing-logo-mark" src="/brand-mark.svg" width="36" height="40" alt="" /><span>Profile CV</span></a><p>经历有归处，投递有方向。</p><span>© {new Date().getFullYear()} Profile CV</span></footer>
  </div>;
}
