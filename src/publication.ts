import type { Publication } from './types';

/** 卡片里实时预览的引用串。 */
export function citationPreview(p: Publication): string {
  const volume = p.volume ? `${p.volume}${p.issue ? `(${p.issue})` : ''}` : '';
  const pages = p.pages ? `: ${p.pages}` : '';
  const tail = [p.venue, [p.year, volume].filter(Boolean).join(', ')].filter(Boolean).join(', ');
  return `${p.authors || '作者'}. ${p.title || '标题'}. ${tail}${pages}.`;
}

/**
 * 科研经历的收尾句：「相关成果发表于《期刊》（级别），年份。」
 * 只用结构化字段拼，不让模型参与——级别写错是硬伤。
 */
export function outcomeLine(p: Publication): string {
  const venue = p.venue.trim();
  if (!venue) return '';

  const isCjk = /[\u4e00-\u9fa5]/.test(venue);
  const wrapped = isCjk ? `《${venue}》` : venue;
  const level = p.note.trim() ? `（${p.note.trim()}）` : '';
  const year = p.year.trim() ? `，${p.year.trim()}` : '';
  return `相关成果发表于${wrapped}${level}${year}。`;
}

/** 把发表情况并进一句话概述：概述末尾本来就是收束语气，追加一句最自然。 */
export function mergeOutcomeIntoSummary(summary: string, outcome: string): string {
  const head = summary.trim();
  const tail = outcome.trim();
  if (!tail) return head;
  if (!head) return tail;
  const closed = /[。！？.!?]$/.test(head) ? head : `${head}。`;
  return `${closed}${tail}`;
}

/** 仅使用用户填写的简称或原文中明确的缩写，不猜测会议与期刊等级。 */
export function publicationCardMeta(p:Publication):{venue:string;level:string;position:string} {
 const acronym=p.venue.match(/[（(]([A-Za-z][A-Za-z0-9 .&/-]{1,24})[）)]\s*$/)?.[1];
 const venue=p.venueShort?.trim()||acronym||(/^[A-Z][A-Z0-9 &/-]{1,19}$/.test(p.venue.trim())?p.venue.trim():'');
 const level=p.level?.trim()||p.note.match(/CCF\s*[-–]?\s*[ABC]|(?:中科院|JCR)\s*[一二三四1-4]\s*区|\bQ[1-4]\b/gi)?.join(' · ')||'';
 const position=({'first':'第一作者','co-first':'共同一作','corresponding':'通讯作者','other':''} as const)[p.selfPosition];
 return {venue,level,position};
}
