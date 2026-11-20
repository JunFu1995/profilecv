export type TemplateId = 'classic' | 'centered' | 'editorial' | 'serif';

export interface TemplateDef {
  id: TemplateId;
  name: string;
  desc: string;
}

export const TEMPLATES: TemplateDef[] = [
  { id: 'classic', name: '经典', desc: '标题带横线，最稳妥' },
  { id: 'centered', name: '雅致', desc: '姓名、职位和联系方式居中，正文沿用经典排版' },
  { id: 'editorial', name: '侧标题', desc: '左侧章节索引，右侧经历正文，层次清晰' },
  { id: 'serif', name: '衬线', desc: '宋体 / Georgia，偏学术' },
];

export const isTemplateId = (value: unknown): value is TemplateId =>
  typeof value === 'string' && TEMPLATES.some((t) => t.id === value);

/** 已下架版式回退到经典，保留内容及字号等设置。 */
export const normalizeTemplate = (value: unknown): TemplateId => isTemplateId(value) ? value : 'classic';
