import test from 'node:test';
import assert from 'node:assert/strict';
import { editProjectDraft, editResearchSource, hasProjectDraft, projectDraft, projectDraftFromSource, switchProjectDraftMode } from '../src/draftEditing.ts';
import { normalizeDoc } from '../src/storage.ts';

test('editing bullet draft preserves display mode, stable IDs, saved paragraph and source fingerprint', () => {
  const project={composed:{mode:'bullets',text:'保留段落',sourceHash:'original',bullets:[{id:'a',text:'旧要点'}]}};
  const result=editProjectDraft(project,'新要点\n第二条',()=> 'new');
  assert.deepEqual(result,{mode:'bullets',text:'保留段落',sourceHash:'original',bullets:[{id:'a',text:'新要点'},{id:'new',text:'第二条'}]});
  assert.equal(project.composed.bullets[0].text,'旧要点');
});
test('editing paragraph does not overwrite alternate bullets or mask stale source fingerprint', () => {
  const composed={mode:'paragraph',text:'旧段落',sourceHash:'original',bullets:[{id:'a',text:'原要点'}]};
  const result=editProjectDraft({composed},'新段落',()=> 'unused');
  assert.equal(result.text,'新段落');assert.deepEqual(result.bullets,composed.bullets);assert.equal(result.sourceHash,'original');
});
test('variant research source edits preserve the final draft and bullet visibility after saving', () => {
  const work=normalizeDoc({master:{research:[{id:'r',summary:'已经确认的正文',summaryOnly:false,bullets:[{id:'b',text:'证据'}],star:{situation:'背景',task:'目标',action:'行动',result:'成果'}}]}}).master.research[0];
  const updated={...work,...editResearchSource(work,'result','补充真实成果')};
  const saved=normalizeDoc({master:{research:[updated]}}).master.research[0];
  assert.equal(saved.summary,'已经确认的正文');assert.equal(saved.summaryOnly,false);assert.equal(saved.star.result,'补充真实成果');assert.equal(work.star.result,'成果');
  assert.equal(editResearchSource(saved,'task','新目标').star.result,'补充真实成果');
});

test('blank composed text does not count as a completed draft', () => {
 assert.equal(hasProjectDraft({composed:{mode:'paragraph',text:'  \n '}}),false);
 assert.equal(hasProjectDraft({composed:{mode:'bullets',bullets:[{id:'b',text:'  '}]}}),false);
 assert.equal(hasProjectDraft({composed:{mode:'bullets',bullets:[{id:'b',text:'交付成果'}]}}),true);
});

const sourceProject=()=>({id:'p',name:'项目',role:'负责人',stack:'React',situation:'背景。',task:'目标。',actions:[{id:'a',text:'行动。'}],results:[{id:'r',text:'效率提升 30%。'}]});
test('projects start with a factual summary without mutating sources or existing drafts',()=>{
 const p=sourceProject();const before=structuredClone(p);
 assert.equal(projectDraft(p).text,'背景；目标；行动；效率提升 30%。');
 assert.deepEqual(p,before);
 const custom={...p,composed:{mode:'paragraph',text:'已编辑总结',bullets:[],sourceHash:'saved'}};
 assert.equal(projectDraft(custom),custom.composed);
 assert.equal(projectDraft({...custom,composed:{...custom.composed,text:''}}).text,'');
});
test('local format switching uses current wording, preserves decimals and persists',()=>{
 const p={...sourceProject(),composed:{mode:'paragraph',text:'使用 Node.js v3.2；延迟降至 1.4ms。',bullets:[{id:'old',text:'过时文案'}],sourceHash:'saved'}};
 let i=0;const bullets=switchProjectDraftMode(p,'bullets',()=>`b${++i}`);
 assert.deepEqual(bullets.bullets.map(b=>b.text),['使用 Node.js v3.2；','延迟降至 1.4ms。']);
 assert.equal(bullets.bullets[0].id,'old');
 const edited=editProjectDraft({...p,composed:bullets},'使用 Node.js v3.2；\n延迟降至 1.2ms。',()=> 'new');
 const paragraph=switchProjectDraftMode({...p,composed:edited},'paragraph',()=> 'unused');
 assert.equal(paragraph.text,'使用 Node.js v3.2；延迟降至 1.2ms。');
 assert.equal(paragraph.sourceHash,'saved');
 const restored=normalizeDoc({master:{sideProjects:[{...p,composed:paragraph}]}}).master.sideProjects[0];
 assert.equal(projectDraft(restored).text,paragraph.text);
 assert.equal(p.composed.text,'使用 Node.js v3.2；延迟降至 1.4ms。');
});
test('rebuilding a summary uses updated source while leaving the previous draft available for undo',()=>{
 const p={...sourceProject(),composed:{mode:'bullets',text:'旧段落',bullets:[{id:'b',text:'用户修改'}],sourceHash:'saved'}};
 const previous=projectDraft(p);const next=projectDraftFromSource({...p,task:'新目标。'});
 assert.match(next.text,/新目标/);assert.equal(previous.bullets[0].text,'用户修改');assert.equal(p.composed,previous);
});
