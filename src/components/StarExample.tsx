import { Hint } from './Hint';
type StarPart='situation'|'task'|'action'|'result';
const examples:Record<'research'|'project',Record<StarPart,string>>={
 research:{situation:'微服务调用链复杂，故障定位依赖人工排查，现有方法对异常传播的解释不足。',task:'负责研究调用链特征提取方法，搭建实验验证其对故障定位的帮助。',action:'设计调用链特征，构建故障注入实验，对比不同诊断方法，并分析误判原因。',result:'完成方法验证与实验报告；若已发表论文，可写明论文名称、发表状态和本人贡献，未发表则不填写。'},
 project:{situation:'团队实验记录分散在不同文件中，查找和追溯记录耗时。',task:'开发统一的数据管理工具，支持记录导入、检索与权限控制。',action:'设计数据模型和接口，实现批量导入、条件检索及权限校验，并编写测试验证流程。',result:'工具用于团队日常实验记录管理，支持按实验条件检索和追溯历史记录。'},
};
export function StarExample({part,kind='research'}:{part:StarPart;kind?:'research'|'project'}){return <Hint label={`${{situation:'背景',task:'目标',action:'行动',result:'结果'}[part]}填写示例`}><p>{examples[kind][part]}</p><small>虚构示例，仅作写法参考，请填写真实经历。</small></Hint>;}
