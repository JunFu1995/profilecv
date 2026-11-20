import type { AiConfig } from './ai';

/** Chat Completions presets; documentation links are also exposed in the settings form. */
export const AI_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek（默认）', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', docs: 'https://api-docs.deepseek.com/zh-cn/', hint: '使用 DeepSeek 开放平台的 API Key。' },
  { id: 'aliyun', name: '阿里云百炼 · 通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', docs: 'https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen', hint: 'API Key 与地域需一致；如控制台提供含业务空间 ID 的地址，请替换接口地址。' },
  { id: 'zhipu', name: '智谱 · GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-5.3-flash', docs: 'https://docs.bigmodel.cn/cn/guide/develop/openai/introduction', hint: '使用智谱开放平台的通用 API Key。' },
  { id: 'moonshot', name: '月之暗面 · Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k3.1-pro', docs: 'https://platform.kimi.com/docs/get-api-key', hint: '使用 Kimi 开放平台的 API Key；思考模型响应可能较慢。' },
  { id: 'siliconflow', name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct', docs: 'https://docs.siliconflow.cn/docs/usercases/use-siliconcloud-in-fastgpt', hint: '模型 ID 需与控制台一致，包含厂商前缀。' },
] as const;

export function detectAiProvider(baseUrl: string): string {
  try {
    const url = new URL(baseUrl.trim());
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return 'custom';
    return AI_PROVIDERS.find(p => {
      const preset = new URL(p.baseUrl);
      if (url.hostname === preset.hostname) return url.pathname.replace(/\/+$/, '') === preset.pathname.replace(/\/+$/, '') || (p.id === 'deepseek' && url.pathname.replace(/\/+$/, '') === '/v1');
      return p.id === 'aliyun' && /^[a-zA-Z0-9-]+\.cn-beijing\.maas\.aliyuncs\.com$/.test(url.hostname) && url.pathname.replace(/\/+$/, '') === '/compatible-mode/v1';
    })?.id ?? 'custom';
  } catch { return 'custom'; }
}

export function selectAiProvider(config: AiConfig, id: string): AiConfig {
  const preset = AI_PROVIDERS.find(p => p.id === id);
  return preset ? { ...config, baseUrl: preset.baseUrl, model: preset.model, apiKey: '' } : { ...config };
}

/** Keep preset models in a short, non-streaming writing mode where supported. */
export function chatModelOptions(config: AiConfig, maxTokens: number): Record<string, unknown> {
  const provider = detectAiProvider(config.baseUrl);
  if (provider === 'moonshot' && config.model === 'kimi-k3.1-pro') {
    return { max_completion_tokens: Math.max(8192, maxTokens), reasoning_effort: 'low' };
  }
  const options: Record<string, unknown> = { temperature: 0.8, max_tokens: maxTokens };
  if ((provider === 'deepseek' && config.model === 'deepseek-flash') || (provider === 'zhipu' && config.model === 'glm-5.3-flash')) options.thinking = { type: 'disabled' };
  if (provider === 'aliyun' && config.model === 'qwen-plus') options.enable_thinking = false;
  return options;
}
