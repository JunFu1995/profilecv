/**
 * JD 关键词覆盖度：启发式，不是真实 ATS 的打分。
 * 三条来源：内置技术词表 + 英文术语 token + JD 里重复出现的中文二字词。
 */

export const TECH_TERMS = [
  // 语言
  'Java', 'Go', 'Python', 'C++', 'C#', 'C语言', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'JavaScript', 'TypeScript', 'Scala', 'SQL', 'Shell', 'R语言', 'MATLAB', 'Perl', 'Lua',
  // 框架 / 中间件
  'Spring', 'Spring Boot', 'Spring Cloud', 'MyBatis', 'Hibernate', 'Netty', 'Dubbo',
  'Django', 'Flask', 'FastAPI', 'Tornado', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
  'jQuery', 'Webpack', 'Vite', 'gRPC', 'Thrift', 'RESTful',
  'MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'Redis', 'MongoDB', 'Memcached',
  'Elasticsearch', 'Kafka', 'RabbitMQ', 'RocketMQ', 'ActiveMQ', 'ClickHouse', 'HBase',
  'Hive', 'Spark', 'Flink', 'Hadoop', 'Presto', 'Doris', 'ZooKeeper', 'Nginx', 'Tomcat',
  // 基础设施 / 工程
  'Docker', 'Kubernetes', 'K8s', 'CI/CD', 'Jenkins', 'GitLab', 'Git', 'Linux', 'Unix',
  'AWS', 'Azure', 'GCP', '阿里云', '腾讯云', '华为云', 'Serverless', 'Prometheus', 'Grafana',
  'OpenTelemetry', 'SkyWalking', 'ELK', 'Sentry', 'Ansible', 'Terraform',
  // 概念 / 能力
  '微服务', '分布式', '高并发', '高可用', '高性能', '可观测性', '性能优化', '性能调优',
  '缓存', '消息队列', '分库分表', '读写分离', '限流', '熔断', '降级', '幂等', '事务',
  '数据库', '索引优化', '架构设计', '领域驱动', 'DDD', '中台', '服务治理', '链路追踪',
  '监控', '告警', '容器化', '云原生', '灰度发布', '单元测试', '代码评审', '重构',
  // 数据 / 算法
  '机器学习', '深度学习', '推荐系统', '搜索', '自然语言处理', 'NLP', '计算机视觉',
  '数据仓库', '数据湖', '数据挖掘', '数据分析', '数据治理', 'ETL', '实时计算', '流式计算',
  'A/B 测试', '埋点', '指标体系', '用户画像', '特征工程', '模型训练',
  // 业务 / 通用
  '项目管理', '团队管理', '跨部门协作', '需求分析', '产品设计', '用户增长', '数据驱动',
  '支付', '清算', '交易', '风控', '对账', '结算', '营销', '供应链', '库存', '订单',
  'SaaS', 'CRM', 'ERP', 'B 端', 'C 端', '增长', '转化率', '留存',
];

const EN_STOP = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'was', 'were', 'will', 'would',
  'have', 'has', 'had', 'this', 'that', 'these', 'those', 'from', 'not', 'but', 'all', 'can',
  'could', 'should', 'may', 'might', 'must', 'use', 'using', 'used', 'able', 'etc', 'work',
  'works', 'working', 'team', 'teams', 'year', 'years', 'strong', 'good', 'plus', 'new',
  'job', 'role', 'company', 'position', 'candidate', 'require', 'required', 'requirement',
  'responsibility', 'responsibilities', 'preferred', 'nice', 'have', 'who', 'what', 'when',
  'where', 'why', 'how', 'more', 'than', 'about', 'into', 'over', 'such', 'also', 'well',
]);

const CN_STOP = new Set([
  '我们', '你们', '他们', '以及', '或者', '并且', '同时', '以及', '如果', '因为', '所以',
  '但是', '而且', '然后', '其中', '以上', '以下', '之间', '相关', '有关', '方面', '情况',
  '工作', '要求', '职责', '岗位', '公司', '团队', '能力', '经验', '优先', '熟悉', '了解',
  '掌握', '具备', '具有', '负责', '参与', '完成', '进行', '能够', '可以', '根据', '通过',
  '本科', '硕士', '博士', '学历', '专业', '方向', '业务', '系统', '平台', '项目', '产品',
  '设计', '开发', '建设', '优化', '支持', '推动', '落地', '实践', '者优先', '以上学历',
  '工作经验', '良好', '优秀', '一定', '较强', '扎实', '至少', '包括', '例如', '其他',
]);

/** 出现在词首/词尾基本不构成名词的字，用来过滤无意义二字组合。 */
const FUNC_CHARS = new Set(
  '的了和与及或并按对为在是有无不都也很就等把被从到于以及其这那哪个们我你他她它上下来去说要做使让给向只能会可'.split(
    '',
  ),
);

