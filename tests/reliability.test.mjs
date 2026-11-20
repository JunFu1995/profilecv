import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { inspectStoredDoc, saveSnapshot, loadSnapshot, preserveUnreadable, normalizeDoc } from '../src/storage.ts';
import { sampleDoc } from '../src/data.ts';
import { translationBatches } from '../src/translationBatches.ts';
import { translateTexts, parseResumeText } from '../src/ai.ts';
const data = new Map();
beforeEach(() => {
  data.clear();
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
});
test('corrupt storage remains distinct from a new document and is preserved verbatim', () => {
  assert.equal(inspectStoredDoc().status, 'empty');
  data.set('resume-tool:v1', '{broken');
  assert.deepEqual(inspectStoredDoc(), { status: 'error', raw: '{broken' });
  assert.equal(preserveUnreadable('{broken'), true);
  assert.equal(data.get('resume-tool:v1'), '{broken');
  assert.ok([...data.keys()].some(k => k.includes(':recovery:')));
});
test('blocked storage and exhausted quota are reported', () => {
  globalThis.localStorage = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  assert.deepEqual(inspectStoredDoc(), { status: 'error', raw: null });
  assert.equal(saveSnapshot(sampleDoc()), false);
  assert.equal(preserveUnreadable('raw'), false);
});
test('snapshot survives reload and does not alias subsequent edits', () => {
  const doc = sampleDoc();
  const name = doc.master.basics.name;
  assert.equal(saveSnapshot(doc), true);
  doc.master.basics.name = 'changed';
  assert.equal(loadSnapshot().master.basics.name, name);
});
test('legacy project migration preserves reference IDs', () => {
  const doc = normalizeDoc({ master: { projects: [{ id: 'old-project', org: 'Legacy', bullets: [{ id: 'old-bullet', text: 'Result' }] }] }, variants: [{ projects: [{ groupId: 'old-project', bullets: [{ bulletId: 'old-bullet' }] }] }] });
  assert.equal(doc.master.sideProjects[0].id, doc.variants[0].projects[0].groupId);
  assert.equal(doc.master.sideProjects[0].actions[0].id, 'old-bullet');
});
test('translation batches preserve order and split by length and count', () => {
  const texts = [...Array(45).fill('短文本'), '长'.repeat(1600), '文'.repeat(1600), '巨'.repeat(3000)];
  const batches = translationBatches(texts);
  assert.deepEqual(batches.flat(), texts);
  assert.ok(batches.every(b => b.length <= 20 && (b.join('').length <= 1800 || b.length === 1)));
  assert.deepEqual(translationBatches([]), []);
});
const args = { config: { baseUrl: 'https://example.test', apiKey: '', model: 'test' }, signal: new AbortController().signal };
test('translation receives a larger budget and rejects truncated output', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_, options) => {
      assert.ok(JSON.parse(options.body).max_tokens >= 2400);
      return Response.json({ choices: [{ finish_reason: 'length', message: { content: '["partial"]' } }] });
    };
    await assert.rejects(translateTexts({ ...args, texts: ['中文'] }), /长度上限/);
  } finally { globalThis.fetch = original; }
});
test('oversized resume import is rejected before sending instead of silently truncated', async () => {
  await assert.rejects(parseResumeText({ ...args, text: '字'.repeat(12001) }), /12000/);
});

test('AI configuration validates real hostnames and rejects unsupported URLs', async () => {
  const { isConfigured } = await import('../src/ai.ts');
  assert.equal(isConfigured({ ...args.config, baseUrl: 'http://localhost:11434/v1' }), true);
  assert.equal(isConfigured({ ...args.config, baseUrl: 'https://localhost.example.test/v1' }), false);
  assert.equal(isConfigured({ ...args.config, baseUrl: 'javascript:alert(1)', apiKey: 'fake' }), false);
});
test('AI remembered/session config and clear share a single source', async () => {
  const { saveAiConfig, loadAiConfig, clearAiConfig } = await import('../src/ai.ts');
  globalThis.localStorage.removeItem = k => data.delete(k);
  const config = { ...args.config, apiKey: 'test-only', remember: true };
  saveAiConfig(config);
  assert.equal(loadAiConfig().apiKey, 'test-only');
  assert.ok(data.has('resume-tool:v3:ai'));
  saveAiConfig({ ...config, remember: false });
  assert.equal(data.has('resume-tool:v3:ai'), false);
  assert.equal(loadAiConfig().apiKey, 'test-only');
  clearAiConfig();
  assert.equal(loadAiConfig().apiKey, '');
});
test('connection validation is specific to the exact configuration and sends no resume', async () => {
  const { testAiConnection, isAiVerified } = await import('../src/ai.ts');
  const original = globalThis.fetch;
  const config = { ...args.config, apiKey: 'test-only' };
  try {
    globalThis.fetch = async (_, options) => {
      assert.deepEqual(JSON.parse(options.body).messages, [{ role: 'user', content: 'Reply with OK.' }]);
      return Response.json({ choices: [{ message: { content: 'OK' } }] });
    };
    await testAiConnection(config, args.signal);
    assert.equal(isAiVerified(config), true);
    assert.equal(isAiVerified({ ...config, model: 'different' }), false);
    globalThis.fetch = async () => new Response('', { status: 401 });
    await assert.rejects(testAiConnection(config, args.signal), /401/);
    assert.equal(isAiVerified(config), false);
  } finally { globalThis.fetch = original; }
});
test('AI storage failure is surfaced instead of reporting success', async () => {
  const { saveAiConfig } = await import('../src/ai.ts');
  globalThis.localStorage.setItem = () => { throw Error('quota'); };
  assert.throws(() => saveAiConfig({ ...args.config, apiKey: 'test-only' }), /无法更新/);
});

