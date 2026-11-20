import { Hint } from './Hint';

const examples:Record<string,string>={
 '基本信息':'姓名：张同学\n目标职位：后端工程师\n简介：具备后端服务开发经验，参与接口设计、性能优化与线上问题排查。',
 '工作经历':'公司：某科技公司\n职位：后端工程师\n工作描述：负责订单接口开发，完善异常处理与监控；成果应填写自己实际参与的工作和可核实的数据。',
 '独立项目':'项目：实验数据管理工具\n背景（S）：实验记录分散，检索不便。\n目标（T）：统一管理记录并支持检索。\n行动（A）：设计数据模型，实现导入、检索与权限控制。\n结果（R）：工具用于日常实验记录管理。\n总结：开发实验数据管理工具，实现记录导入、检索与权限控制，支持团队统一管理实验数据。',
 '科研经历':'研究：分布式系统故障诊断\n背景（S）：服务调用链复杂，故障定位依赖人工。\n目标（T）：研究基于调用链的诊断方法。\n行动（A）：设计特征提取方法，搭建实验并比较诊断效果。\n结果（R）：完成实验验证；若有发表论文，可填写真实论文名称、发表情况和个人贡献。\n总结：参与分布式系统故障诊断研究，负责特征提取与实验验证，对比不同方法的诊断效果。',
 '发表论文':'标题：填写论文完整标题\n期刊／会议：填写正式名称\n等级：仅填写已核实的等级\n作者位次：选择自己真实的作者位次\nDOI：有则填写，无则留空。',
 '教育经历':'学校：某大学\n专业：计算机科学与技术\n学历／学位：硕士\n开始／结束：填写实际就读时间\n副标题：可填写真实 GPA、奖学金或荣誉。',
 '技能':'分组：开发语言\n内容：熟悉 Java、Python，具备接口开发与数据处理经验。\n按实际掌握程度填写，避免罗列未使用过的技术。',
};
export function MaterialExample({title,compact=false,hint}:{title:string;compact?:boolean;hint?:string}) {
 const content = <><p>以下为虚构示例，仅演示写法，请替换为真实经历。</p><pre>{examples[title]??'标题：填写一项真实经历\n正文：说明背景、个人贡献与成果；自定义字段可按实际需要添加。'}</pre></>;
 if(compact)return <Hint label={`${title}填写说明`}>{hint && <p>{hint}</p>}<div className="material-example-content">{content}</div></Hint>;
 return <details className="material-example"><summary>查看填写示例</summary>{content}</details>;
}
