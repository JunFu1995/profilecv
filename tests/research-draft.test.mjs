import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDoc} from '../src/storage.ts';
import {researchDraft,researchDraftFromSource,researchSource,editResearchSource,editDraft,switchDraftMode} from '../src/draftEditing.ts';
import {buildView,createVariant,editableVariantContent,updateVariantContent} from '../src/variants.ts';
import {flattenView} from '../src/lint.ts';
import {locatePath} from '../src/locate.ts';
import {pickerGroups} from '../src/materialGroups.ts';
const master = () => normalizeDoc({master:{research:[{id:'r',company:'实验室',summary:'研究背景。',bullets:[{id:'b',text:'完成 3 组实验。'}]}]}}).master;

test('legacy research becomes one factual paragraph while hidden evidence remains hidden',()=>{
 const w=master().research[0];const before=structuredClone(w);
 assert.equal(researchDraft(w).text,'研究背景；完成 3 组实验。');
 assert.deepEqual(w,before);
 assert.equal(researchDraft({...w,summaryOnly:true}).text,'研究背景。');
 const hidden={...w,summary:'',summaryOnly:true};
 assert.equal(researchDraft(hidden).text,'');
 assert.match(researchDraftFromSource(hidden).text,/完成 3 组实验/);
 assert.equal(researchSource(hidden).action,'完成 3 组实验。');
});
test('research source updates leave edited summary intact through save and format conversion',()=>{
 const w=master().research[0];const draft=editDraft(researchDraft(w),'使用 v3.2；完成 6 组实验。',()=> 'id');
 const updated={...w,researchDraft:draft,...editResearchSource(w,'task','补充目标')};
 const saved=normalizeDoc({master:{research:[updated]}}).master.research[0];
 assert.equal(researchDraft(saved).text,draft.text);
 assert.equal(saved.star.task,'补充目标');assert.equal(saved.bullets[0].text,w.bullets[0].text);
 const split=switchDraftMode(draft,'bullets',()=> 'new');
 assert.deepEqual(split.bullets.map(b=>b.text),['使用 v3.2；','完成 6 组实验。']);
 assert.equal(switchDraftMode(split,'paragraph',()=> 'unused').text,draft.text);
});
test('saved empty research draft stays empty in preview, matching and picker',async()=>{
 const m=master();m.research[0].researchDraft=editDraft(researchDraft(m.research[0]),'',()=> 'unused');
 const saved=normalizeDoc({master:m}).master;const view=buildView(saved);
 assert.equal(researchDraft(saved.research[0]).text,'');
 assert.doesNotMatch(flattenView(view),/研究背景|实验。/);
 assert.equal(pickerGroups(saved,'research')[0].preview,'');
 assert.deepEqual(pickerGroups(saved,'research')[0].bullets,[]);
});
test('legacy research bullets render as one paragraph and retain summary navigation',async()=>{
 const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const {Paper}=await import('../src/components/Paper.tsx');
 const m=master();let i=0;m.research[0].researchDraft=switchDraftMode(researchDraft(m.research[0]),'bullets',()=>`draft-${++i}`);
 const html=renderToStaticMarkup(createElement(Paper,{view:buildView(m),locale:'zh',accent:'#000',scale:1,stretch:0,template:'classic'}));
 assert.equal((html.match(/data-locate="r::summary"/g)??[]).length,1);
 for(const b of m.research[0].researchDraft.bullets) assert.deepEqual(locatePath(m,b.id),['r','r::summary']);
 assert.deepEqual(locatePath(m,'b'),['r','r::summary']);
});
test('research draft persists in a version without changing the material library',()=>{
 const m=master();const v=createVariant(m,'测试');const content=editableVariantContent(m,v);
 content.research[0].researchDraft=editDraft(researchDraft(content.research[0]),'完成 6 组验证实验。',()=> 'id');
 const updated=updateVariantContent(v,content);const saved=normalizeDoc({master:m,variants:[updated]});
 assert.equal(saved.variants[0].content.research[0].researchDraft.text,'完成 6 组验证实验。');
 assert.equal(saved.master.research[0].researchDraft,undefined);
});
test('English preview translates only the active research summary, keeping sources unchanged',async()=>{
 const {localizeView,collectStrings,mergeTranslations}=await import('../src/translate.ts');
 const m=master();m.research[0].researchDraft={mode:'paragraph',text:'完成 6 组实验。',bullets:[{id:'hidden',text:'隐藏草稿'}],sourceHash:''};
 const view=buildView(m);const texts=collectStrings(view);
 assert.ok(texts.includes('完成 6 组实验。'));assert.ok(!texts.includes('隐藏草稿'));assert.ok(!texts.includes('完成 3 组实验。'));
 const localized=localizeView(view,mergeTranslations({},['完成 6 组实验。'],['Completed 6 experiments.']));
 assert.equal(researchDraft(localized.view.research[0]).text,'Completed 6 experiments.');
 assert.equal(m.research[0].researchDraft.text,'完成 6 组实验。');
});
