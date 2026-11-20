import type {
  Bullet,
  BulletGroup,
  Doc,
  Master,
  Project,
  Publication,
  SkillGroup,
  Variant,
  WorkEntry,
} from './types';
import { uid } from './id';
import { starFingerprint } from './ai';
import { createVariant } from './variants';
import { sampleAvatar } from './sampleAvatar';

export { uid };

export function newBullet(text = ''): Bullet {
  return { id: uid(), text };
}

export function newProject(): Project {
  return {
    id: uid(),
    name: '',
    role: '',
    start: '',
    end: '',
    stack: '',
    situation: '',
    task: '',
    actions: [],
    results: [],
  };
}

export function newWork(): WorkEntry {
  return {
    id: uid(),
    company: '',
    role: '',
    start: '',
    end: '',
    location: '',
    detail: '',
    bullets: [],
    projects: [],
  };
}

export function newEducation(): BulletGroup {
  return { id: uid(), org: '', role: '', start: '', end: '', location: '', detail: '', bullets: [] };
}

export function newPublication(): Publication {
  return {
    id: uid(),
    authors: '',
    highlight: '',
    title: '',
    venue: '',
    year: '',
    volume: '',
    issue: '',
    pages: '',
    doi: '',
    status: 'published',
    selfPosition: 'first',
    note: '',
  };
}

export function newSkill(): SkillGroup {
  return { id: uid(), label: '', value: '' };
}

export function emptyDoc(): Doc {
  return {
    version: 3,
    locale: 'zh',
    translations: {},
    layoutScale: 1,
    layoutStretch: 0,
    template: 'classic',
    theme: { accent: '#1f5f9e' },
    variants: [],
    master: {
      basics: { name: '', title: '', email: '', phone: '', city: '', links: [], summary: '' },
      work: [],
      research: [],
      publications: [],
      sideProjects: [],
      education: [],
      skills: [],
    },
  };
}

const project = (
  name: string,
  role: string,
  start: string,
  end: string,
  stack: string,
  situation: string,
  task: string,
  actions: string[],
  results: string[],
): Project => ({
  id: uid(),
  name,
  role,
  start,
  end,
  stack,
  situation,
  task,
  actions: actions.map((t) => newBullet(t)),
  results: results.map((t) => newBullet(t)),
});

