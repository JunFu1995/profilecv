export const COMPOSE_STYLES = [
  { id: 'balanced', label: '清晰完整', description: '交代问题、做法与成果', instruction: '清晰完整：按问题与职责、关键做法、实际成果自然展开，兼顾过程和结果。' },
  { id: 'concise', label: '精简有力', description: '压缩背景，突出重点', instruction: '精简有力：优先控制在 2–3 句、80–140 个汉字，压缩背景和重复信息，保留核心贡献及关键成果数字；不要为凑字数删掉必要事实。此长度要求优先于通用建议。' },
  { id: 'technical', label: '技术导向', description: '突出方案、方法与难点', instruction: '技术导向：重点说明关键技术方案、研究方法或实验设计怎样解决难点，并用已有结果支撑；不堆砌技术名词，不添加未提供的技术细节。' },
  { id: 'impact', label: '成果导向', description: '先写成效，再解释贡献', instruction: '成果导向：若有已证实成果，先呈现成果，再交代本人贡献与关键做法；若没有成果证据，就突出已完成的工作。不得将目标或预期写成实际成果，此叙述顺序优先于通用建议。' },
] as const;
export type ComposeStyle = typeof COMPOSE_STYLES[number]['id'];
export function composeStyleInstruction(style: ComposeStyle = 'balanced'): string {
  return COMPOSE_STYLES.find(s => s.id === style)?.instruction ?? COMPOSE_STYLES[0].instruction;
}