test('JD recommendations retain optional materials and create only selected references', async () => {
  const {recommendMaterials,variantFromRecommendations}=await import('../src/recommendations.ts');
  const master=sampleDoc().master;
  const original=JSON.stringify(master);
  const rows=recommendMaterials(master,'Java MySQL');
  assert.ok(rows.length>0);
  assert.ok(rows.some(r=>r.terms.length>0));
  const selected=rows.map((r,i)=>({...r,selected:i===0}));
  const variant=variantFromRecommendations(master,selected,'测试公司','后端','Java MySQL');
  assert.equal(Object.values({work:variant.work,projects:variant.projects,research:variant.research,education:variant.education,publications:variant.publications,skills:variant.skills}).flat().length,1);
  assert.equal(variant.jobTarget.jdText,'Java MySQL');
  assert.equal(JSON.stringify(master),original);
  assert.ok(recommendMaterials(master,'').every(r=>r.selected));
  assert.ok(recommendMaterials(master,'UnmatchedUniqueRequirement').filter(r=>r.section!=='education').every(r=>!r.selected));
});

test('legacy layouts migrate and version edits remain isolated through reload', async () => {
 const {layoutFor,updateVariantLayout}=await import('../src/variantLayout.ts');
 const old=sampleDoc();old.locale='en';old.template='serif';old.layoutScale=.92;
 old.variants.push({...old.variants[0],id:'second'});
 const migrated=normalizeDoc(old);
 assert.equal(migrated.variants[0].layout.template,'serif');
 assert.equal(migrated.variants[1].layout.locale,'en');
 const changed=updateVariantLayout(migrated,migrated.variants[0].id,{locale:'zh',template:'editorial',layoutScale:1.06});
 const reloaded=normalizeDoc(JSON.parse(JSON.stringify(changed)));
 assert.equal(layoutFor(reloaded,reloaded.variants[0]).template,'editorial');
 assert.equal(layoutFor(reloaded,reloaded.variants[1]).template,'serif');
 assert.equal(layoutFor(reloaded,reloaded.variants[1]).layoutScale,.92);
 assert.equal(reloaded.template,'serif');
 assert.equal(migrated.variants[0].layout.template,'serif');
});

test('creation preserves manual choices after JD edits and excludes unchecked bullets', async () => {
 const {recommendMaterials,refreshRecommendations,variantFromRecommendations}=await import('../src/recommendations.ts');
 const master=sampleDoc().master;
 const rows=recommendMaterials(master,'');
 const row=rows.find(r=>r.section==='work'&&r.bullets.length);
 row.bullets[0].selected=false;
 rows.reverse();
 const refreshed=refreshRecommendations(master,'Java Redis',rows);
 assert.equal(refreshed[0].id,rows[0].id);
 const match=refreshed.find(r=>r.id===row.id);
 assert.equal(match.bullets.find(b=>b.id===row.bullets[0].id).selected,false);
 const v=variantFromRecommendations(master,refreshed,'','','Java Redis');
 assert.ok(!v.work.find(g=>g.groupId===row.id).bullets.some(b=>b.bulletId===row.bullets[0].id));
});

test('selecting one bullet in an inactive material does not select siblings', async () => {
 const {recommendMaterials,toggleRecommendedBullet,variantFromRecommendations}=await import('../src/recommendations.ts');
 const master=sampleDoc().master;
 const rows=recommendMaterials(master,'');
 const original=rows.find(r=>r.section==='work'&&r.bullets.length>1);
 const row={...original,selected:false};
 const next=toggleRecommendedBullet(row,row.bullets[1].id,true);
 assert.equal(next.selected,true);
 assert.equal(next.bullets.filter(b=>b.selected).length,1);
 const variant=variantFromRecommendations(master,[next],'','','');
 assert.deepEqual(variant.work[0].bullets,[{bulletId:row.bullets[1].id}]);
 const added=toggleRecommendedBullet(next,row.bullets[0].id,true);
 assert.equal(added.bullets.filter(b=>b.selected).length,2);
 const removed=toggleRecommendedBullet(added,row.bullets[1].id,false);
 assert.equal(removed.bullets.filter(b=>b.selected).length,1);
 assert.ok(original.bullets.every(b=>b.selected));
});

