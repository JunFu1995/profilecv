import type { CustomMaterialCategory, Master } from './types';
import { uid } from './id';

export interface CategoryTemplate {
  id: string;
  name: string;
  description: string;
  fields: string[];
  titleLabel: string;
  bodyLabel: string;
  bodyHint: string;
}

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  { id:'internship', name:'实习经历', description:'参照工作经历，记录职责与成果', fields:['公司','职位','开始时间','结束时间'], titleLabel:'经历标题', bodyLabel:'经历总结', bodyHint:'说明承担的职责、具体行动和实际成果。' },
  { id:'campus', name:'校园经历', description:'社团、学生工作与活动组织', fields:['组织','担任职务','开始时间','结束时间'], titleLabel:'活动 / 经历名称', bodyLabel:'经历总结', bodyHint:'说明你的职责、组织的活动和实际贡献。' },
  { id:'award', name:'荣誉奖项', description:'竞赛、奖学金与个人荣誉', fields:['颁发机构','获奖时间','奖项级别'], titleLabel:'奖项名称', bodyLabel:'获奖说明', bodyHint:'说明评选范围、获奖依据或个人贡献；仅填写可核实的信息。' },
  { id:'certificate', name:'证书资质', description:'职业认证、资格与语言证书', fields:['颁发机构','获得时间','有效期'], titleLabel:'证书名称', bodyLabel:'证书说明', bodyHint:'按需补充认证方向、成绩或核验方式。' },
  { id:'volunteer', name:'志愿服务', description:'公益活动与社区服务', fields:['组织','服务角色','开始时间','结束时间'], titleLabel:'服务项目名称', bodyLabel:'服务总结', bodyHint:'说明服务对象、参与内容与实际贡献。' },
  { id:'training', name:'培训进修', description:'课程学习与专业能力提升', fields:['培训机构','开始时间','结束时间'], titleLabel:'课程 / 培训名称', bodyLabel:'学习成果', bodyHint:'说明学习内容、实践产出及其应用。' },
];

export const EXISTING_CATEGORY_TEMPLATES: CategoryTemplate[] = [
  { id:'work', name:'工作经历', description:'公司、职位、任职时间与经历总结', fields:['公司','职位','开始时间','结束时间'], titleLabel:'经历标题', bodyLabel:'经历总结', bodyHint:'说明职责、关键行动和实际成果。' },
  { id:'project', name:'独立项目', description:'项目角色、时间、技术栈与项目总结', fields:['我的角色','开始时间','结束时间','技术栈'], titleLabel:'项目名称', bodyLabel:'项目总结', bodyHint:'一段讲清项目问题与职责、关键做法和实际成果。' },
  { id:'research', name:'科研经历', description:'研究机构、身份、研究方向与总结', fields:['机构 / 实验室','身份','开始时间','结束时间','研究方向'], titleLabel:'研究课题', bodyLabel:'研究总结', bodyHint:'说明研究问题与职责、关键方法与实验、实际成果。' },
  { id:'paper', name:'发表论文', description:'论文作者、期刊会议与发表信息', fields:['作者','期刊 / 会议','年份','DOI'], titleLabel:'论文标题', bodyLabel:'论文说明', bodyHint:'补充研究贡献、作者位次和发表状态。' },
  { id:'education', name:'教育经历', description:'学校、专业学位与学习经历', fields:['学校','专业','学历 / 学位','开始时间','结束时间'], titleLabel:'教育经历标题', bodyLabel:'补充说明', bodyHint:'按需记录相关课程、学业成果或荣誉。' },
  { id:'skill', name:'技能', description:'技能分组、熟练程度与使用经验', fields:['熟练程度'], titleLabel:'技能分组', bodyLabel:'技能说明', bodyHint:'填写实际掌握的技能及使用经验。' },
];

export function templatesFromCategories(master: Master): CategoryTemplate[] {
  return (master.customCategories ?? []).filter(c=>!master.hiddenCategories?.includes(`custom:${c.id}`)).map(c=>({
    id:`custom:${c.id}`, name:c.name, description:'复用此类别的字段，不复制已填写内容', fields:c.fields.map(f=>f.label),
    titleLabel:c.titleLabel || '标题', bodyLabel:c.bodyLabel || '正文', bodyHint:c.bodyHint || '说明背景、个人贡献与成果。',
  }));
}

export function availableCategoryName(name: string, existingNames: string[]): string {
  const used = new Set(existingNames.map(n=>n.trim()));
  if (!used.has(name)) return name;
  let suffix=2;
  while (used.has(`${name} ${suffix}`)) suffix++;
  return `${name} ${suffix}`;
}

export function createMaterialCategory(name: string, fields: string[], template?: CategoryTemplate): CustomMaterialCategory {
  return {
    id:uid(), name:name.trim(),
    fields:[...new Set(fields.map(f=>f.trim()).filter(Boolean))].map(label=>({id:uid(),label})),
    titleLabel:template?.titleLabel || '标题', bodyLabel:template?.bodyLabel || '正文', bodyHint:template?.bodyHint || '',
    items:[{id:uid(),title:'',body:'',values:{}}],
  };
}
