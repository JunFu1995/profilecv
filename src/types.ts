/** 单条要点。稳定 id 是版本管理“引用而非复制”的前提。 */
export interface Bullet {
  id: string;
  text: string;
}

/**
 * 合成稿：把 STAR 四段改写成可直接放进简历的形态。
 * 总结默认以段落呈现，也可切换分条；STAR 原始字段独立保留。
 */
export interface Composed {
  mode: 'paragraph' | 'bullets';
  /** mode = paragraph 时使用 */
  text: string;
  /** mode = bullets 时使用 */
  bullets: Bullet[];
  /** 生成时的 STAR 指纹，用于提示“原内容改过了，合成稿可能过时” */
  sourceHash: string;
}

/** 项目：STAR 保存原始事实，总结保存或派生简历正文。 */
export interface Project {
  id: string;
  name: string;
  role: string;
  start: string;
  end: string;
  /** 技术栈，也参与关键词匹配 */
  stack: string;
  /** S：为什么做、当时的处境 */
  situation: string;
  /** T：要达成什么 */
  task: string;
  /** A：我做了什么 */
  actions: Bullet[];
  /** R：结果，尽量量化 */
  results: Bullet[];
  /** 简历展示内容；未设置时保持总结展示。 */
  display?: 'summary' | 'star';
  /** 已编辑的项目总结；没有时从 STAR 派生。 */
  composed?: Composed;
}

/** 一段工作：公司层面只有一个，项目挂在下面。 */
export interface WorkEntry {
  publicationIds?: string[];
  summaryOnly?: boolean;
  /** 科研简历正文；原始总结、要点及 STAR 保留用于核对。 */
  researchDraft?: Composed;
  researchDisplay?: 'summary' | 'star';
  star?: {situation:string;task:string;action:string;result:string};
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  /** 团队 / 职级等补充信息 */
  detail: string;
  /** 职位层面的职责与整体成果，不写项目细节 */
  bullets: Bullet[];
  /** 一句话概述：研究/工作方向的整体判断，可选 */
  summary?: string;
  projects: Project[];
}

/** 教育经历仍用通用结构。 */
export interface BulletGroup {
  degree?: string;
  id: string;
  /** 公司 / 项目名 / 学校 */
  org: string;
  /** 职位 / 项目角色 / 学历专业 */
  role: string;
  start: string;
  end: string;
  location: string;
  /** 第二条副信息：GPA、技术栈、团队规模等 */
  detail: string;
  bullets: Bullet[];
}

export interface SkillGroup {
  id: string;
  label: string;
  value: string;
}

export interface LinkItem {
  id: string;
  label: string;
  url: string;
}

export interface Basics {
  name: string;
  /** 个人照片（data URL，已压缩到 ~50KB） */
  photo?: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  links: LinkItem[];
  summary: string;
}

/** 素材库：长期积累的全部真实经历，不随某次投递变化。 */
export interface CustomMaterialCategory {
  titleLabel?: string; bodyLabel?: string; bodyHint?: string;
  id: string; name: string; fields: {id:string;label:string}[];
  items: {id:string;title:string;body:string;values:Record<string,string>}[];
}

export interface Master {
  trashItems?: import('./materialItemsTrash').MaterialTrashItem[];
  customCategories?: CustomMaterialCategory[];
  categoryNames?: Record<string,string>;
  categoryOrder?: string[];
  hiddenCategories?: string[];
  basics: Basics;
  work: WorkEntry[];
  /** 科研经历：结构和 WorkEntry 同构 */
  research: WorkEntry[];
  publications: Publication[];
  /** 不属于任何公司的项目：开源、个人作品、竞赛 */
  sideProjects: Project[];
  education: BulletGroup[];
  skills: SkillGroup[];
}

/** 渲染用：项目带上所属公司，工作条目不再带项目（避免和工作经历重复）。 */
export interface ProjectView extends Project {
  workId?: string;
  company: string;
}