test('creation draft restores decisions against current materials and clears after completion', async () => {
 const {saveCreationDraft,loadCreationDraft,clearCreationDraft}=await import('../src/creationDraft.ts');
 const {recommendMaterials}=await import('../src/recommendations.ts');
 const {layoutFor}=await import('../src/variantLayout.ts');
 globalThis.localStorage.removeItem=k=>data.delete(k);
 const doc=sampleDoc(); const rows=recommendMaterials(doc.master,'Java');rows[0].selected=false;
 assert.equal(saveCreationDraft({company:'Test',role:'Engineer',jd:'Java',rows,step:'select',design:layoutFor(doc)}),true);
 const restored=loadCreationDraft(doc.master);
 assert.equal(restored.company,'Test');assert.equal(restored.rows[0].selected,false);
 const removed={...doc.master,work:[]};
 assert.equal(loadCreationDraft(removed).rows.some(r=>r.section==='work'),false);
 assert.equal(clearCreationDraft(),true);assert.equal(loadCreationDraft(doc.master),null);
 globalThis.localStorage.setItem=()=>{throw Error('quota');};
 assert.equal(saveCreationDraft({company:'',role:'',jd:'',rows:null,step:'job',design:layoutFor(doc)}),false);
});

test('AI recommendations require valid references and literal evidence; additions preserve choices', async () => {
 const {validateAiRecommendations,mergeRecommendedAdditions}=await import('../src/aiRecommendations.ts');
 const {recommendMaterials}=await import('../src/recommendations.ts');
 const rows=recommendMaterials(sampleDoc().master,'');const r=rows.find(r=>r.section==='work'&&r.bullets.length>1);
 const item={id:r.id,section:r.section,bulletIds:[r.bullets[0].id],reason:'相关实践',evidence:r.bullets[0].text,requirement:'Java'};
 assert.throws(()=>validateAiRecommendations(rows,'Java',[{...item,id:'invented'}]),/可核验/);
 assert.throws(()=>validateAiRecommendations(rows,'Java',[{...item,evidence:'fabricated'}]),/可核验/);
 assert.throws(()=>validateAiRecommendations(rows,'Java',[{...item,requirement:'Python'}]),/可核验/);
 const proposed=validateAiRecommendations(rows,'Java',[item]);
 assert.equal(proposed.find(x=>x.id===r.id).bullets.filter(b=>b.selected).length,1);
 const merged=mergeRecommendedAdditions(rows,proposed);
 assert.equal(merged.find(x=>x.id===r.id).bullets.filter(b=>b.selected).length,r.bullets.length);
});

test('AI provenance survives draft restoration and JD changes retain old evidence for stale indication', async () => {
 const {recommendMaterials,refreshRecommendations}=await import('../src/recommendations.ts');
 const {validateAiRecommendations}=await import('../src/aiRecommendations.ts');
 const {saveCreationDraft,loadCreationDraft}=await import('../src/creationDraft.ts');
 const {layoutFor}=await import('../src/variantLayout.ts');
 const doc=sampleDoc();const rows=recommendMaterials(doc.master,'Java');const r=rows.find(r=>r.section==='work'&&r.bullets.length);
 const proposed=validateAiRecommendations(rows,'Java',[{id:r.id,section:r.section,bulletIds:[r.bullets[0].id],reason:'实践证据',evidence:r.bullets[0].text,requirement:'Java'}]);
 saveCreationDraft({company:'',role:'',jd:'Java',rows:proposed,step:'select',design:layoutFor(doc)});
 const restored=loadCreationDraft(doc.master).rows.find(x=>x.id===r.id);
 assert.equal(restored.provenance.method,'ai');assert.match(restored.reason,/实践证据/);
 const updated=refreshRecommendations(doc.master,'Python',proposed).find(x=>x.id===r.id);
 assert.equal(updated.provenance.jd,'Java');assert.equal(updated.selected,true);
});