export interface KeywordHit {
  /** 小写归一化后的比较键 */
  term: string;
  /** 展示用的原始写法（沿用词表或 JD 里的拼写） */
  display: string;
  count: number;
  inResume: boolean;
}

interface TermInfo {
  count: number;
  display: string;
}

export interface MatchReport {
  total: number;
  matched: number;
  ratio: number;
  missing: KeywordHit[];
  present: KeywordHit[];
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 英文用词边界，避免 Java 命中 JavaScript；中文直接子串。 */
function containsTerm(haystack: string, term: string): boolean {
  if (/[a-z]/i.test(term)) {
    const re = new RegExp(`(^|[^a-z0-9+#])${escapeRe(term)}([^a-z0-9+#]|$)`, 'i');
    return re.test(haystack);
  }
  return haystack.includes(term);
}

export function extractKeywords(jd: string): Map<string, TermInfo> {
  const text = jd.toLowerCase();
  const terms = new Map<string, TermInfo>();
  // display 只在首次登记时写入：词表的正规写法优先于 JD 里的小写写法
  const bump = (key: string, display: string, weight = 1) => {
    const cur = terms.get(key);
    if (cur) cur.count += weight;
    else terms.set(key, { count: weight, display });
  };

  // 1) 内置词表：命中即计，权重高一些
  const lexiconHits: string[] = [];
  for (const raw of TECH_TERMS) {
    const term = raw.toLowerCase();
    if (containsTerm(text, term)) {
      lexiconHits.push(term);
      bump(term, raw, 2);
    }
  }

  // 2) 英文/技术 token：兜住词表里没有的术语，保留 JD 里的原始大小写
  for (const m of jd.matchAll(/[A-Za-z][A-Za-z0-9+#.\-]{1,}/g)) {
    const display = m[0].replace(/[.\-]+$/, '');
    const term = display.toLowerCase();
    if (term.length < 2 || EN_STOP.has(term) || /^\d+$/.test(term)) continue;
    if (!terms.has(term) && lexiconHits.some(hit => containsTerm(hit, term))) continue;
    bump(term, display);
  }

  // 3) 中文二字词：只保留在 JD 里重复出现的，且过滤虚词和无意义组合
  const segments = text.replace(/[^\u4e00-\u9fa5]+/g, ' ').split(/\s+/);
  const bigrams = new Map<string, number>();
  for (const seg of segments) {
    if (seg.length < 2) continue;
    for (let i = 0; i + 2 <= seg.length; i++) {
      const g = seg.slice(i, i + 2);
      if (CN_STOP.has(g)) continue;
      if (FUNC_CHARS.has(g[0]) || FUNC_CHARS.has(g[1])) continue;
      bigrams.set(g, (bigrams.get(g) ?? 0) + 1);
    }
  }
  for (const [g, c] of bigrams) {
    if (c < 2) continue;
    // 已经被词表里的长词覆盖（如「高并发」里的「并发」）就不重复列
    if (lexiconHits.some((t) => t !== g && t.includes(g))) continue;
    if (terms.has(g)) continue;
    bump(g, g, c);
  }

  return terms;
}

export function analyzeJd(jd: string, resumeText: string): MatchReport {
  const terms = extractKeywords(jd);
  const haystack = resumeText.toLowerCase();
  const hits: KeywordHit[] = [];

  for (const [term, info] of terms) {
    hits.push({ term, display: info.display, count: info.count, inResume: containsTerm(haystack, term) });
  }

  const byWeight = (a: KeywordHit, b: KeywordHit) => b.count - a.count || b.display.length - a.display.length;
  const present = hits.filter((h) => h.inResume).sort(byWeight);
  const missing = hits.filter((h) => !h.inResume).sort(byWeight);
  const total = hits.length;

  return {
    total,
    matched: present.length,
    ratio: total === 0 ? 0 : present.length / total,
    missing,
    present,
  };
}

export interface TextScore {
  hits: number;
  terms: string[];
}

/**
 * 给一组文本按"命中多少个 JD 关键词"打分。
 * 用的是和覆盖率检查完全相同的词表和匹配规则，所以两个数字不会打架。
 */
export function scoreTexts(jd: string, texts: { id: string; text: string }[]): Map<string, TextScore> {
  const terms = extractKeywords(jd);
  const out = new Map<string, TextScore>();

  for (const item of texts) {
    const haystack = item.text.toLowerCase();
    const hit: string[] = [];
    for (const [term, info] of terms) {
      if (containsTerm(haystack, term)) hit.push(info.display);
    }
    out.set(item.id, { hits: hit.length, terms: hit });
  }
  return out;
}