export interface ResumeView {
  customCategories?: CustomMaterialCategory[];
  basics: Basics;
  work: WorkEntry[];
  research: WorkEntry[];
  publications: Publication[];
  projects: ProjectView[];
  education: BulletGroup[];
  skills: SkillGroup[];
}

export type SectionKey = 'work' | 'projects' | 'research' | 'education';

export type PublicationStatus = 'published' | 'accepted' | 'review' | 'preprint' | 'unknown';

/** 作者位次：学术简历里这是硬通货，必须显式标注而不是从作者串里猜。 */
export type AuthorPosition = 'first' | 'co-first' | 'corresponding' | 'other';

export interface Publication {
  venueShort?: string;
  level?: string;
  id: string;
  authors: string;
  /** 需要加粗的作者名（通常是自己）；留空则不加粗 */
  highlight: string;
  title: string;
  /** 期刊或会议全称 */
  venue: string;
  year: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  status: PublicationStatus;
  selfPosition: AuthorPosition;
  /** 分区、影响因子等自由补充，不内置口径 */
  note: string;
  /** 摘要：可从 Crossref 抓，也可以手填，用来生成科研经历要点 */
  abstract?: string;
}

/** 版本里对某条要点的引用；text 有值表示这一版改过措辞，不动素材库原文。 */
export interface PickedBullet {
  bulletId: string;
  text?: string;
}

/** 版本里对某段经历的引用：决定这段经历是否出现、要点排序、要点取舍。 */
export interface PickedGroup {
  groupId: string;
  bullets: PickedBullet[];
}

export interface JobPosting {
  id: string; company: string; role: string; jdText: string; url: string; note: string; updatedAt: string;
}

export interface JobTarget {
  jobId?: string;
  company: string;
  role: string;
  /** 原始 JD 文本，留给 P2 做关键词覆盖度 */
  jdText: string;
  keywords: string[];
}

/** 投递版本：一次投递的取舍结果。所有内容都是对 Master 的引用。 */
export interface Variant {
  /** Selected custom/template material entries, ordered by category and item. Absent in older versions = none. */
  custom?: {categoryId:string;itemIds:string[]}[];
  /** 当前版本独立编辑的内容，绝不写回素材库。 */
  content?: Master;
  /** 移除后保留本版本的改写，重新选入时恢复。 */
  retainedTexts?: Record<string, string>;
  /** 独立排版；旧存档读取时从原全局设置迁移。 */
  layout?: import('./variantLayout').VariantLayout;
  id: string;
  name: string;
  createdAt: string;
  jobTarget: JobTarget;
  /** 针对本版本改写的简介；留空则用素材库的简介 */
  summary: string;
  work: PickedGroup[];
  projects: PickedGroup[];
  research: PickedGroup[];
  education: PickedGroup[];
  /** 论文整篇选，不拆要点 */
  publications: string[];
  skills: string[];
}

export interface Theme {
  accent: string;
}

export type Locale = 'zh' | 'en';

export type { TemplateId } from './templates';

/** 译文缓存：按原文内容寻址，同一句话只翻一次。 */
export interface TranslationEntry {
  src: string;
  en: string;
  /** 人工改过：自动翻译不会再覆盖它 */
  manual?: boolean;
  /** AI 在人工译文基础上润色过 */
  polished?: boolean;
  /** 润色前的版本，用于「撤回润色」 */
  previous?: string;
}

export interface Doc {
  version: 3;
  /** 简历呈现语言（章节标题、AI 输出语言），不影响界面语言 */
  locale: Locale;
  /** 内容译文缓存：key = 原文的指纹，value 里带 src 用来防哈希碰撞 */
  translations: Record<string, TranslationEntry>;
  /** 自动排版缩放：1 = 原始字号，0.76 = 压到最小，1.14 = 放到最大 */
  layoutScale: number;
  /** 自动排版时额外撑开的间距（px），内容偏少时用来填满页面 */
  layoutStretch: number;
  /** 版式预设 */
  template: import('./templates').TemplateId;
  master: Master;
  theme: Theme;
  variants: Variant[];
  jobs?: JobPosting[];
}