/** 全部人物、机构、经历和数字均为虚构，仅用于体验与填写参考。 */
export function sampleDoc(): Doc {
  const master: Master = {
    basics: {
      name: '陈墨',
      photo: sampleAvatar,
      title: '后端开发工程师',
      email: 'chenmo@example.com',
      phone: '138-0000-0000',
      city: '杭州',
      links: [
        { id: uid(), label: '作品集', url: 'https://example.com/chenmo' },
        { id: uid(), label: '技术笔记', url: 'https://example.com/chenmo/notes' },
      ],
      summary: '计算机专业硕士，关注后端服务、检索系统与工程效率。具备 Java / Python 开发经验，完成知识库检索、预约服务和数据评测项目，习惯通过测试与指标验证改进。',
    },
    work: [
      {
        id: uid(), company: '青禾数字科技（虚构）', role: '后端开发实习生',
        start: '2026.03', end: '2026.08', location: '杭州',
        detail: '企业协作产品组 · 6 人研发团队',
        bullets: [
          newBullet('开发知识库检索与文档管理接口，交付 12 个 API，覆盖上传、检索与权限校验。'),
          newBullet('为热点查询增加 Redis 缓存，固定压测集下接口 P95 延迟由 680ms 降至 230ms。'),
          newBullet('补充 46 个接口测试并接入 CI，覆盖权限边界、重复提交与异常重试场景。'),
          newBullet('整理本地启动手册与排障清单，帮助 2 位新同学在半天内完成环境配置。'),
        ],
        projects: [
          project('团队知识库检索服务', '后端开发', '2026.04', '2026.08',
            'Java · Spring Boot · PostgreSQL · Redis',
            '团队文档分散在多个目录，关键词检索容易遗漏同义表达，客服常需反复确认资料。',
            '实现按团队权限过滤的统一检索接口，并提升常见问题的查询速度。',
            ['设计文档、分段与访问权限模型，统一检索接口与分页协议。',
             '对热门查询增加缓存与失效策略，使用 300 条固定查询进行回归压测。'],
            ['固定压测集下 P95 延迟由 680ms 降至 230ms；试用团队日均完成约 800 次查询。']),
          project('文档异步处理流水线', '后端开发', '2026.03', '2026.05',
            'Java · RabbitMQ · Docker',
            '批量上传文档时同步解析占用请求线程，用户需长时间等待上传结果。',
            '将解析与索引改为异步处理，支持进度查询及失败重试。',
            ['拆分上传、解析与入库任务，设计幂等键及任务状态流转。',
             '加入重试上限与失败队列，为超时、重复投递等异常补充测试。'],
            ['200 份文档的批量上传请求在 2 秒内返回任务编号，失败任务可单独重试。']),
        ],
      },
      {
        id: uid(), company: '拾光软件工作室（虚构）', role: '软件开发实习生',
        start: '2025.07', end: '2025.09', location: '南京',
        detail: '校园服务项目组',
        bullets: [
          newBullet('开发活动报名与签到模块，为 8 场校园活动提供名单导出和到场统计。'),
          newBullet('与设计同学梳理 5 条报名流程，补齐表单校验与重复提交提示。'),
        ],
        projects: [
          project('校园活动报名平台', '全栈开发', '2025.07', '2025.09',
            'Vue · TypeScript · Java · MySQL',
            '社团活动依赖表格收集报名，重复提交和现场核对名单占用较多时间。',
            '建立报名、审核、签到和导出的完整流程。',
            ['实现报名表单、容量限制与二维码签到，并按角色隔离管理权限。',
             '为名单导出增加筛选条件，补充空名单与重复签到场景校验。'],
            ['试用覆盖 8 场活动、约 600 人次报名，现场名单核对时间由 20 分钟缩短至 5 分钟。']),
        ],
      },
    ],
    research: [
      {
        id: uid(), company: '江南理工大学 · 智能信息实验室（虚构）', role: '硕士研究助理',
        start: '2024.09', end: '至今', location: '南京',
        detail: '导师：李明教授（虚构） · 方向：信息检索与检索增强生成',
        summary: '围绕校园知识问答研究检索质量与回答依据，重点分析文档切分、混合检索和重排序对结果的影响。',
        bullets: [
          newBullet('整理 1,200 条校园问答与文档片段，划分训练、开发和测试集并检查重复样本。'),
          newBullet('对比关键词、向量和混合检索，在固定测试集上将 Recall@5 从 71.2% 提升至 83.6%。'),
          newBullet('记录 4 组消融实验与 80 个失败案例，归纳多跳问题、时间信息和文档缺失三类误差。'),
        ],
        projects: [],
      },
    ],
    publications: [
      {
        id: uid(), authors: '陈墨, 李明, 王芳', highlight: '陈墨',
        title: '面向校园知识问答的混合检索与重排序评测',
        venue: '实验室技术报告（虚构示例）', year: '2026',
        volume: '', issue: '', pages: '', doi: '', status: 'preprint', selfPosition: 'first',
        note: '示例成果，无真实发表或收录信息',
        abstract: '构建校园知识问答评测集，比较关键词检索、向量检索和混合检索策略，并分析文档切分与重排序对检索质量的影响。',
      },
      {
        id: uid(), authors: '王芳, 陈墨, 李明', highlight: '陈墨',
        title: 'A Small-Scale Benchmark for Evidence-Grounded Campus QA',
        venue: '学生研究交流会（虚构示例）', year: '2025',
        volume: '', issue: '', pages: '', doi: '', status: 'unknown', selfPosition: 'other',
        note: '示例海报 · 负责数据整理与评测脚本',
        abstract: '通过人工检查问题与引用片段的对应关系，建立小规模问答基准并记录检索失败案例。',
      },
    ],
    sideProjects: [
      project('轻舟 · 个人阅读清单', '独立开发', '2025.10', '2026.02',
        'React · TypeScript · IndexedDB',
        '阅读链接散落在收藏夹和聊天记录中，难以追踪阅读状态与关键笔记。',
        '制作支持离线保存、标签筛选与数据导出的个人阅读工具。',
        ['实现链接收集、阅读状态与笔记编辑，使用 IndexedDB 保存本地数据。',
         '补齐键盘导航与移动端布局，提供 JSON 导入导出和重复链接检测。'],
        ['邀请 12 位同学试用 4 周，收集 28 条反馈并完成 3 轮迭代。']),
      project('校园自习室预约系统', '3 人小组负责人', '2023.10', '2024.04',
        'Java · Spring Boot · MySQL · Redis',
        '课程项目以自习室预约为场景，需要处理同一座位被同时预约的问题。',
        '完成可演示的预约、取消和签到服务，并验证并发提交时的数据一致性。',
        ['通过数据库唯一约束与事务避免重复预约，以 Redis 缓存可用座位信息。',
         '编写并发测试脚本，验证 100 个并发请求竞争同一座位时仅有一条有效预约。'],
        ['交付 16 个接口与部署文档，完成课程答辩并获校级软件作品展二等奖（虚构）。']),
    ],
    education: [
      {
        id: uid(), org: '江南理工大学（虚构）', role: '计算机技术', degree: '硕士',
        start: '2024.09', end: '2027.06', location: '南京',
        detail: '预计 2027 年 6 月毕业 · GPA 3.8/4.0',
        bullets: [newBullet('研究方向：信息检索与知识问答；课程：分布式系统、机器学习、数据库系统。')],
      },
      {
        id: uid(), org: '南川学院（虚构）', role: '软件工程', degree: '本科',
        start: '2020.09', end: '2024.06', location: '苏州',
        detail: 'GPA 3.6/4.0 · 专业前 15% · 校级奖学金 2 次',
        bullets: [newBullet('毕业设计：校园自习室预约系统；担任程序设计社团活动组织者。')],
      },
    ],
    skills: [
      { id: uid(), label: '编程语言', value: 'Java、Python、TypeScript、SQL' },
      { id: uid(), label: '后端开发', value: 'Spring Boot、PostgreSQL、MySQL、Redis、RabbitMQ' },
      { id: uid(), label: '研究与数据', value: 'PyTorch、pandas、混合检索、重排序、检索评测' },
      { id: uid(), label: '工程协作', value: 'Git、Docker、Linux、CI/CD、接口测试与技术文档' },
    ],
  };

  // 保存可直接排版的精简总结，同时保留档案中的完整 STAR 素材。
  const demo = master.work[0].projects[0];
  demo.composed = {
    mode: 'paragraph',
    text: '设计文档与团队权限模型，开发统一检索接口；引入 Redis 热点缓存与失效策略，在 300 条固定查询上将 P95 延迟由 680ms 降至 230ms，支持试用团队日均约 800 次查询。',
    bullets: [], sourceHash: starFingerprint(demo),
  };
  const campus = master.work[1].projects[0];
  campus.composed = {
    mode: 'paragraph',
    text: '开发报名、审核与二维码签到流程，补齐重复提交校验和名单导出；试用覆盖 8 场活动、约 600 人次，名单核对时间由 20 分钟缩短至 5 分钟。',
    bullets: [], sourceHash: starFingerprint(campus),
  };
  const booking = master.sideProjects[1];
  booking.composed = {
    mode: 'paragraph',
    text: '以数据库唯一约束和事务避免重复预约，使用 Redis 缓存座位状态；通过 100 个并发请求竞争同一座位的测试，交付 16 个接口与部署文档，获校级软件作品展二等奖（虚构）。',
    bullets: [], sourceHash: starFingerprint(booking),
  };

  const base = createVariant(master, '后端开发 · 校招示例');
  const variant: Variant = {
    ...base,
    summary: '2027 届计算机技术硕士，具备两段开发实习经历。熟悉 Java、Spring Boot 与关系型数据库，完成知识库检索、异步任务与校园预约项目，重视接口测试和性能验证。',
    jobTarget: {
      company: '青禾数字科技（虚构）', role: '后端开发工程师（校招）',
      jdText: [
        '岗位职责：开发企业协作产品的后端接口，维护文档检索、异步任务与权限服务。',
        '任职要求：2027 届计算机相关专业毕业生，熟悉 Java、Spring Boot、MySQL 或 PostgreSQL。',
        '了解 Redis 缓存、消息队列及常见并发问题，具备接口测试和 Linux 使用经验。',
        '有检索系统、Docker 或 CI/CD 实践经验优先。',
      ].join('\n'), keywords: [],
    },
    work: base.work.map((entry, index) => ({ ...entry, bullets: entry.bullets.slice(0, index === 0 ? 2 : 1) })),
    projects: [base.projects[0], base.projects[2], base.projects[4]],
    research: [], publications: [],
    skills: [master.skills[0].id, master.skills[1].id, master.skills[3].id],
  };
  const researchBase = createVariant(master, '检索与问答 · 科研示例');
  const researchVariant: Variant = {
    ...researchBase,
    summary: '计算机技术硕士在读，研究方向为信息检索与知识问答。具备数据整理、检索评测和错误分析经验，关注回答依据与实验可复现性。',
    jobTarget: {
      company: '智能信息实验室（虚构）', role: '信息检索研究实习生',
      jdText: '参与检索增强生成研究，整理评测数据，使用 Python 与 PyTorch 实现检索及重排序实验，记录消融实验和失败案例。',
      keywords: [],
    },
    work: [], projects: [researchBase.projects[0]],
    skills: [master.skills[0].id, master.skills[2].id, master.skills[3].id],
  };

  return {
    version: 3, locale: 'zh', translations: {}, layoutScale: 1, layoutStretch: 0,
    template: 'classic', theme: { accent: '#1f5f9e' }, master,
    variants: [variant, researchVariant],
  };
}
