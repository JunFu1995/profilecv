import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_PROVIDERS,detectAiProvider,selectAiProvider,chatModelOptions} from '../src/aiProviders.ts';
import {DEFAULT_AI,testAiConnection,loadAiConfig,saveAiConfig,clearAiConfig} from '../src/ai.ts';

test('provider presets default to DeepSeek and identify exact endpoints without mistaking custom proxies',()=>{
 assert.equal(detectAiProvider(DEFAULT_AI.baseUrl),'deepseek');
 assert.equal(detectAiProvider('https://api.deepseek.com/v1/'),'deepseek');
 for(const p of AI_PROVIDERS)assert.equal(detectAiProvider(p.baseUrl+'/'),p.id);
 assert.equal(detectAiProvider('https://api.deepseek.com.evil.test/v1'),'custom');
 assert.equal(detectAiProvider('https://api.deepseek.com/custom'),'custom');
 assert.equal(detectAiProvider('http://localhost:8080/v1'),'custom');
 assert.equal(detectAiProvider('https://workspace-123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'),'aliyun');
});

test('switching provider resets endpoint, model and key without changing the saved source',()=>{
 const original={baseUrl:'https://private.example/v1',model:'custom-model',apiKey:'test-placeholder',remember:false};
 for(const p of AI_PROVIDERS){
  const next=selectAiProvider(original,p.id);
  assert.equal(next.apiKey,'');assert.equal(next.baseUrl,p.baseUrl);assert.equal(next.model,p.model);assert.equal(next.remember,false);
 }
 assert.deepEqual(selectAiProvider(original,'custom'),original);
 assert.equal(original.apiKey,'test-placeholder');
});

test('preset requests use compatible chat parameters, fixed test messages and the selected endpoint',async()=>{
 const previous=globalThis.fetch;const requests=[];
 globalThis.fetch=async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify({choices:[{message:{content:'OK'},finish_reason:'stop'}]}),{status:200});};
 try{
  for(const p of AI_PROVIDERS)await testAiConnection({...p,apiKey:'test-placeholder'},new AbortController().signal);
  requests.forEach((r,i)=>{assert.equal(r.url,AI_PROVIDERS[i].baseUrl+'/chat/completions');assert.equal(r.body.model,AI_PROVIDERS[i].model);assert.deepEqual(r.body.messages,[{role:'user',content:'Reply with OK.'}]);});
  assert.deepEqual(requests[0].body.thinking,{type:'disabled'});
  const kimi=requests.find(r=>r.body.model==='kimi-k3.1-pro').body;
  assert.ok(kimi.max_completion_tokens>=8192);assert.equal(kimi.temperature,undefined);assert.equal(kimi.max_tokens,undefined);
  assert.deepEqual(chatModelOptions({baseUrl:'https://proxy.example/v1',model:'deepseek-flash'},64),{temperature:.8,max_tokens:64});
 }finally{globalThis.fetch=previous;}
});

test('saved custom AI configuration is preserved and fresh configuration defaults to DeepSeek',()=>{
 const previous=globalThis.localStorage;const data=new Map();
 globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 try{
  clearAiConfig();assert.deepEqual(loadAiConfig(),DEFAULT_AI);
  const config={baseUrl:'https://custom.example/v1',model:'custom-model',apiKey:'test-placeholder',remember:true};
  saveAiConfig(config);assert.deepEqual(loadAiConfig(),config);
  selectAiProvider(config,'aliyun');assert.deepEqual(loadAiConfig(),config);
  clearAiConfig();
 }finally{globalThis.localStorage=previous;}
});
