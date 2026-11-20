/** 用 Crossref 按论文标题（或 DOI）抓元数据。免费、无需 key、支持跨域。 */

export interface PaperHit {
  doi: string;
  title: string;
  authors: string;
  venue: string;
  year: string;
  volume: string;
  issue: string;
  pages: string;
  status: 'published' | 'preprint';
  abstract?: string;
}

interface CrossrefItem {
  DOI?: string;
  abstract?: string;
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  'container-title'?: string[];
  'short-container-title'?: string[];
  event?: { name?: string };
  issued?: { 'date-parts'?: number[][] };
  volume?: string;
  issue?: string;
  page?: string;
  type?: string;
}

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function toHit(item: CrossrefItem): PaperHit {
  const authors = (item.author ?? [])
    .map((a) => [a.given, a.family].filter(Boolean).join(' ') || a.name || '')
    .filter(Boolean)
    .join(', ');

  const venue =
    item['container-title']?.[0] ?? item['short-container-title']?.[0] ?? item.event?.name ?? '';
  const year = item.issued?.['date-parts']?.[0]?.[0];
  const abstract = item.abstract ? stripTags(item.abstract) : '';

  return {
    doi: item.DOI ?? '',
    title: stripTags(item.title?.[0] ?? ''),
    authors,
    venue: stripTags(venue),
    year: year ? String(year) : '',
    volume: item.volume ?? '',
    issue: item.issue ?? '',
    pages: item.page ?? '',
    status: item.type === 'posted-content' ? 'preprint' : 'published',
    ...(abstract ? { abstract } : {}),
  };
}

const normalize = (s: string): string => s.toLowerCase().replace(/[^0-9a-z\u4e00-\u9fa5]+/g, '');

/**
 * 标题相似度。中文用二字组重合率，英文用词重合率——
 * Crossref 对中文标题基本是"关键词碰运气"，不加过滤会返回一堆无关论文。
 */
function similarity(query: string, title: string): number {
  const hasCjk = /[\u4e00-\u9fa5]/.test(query);
  const t = title.toLowerCase();

  if (hasCjk) {
    const q = normalize(query);
    if (!q) return 0;
    const grams: string[] = [];
    for (let i = 0; i + 2 <= q.length; i++) grams.push(q.slice(i, i + 2));
    if (grams.length === 0) return t.includes(q) ? 1 : 0;
    return grams.filter((g) => normalize(t).includes(g)).length / grams.length;
  }

  // 英文按词比对：先分词再去掉太短的词，别把整句当成一个 token
  const tokens = query
    .toLowerCase()
    .split(/[^0-9a-z]+/)
    .filter((w) => w.length > 2);
  if (tokens.length === 0) return 0;
  return tokens.filter((w) => t.includes(w)).length / tokens.length;
}

export async function searchPapers(query: string, signal: AbortSignal): Promise<PaperHit[]> {
  const q = query.trim();
  if (!q) return [];

  const isDoi = /^10\.\d{4,9}\//.test(q);
  const url = isDoi
    ? `https://api.crossref.org/works/${encodeURIComponent(q)}`
    : `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(q)}&rows=6`;

  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error('连不上 Crossref，检查网络或稍后再试。');
  }

  if (res.status === 404) throw new Error('没有找到这篇论文的 DOI 记录。');
  if (!res.ok) throw new Error(`Crossref 返回 ${res.status}，稍后再试。`);

  const json = (await res.json()) as { message?: CrossrefItem | { items?: CrossrefItem[] } };
  const message = json.message;
  if (!message) return [];

  const items: CrossrefItem[] =
    'items' in message && Array.isArray(message.items) ? message.items : [message as CrossrefItem];

  // 按相似度过滤 + 排序：宁可空列表，也不要给用户一堆无关论文
  return items
    .map(toHit)
    .filter((h) => h.title)
    .map((h) => ({ hit: h, score: isDoi ? 1 : similarity(q, h.title) }))
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score || (b.hit.year || '').localeCompare(a.hit.year || ''))
    .map((x) => x.hit);
}

/** Crossref 的结果直接映射成论文条目。 */
export function hitToPublicationFields(hit: PaperHit) {
  return {
    authors: hit.authors,
    title: hit.title,
    venue: hit.venue,
    year: hit.year,
    volume: hit.volume,
    issue: hit.issue,
    pages: hit.pages,
    doi: hit.doi,
    status: hit.status,
  };
}

/** 按 DOI 单独取摘要（Crossref 只有部分记录带摘要）。 */
export async function fetchAbstract(doi: string, signal: AbortSignal): Promise<string> {
  if (!doi.trim()) return '';
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi.trim())}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return '';
    const json = (await res.json()) as { message?: CrossrefItem };
    return json.message?.abstract ? stripTags(json.message.abstract) : '';
  } catch {
    return '';
  }
}
