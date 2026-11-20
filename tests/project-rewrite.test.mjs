import test from 'node:test';
import assert from 'node:assert/strict';
import {rewriteProjectDraft,projectDraft,hasProjectDraft} from '../src/draftEditing.ts';
import {rewriteBullet,reviseBullet,composeProject} from '../src/ai.ts';
import {normalizeDoc} from '../src/storage.ts';
const project=()=>normalizeDoc({master:{sideProjects:[{id:'p',display:'star',situation:'原始背景',actions:[{id:'a',text:'原始行动'}],results:[],composed:{mode:'paragraph',text:'已经手动修改的项目总结。',bullets:[],sourceHash:'old'}}]}}).master.sideProjects[0];
test('rewrite changes only current summary, retaining STAR, display choice and stale source fingerprint',()=>{
 const p=project();const before=structuredClone(p);
 const patch=rewriteProjectDraft(p,'优化后的项目总结。',()=> 'unused');const updated={...p,...patch};
 assert.deepEqual(Object.keys(patch),['composed']);assert.equal(updated.display,'star');
 assert.equal(updated.composed.sourceHash,'old');assert.equal(updated.situation,p.situation);assert.deepEqual(updated.actions,p.actions);assert.deepEqual(p,before);
 assert.equal(normalizeDoc({master:{sideProjects:[updated]}}).master.sideProjects[0].composed.text,'优化后的项目总结。');
});
test('bullet rewrite preserves every line and existing IDs; an emptied summary does not fall back to STAR',()=>{
 const p=project();p.composed={...p.composed,mode:'bullets',bullets:[{id:'b1',text:'旧第一条'},{id:'b2',text:'旧第二条'}]};
 const next=rewriteProjectDraft(p,'第一条改写，保留 12 个模块。\n第二条改写，耗时从 3.2 秒降至 1.4 秒。',()=> 'new').composed;
 assert.equal(next.mode,'bullets');assert.deepEqual(next.bullets.map(b=>b.id),['b1','b2']);assert.match(next.bullets[1].text,/1.4 秒/);
 const cleared={...p,composed:{...p.composed,mode:'paragraph',text:''}};
 assert.equal(projectDraft(cleared).text,'');assert.equal(hasProjectDraft(cleared),false);
});
const base={original:'优化 12 个模块。\n响应时间从 3.2 秒降至 1.4 秒。',jd:'',role:'',company:'',peers:[],config:{baseUrl:'https://example.test',apiKey:'',model:'test'},signal:new AbortController().signal};
test('STAR generation uses source facts rather than the edited summary and returns both preview formats',async()=>{
 const originalFetch=globalThis.fetch;let request;
 const p=project();const before=structuredClone(p);
 globalThis.fetch=async(_,options)=>{request=JSON.parse(options.body);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({paragraph:'根据原始背景完成原始行动。',bullets:['基于原始背景。','完成原始行动。']})}}]});};
 try {
  const result=await composeProject({project:p,targetRole:'',jd:'',config:base.config,signal:base.signal});
  assert.match(request.messages[1].content,/原始背景/);assert.match(request.messages[1].content,/原始行动/);
  assert.doesNotMatch(request.messages[1].content,/已经手动修改/);
  assert.equal(result.paragraph,'根据原始背景完成原始行动。');assert.deepEqual(result.bullets,['基于原始背景。','完成原始行动。']);
  assert.deepEqual(p,before);
 } finally {globalThis.fetch=originalFetch;}
});
test('summary requests use full-text rules and retain multiline suggestions and revisions without contacting an API',async()=>{
 const originalFetch=globalThis.fetch;let content='';const requests=[];
 globalThis.fetch=async(_,options)=>{requests.push(JSON.parse(options.body));return Response.json({choices:[{finish_reason:'stop',message:{content}}]});};
 try {
  content=JSON.stringify({candidates:[{label:'清晰版',text:base.original}]});
  assert.equal((await rewriteBullet({...base,summaryFormat:'bullets'}))[0].text,base.original);
  assert.match(requests[0].messages[0].content,/完整的项目总结/);assert.match(requests[0].messages[0].content,/每行一条/);assert.doesNotMatch(requests[0].messages[0].content,/60 个汉字/);assert.ok(requests[0].max_tokens>=2400);
  content=base.original;
  assert.equal((await rewriteBullet({...base,summaryFormat:'bullets'})).length,1);
  assert.equal((await rewriteBullet({...base,summaryFormat:'bullets'}))[0].text,base.original);
  assert.equal(await reviseBullet({...base,base:base.original,annotations:[],note:'改善表达',summaryFormat:'bullets'}),base.original);
  await rewriteBullet({...base,summaryFormat:'paragraph'});assert.match(requests.at(-1).messages[0].content,/只输出一个自然段/);
  await rewriteBullet(base);assert.match(requests.at(-1).messages[0].content,/60 个汉字/);
 } finally {globalThis.fetch=originalFetch;}
});

test('generation styles reach the prompt for project and research without mutating source or weakening factual rules',async()=>{
 const {COMPOSE_STYLES}=await import('../src/composeStyles.ts');
 const originalFetch=globalThis.fetch;let request;
 globalThis.fetch=async(_,options)=>{request=JSON.parse(options.body);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({paragraph:'预览结果。',bullets:[]})}}]});};
 try{
  for(const subject of ['项目总结','研究总结'])for(const style of COMPOSE_STYLES){
   const p=project();const before=structuredClone(p);
   const out=await composeProject({subject,style:style.id,project:p,targetRole:'',jd:'',config:base.config,signal:base.signal});
   assert.ok(request.messages[0].content.includes(style.instruction));
   assert.match(request.messages[0].content,/不得编造事实/);
   assert.match(request.messages[0].content,/都只生成一个自然段/);
   assert.match(request.messages[0].content,subject==='研究总结'?/研究方法与实验/:/关键技术做法/);
   assert.equal(out.paragraph,'预览结果。');assert.deepEqual(p,before);
  }
 }finally{globalThis.fetch=originalFetch;}
});