test('rewrite diff reconstructs both versions including Unicode', async () => {
 const {textDiff}=await import('../src/rewriteReview.ts');
 for(const [before,after] of [['参与开发🚀项目','协助开发🚀平台'],['','新增'],['删除',''],['相同','相同']]){
  const diff=textDiff(before,after);
  assert.equal(diff.filter(x=>x.type!=='added').map(x=>x.text).join(''),before);
  assert.equal(diff.filter(x=>x.type!=='removed').map(x=>x.text).join(''),after);
 }
});
test('rewrite flags factual changes without treating unchanged material as a change', async () => {
 const {factWarnings}=await import('../src/rewriteReview.ts');
 const original='参与团队项目，计划提升效率 20%';
 const warnings=factWarnings(original,'独立主导项目，实现效率提升 50%，采用 Redis');
 for(const pattern of [/新增数字/,/未保留数字/,/职责可能/,/目标可能/,/团队成果/,/新增英文术语/]) assert.ok(warnings.some(w=>pattern.test(w)));
 assert.deepEqual(factWarnings(original,original),[]);
});

test('removed version wording survives reload, re-add and reset to source', async()=>{
 const {createVariant,setBulletText,toggleBullet,toggleGroup,clearBulletText}=await import('../src/variants.ts');
 const doc=sampleDoc(),g=doc.master.work[0],b=g.bullets[0];
 let v=setBulletText(createVariant(doc.master,'测试'),'work',g.id,b.id,'本版专属改写');
 v=toggleBullet(v,'work',g.id,b.id,false);
 v=normalizeDoc({...doc,variants:[v]}).variants[0];
 v=toggleBullet(v,'work',g.id,b.id,true);
 assert.equal(v.work.find(x=>x.groupId===g.id).bullets.find(x=>x.bulletId===b.id).text,'本版专属改写');
 v=toggleGroup(v,doc.master,'work',g.id,false);
 v=toggleGroup(v,doc.master,'work',g.id,true);
 assert.equal(v.work.find(x=>x.groupId===g.id).bullets.find(x=>x.bulletId===b.id).text,'本版专属改写');
 v=clearBulletText(v,'work',g.id,b.id);
 v=toggleBullet(v,'work',g.id,b.id,false);v=toggleBullet(v,'work',g.id,b.id,true);
 assert.equal(v.work.find(x=>x.groupId===g.id).bullets.find(x=>x.bulletId===b.id).text,undefined);
 assert.notEqual(g.bullets[0].text,'本版专属改写');
});
test('undo supplement removes additions only and keeps later changes to existing content', async()=>{
 const {createVariant,toggleBullet,setBulletText}=await import('../src/variants.ts');
 const {undoSupplement}=await import('../src/supplement.ts');
 const doc=sampleDoc(),g=doc.master.work.find(g=>g.bullets.length>1),[a,b]=g.bullets;
 const before=toggleBullet(createVariant(doc.master,'测试'),'work',g.id,b.id,false);
 const after=toggleBullet(before,'work',g.id,b.id,true);
 const edited=setBulletText({...after,summary:'后续简介'},'work',g.id,a.id,'后续改写');
 const undone=undoSupplement(edited,before,after,doc.master);
 assert.equal(undone.summary,'后续简介');
 assert.equal(undone.work.find(x=>x.groupId===g.id).bullets.find(x=>x.bulletId===a.id).text,'后续改写');
 assert.equal(undone.work.find(x=>x.groupId===g.id).bullets.some(x=>x.bulletId===b.id),false);
});

test('check suggestions retain source identities across reorder and resolve after edits', async()=>{
 const {buildView}=await import('../src/variants.ts');const {lintView}=await import('../src/lint.ts');
 const view=buildView(sampleDoc().master);const group=view.research[0];group.researchDraft={mode:'bullets',text:'',sourceHash:'',bullets:structuredClone(group.bullets)};const b=group.researchDraft.bullets[0];b.text='参与系统开发';
 const issue=lintView(view).issues.find(i=>i.bulletId===b.id);
 assert.equal(issue.groupId,group.id);assert.ok(issue.rules.some(r=>r.code==='weak-verb'));
 group.researchDraft.bullets.reverse();assert.equal(lintView(view).issues.find(i=>i.bulletId===b.id).key,issue.key);
 b.text='优化接口，使响应时间降低 20%';assert.equal(lintView(view).issues.some(i=>i.bulletId===b.id),false);
});

test('retired templates migrate safely and new templates survive reload',async()=>{
 const {TEMPLATES}=await import('../src/templates.ts');assert.deepEqual(TEMPLATES.map(t=>t.id),['classic','centered','editorial','serif']);
 const {createVariant}=await import('../src/variants.ts');const doc=sampleDoc();const v=createVariant(doc.master,'旧版');
 for(const template of ['minimal','bar']){
  const result=normalizeDoc({...doc,template,variants:[{...v,layout:{locale:'zh',template,layoutScale:.9,layoutStretch:3,theme:doc.theme}}]});
  assert.equal(result.template,'classic');assert.equal(result.variants[0].layout.template,'classic');assert.equal(result.variants[0].layout.layoutScale,.9);assert.deepEqual(result.master,normalizeDoc(doc).master);
 }
 for(const template of ['centered','editorial'])assert.equal(normalizeDoc({...doc,template}).template,template);
});
