import test from 'node:test';
import assert from 'node:assert/strict';
import {rewriteSummary} from '../src/ai.ts';
import {COMPOSE_STYLES} from '../src/composeStyles.ts';
const base={original:'参与完成缓存改造，延迟从 200ms 降至 80ms。',targetRole:'后端工程师',style:'balanced',subject:'项目总结',config:{baseUrl:'https://example.test',model:'test',apiKey:''},signal:new AbortController().signal};

test('summary rewrite requests one editable paragraph in the chosen style, using only the current summary',async()=>{
 const old=globalThis.fetch;let request;let response=base.original;
 globalThis.fetch=async(_,options)=>{request=JSON.parse(options.body);return Response.json({choices:[{finish_reason:'stop',message:{content:response}}]});};
 try{
  for(const subject of ['项目总结','研究总结'])for(const style of COMPOSE_STYLES){
   const args={...base,subject,style:style.id};const before=structuredClone({...args,signal:undefined});
   assert.equal(await rewriteSummary(args),base.original);
   assert.match(request.messages[0].content,/只以当前总结原文为事实依据/);
   assert.match(request.messages[0].content,/只输出一个自然段/);
   assert.ok(request.messages[0].content.includes(style.instruction));
   assert.ok(request.messages[0].content.includes(subject));
   assert.doesNotMatch(request.messages[0].content,/输出三个/);
   assert.ok(request.messages[1].content.includes(base.original));
   assert.match(request.messages[1].content,/只用于调整表达重点，不是已有事实/);
   assert.deepEqual({...args,signal:undefined},before);
  }
  response=JSON.stringify({text:base.original});assert.equal(await rewriteSummary(base),base.original);
  response='{"candidates":[';await assert.rejects(()=>rewriteSummary(base),/完整的改写正文/);
  await assert.rejects(()=>rewriteSummary({...base,original:' '}),/先填写总结/);
 }finally{globalThis.fetch=old;}
});

test('summary rewrite propagates failure instead of returning text for automatic application',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response('unavailable',{status:503});
 try{await assert.rejects(()=>rewriteSummary(base),/503/);}finally{globalThis.fetch=old;}
});
