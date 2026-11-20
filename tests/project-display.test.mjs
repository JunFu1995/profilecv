import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDoc} from '../src/storage.ts';
import {buildView,createVariant,editableVariantContent,updateVariantContent} from '../src/variants.ts';
import {projectDisplayDraft} from '../src/draftEditing.ts';
import {flattenView} from '../src/lint.ts';
import {locatePath,summarySelection} from '../src/locate.ts';
import {citationPreview} from '../src/publication.ts';
import {collectStrings,localizeView,mergeTranslations} from '../src/translate.ts';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Paper} from '../src/components/Paper.tsx';
const master=()=>normalizeDoc({master:{sideProjects:[{id:'p',name:'项目',situation:'旧系统延迟高。',task:'降低延迟。',actions:[{id:'a',text:'重构 Redis 缓存。'},{id:'a2',text:'增加监控。'}],results:[{id:'r',text:'延迟下降 30%。'}],composed:{mode:'paragraph',text:'使用 Python 完成分析。',bullets:[],sourceHash:'old'}}]}}).master;
const render=m=>renderToStaticMarkup(createElement(Paper,{view:buildView(m),locale:'zh',accent:'#000',scale:1,stretch:0,template:'classic'}));
test('project display switch selects STAR or summary without overwriting either version',()=>{
 const m=master();const before=structuredClone(m.sideProjects[0]);const p=m.sideProjects[0];
 assert.match(render(m),/使用 Python/);assert.doesNotMatch(render(m),/重构 Redis/);
 p.display='star';const html=render(m);
 for(const field of ['situation','task','actions','results'])assert.ok(html.includes(`data-locate="p::${field}"`));
 assert.match(html,/重构 Redis/);assert.doesNotMatch(html,/使用 Python/);
 assert.match(flattenView(buildView(m)),/重构 Redis/i);assert.doesNotMatch(flattenView(buildView(m)),/使用 Python/i);
 assert.deepEqual(summarySelection(m,'a2'),{start:13,end:18});
 assert.deepEqual(locatePath(m,'a2'),['p','p::actions']);
 const saved=normalizeDoc({master:m}).master;assert.equal(saved.sideProjects[0].display,'star');
 p.display='summary';assert.equal(projectDisplayDraft(p).text,before.composed.text);
 assert.deepEqual(p.actions,before.actions);assert.deepEqual(p.composed,before.composed);
});
test('empty selected STAR never restores a hidden summary, and display persists only in edited version',()=>{
 const m=master();const v=createVariant(m,'测试');const content=editableVariantContent(m,v);
 content.sideProjects[0].display='star';content.sideProjects[0].situation='';content.sideProjects[0].task='';content.sideProjects[0].actions=[];content.sideProjects[0].results=[];
 const saved=normalizeDoc({master:m,variants:[updateVariantContent(v,content)]});
 assert.equal(saved.variants[0].content.sideProjects[0].display,'star');assert.equal(saved.master.sideProjects[0].display,undefined);
 assert.doesNotMatch(render(saved.variants[0].content),/使用 Python/);
});
test('translation follows the selected project display and leaves alternate content intact',()=>{
 const m=master();const p=m.sideProjects[0];let strings=collectStrings(buildView(m));
 assert.ok(strings.includes(p.composed.text));assert.ok(!strings.includes(p.situation));
 p.display='star';strings=collectStrings(buildView(m));assert.ok(strings.includes(p.situation));assert.ok(!strings.includes(p.composed.text));
 const localized=localizeView(buildView(m),mergeTranslations({},[p.situation],['The old system had high latency.']));
 assert.equal(localized.view.projects[0].situation,'The old system had high latency.');assert.equal(localized.view.projects[0].composed.text,p.composed.text);
});
test('DOI is omitted from both citations and resume output but survives saving',()=>{
 const m=normalizeDoc({master:{publications:[{id:'pub',title:'论文标题',authors:'作者',venue:'期刊',year:'2024',doi:'10.1234/private-id'}]}}).master;
 assert.doesNotMatch(citationPreview(m.publications[0]),/doi|10.1234/);
 assert.doesNotMatch(render(m),/doi|10.1234/);assert.match(render(m),/论文标题/);
 assert.equal(normalizeDoc({master:m}).master.publications[0].doi,'10.1234/private-id');
});

test('company projects render under their employer and independent projects render once in their own section',()=>{
 const m=normalizeDoc({master:{work:[{id:'employer',company:'测试公司',projects:[{id:'company-project',name:'公司内项目',situation:'公司项目正文',composed:{mode:'paragraph',text:'公司项目正文',bullets:[],sourceHash:''}}]}],sideProjects:[{id:'independent',name:'个人项目',situation:'独立项目正文'}]}}).master;
 m.work[0].projects[0].composed={mode:'paragraph',text:'公司项目正文',bullets:[],sourceHash:''};
 const html=render(m);const sections=html.split('<section class="block">');
 const work=sections.find(s=>s.includes('>工作经历</h2>'));const independent=sections.find(s=>s.includes('>独立项目</h2>'));
 assert.match(work,/公司内项目/);assert.doesNotMatch(work,/个人项目/);
 assert.match(independent,/个人项目/);assert.doesNotMatch(independent,/公司内项目/);
 assert.equal((html.match(/data-locate="company-project"/g)??[]).length,1);
 assert.match(work,/data-locate="company-project::summary"/);
 const v=createVariant(m,'测试');const selected=buildView(m);
 assert.equal(selected.projects.find(p=>p.id==='company-project').workId,'employer');
 assert.ok(v.projects.some(p=>p.groupId==='company-project'));
});

test('research switches STAR and summary without losing either, persists choice and locates each field',()=>{
 const m=normalizeDoc({master:{research:[{id:'research',company:'研究机构',star:{situation:'研究背景',task:'验证目标',action:'开展实验',result:'实验结果'},researchDraft:{mode:'paragraph',text:'已编辑的总结',bullets:[],sourceHash:'saved'}}]}}).master;
 const w=m.research[0];const original=structuredClone(w);
 assert.match(render(m),/已编辑的总结/);assert.doesNotMatch(render(m),/开展实验/);
 w.researchDisplay='star';const html=render(m);
 for(const field of ['situation','task','action','result']) {
  assert.match(html,new RegExp(`data-locate="research::${field}"`));
  assert.deepEqual(locatePath(m,`research::${field}`),['research',`research::${field}`]);
 }
 assert.doesNotMatch(html,/已编辑的总结/);assert.match(flattenView(buildView(m)),/开展实验/);
 assert.equal(normalizeDoc({master:m}).master.research[0].researchDisplay,'star');
 const strings=collectStrings(buildView(m));assert.ok(strings.includes('开展实验'));assert.ok(!strings.includes('已编辑的总结'));
 const translated=localizeView(buildView(m),mergeTranslations({},['开展实验'],['Conducted experiments']));
 assert.equal(translated.view.research[0].star.action,'Conducted experiments');
 assert.deepEqual(w.researchDraft,original.researchDraft);
 w.researchDisplay='summary';assert.match(render(m),/已编辑的总结/);assert.deepEqual(w.star,original.star);
 w.researchDisplay='star';w.star={situation:'',task:'',action:'',result:''};
 assert.doesNotMatch(render(m),/已编辑的总结/);
});

test('name and role links resolve to distinct fields including projects nested in work',()=>{
 const m=normalizeDoc({master:{work:[{id:'w',company:'公司',role:'工程师',projects:[{id:'p',name:'公司项目',role:'工程师'}]}],sideProjects:[{id:'s',name:'独立项目',role:'工程师'}],research:[{id:'r',company:'研究机构',role:'工程师'}]}}).master;
 const html=render(m);
 for(const [id,parent,fields] of [['w',null,['company','role']],['p','w',['name','role']],['s',null,['name','role']],['r',null,['company','role']]]) {
  for(const field of fields){
   const target=`${id}::${field}`;
   assert.deepEqual(locatePath(m,target),[...(parent?[parent]:[]),id,target]);
   assert.ok(html.includes(`data-locate="${target}"`));
  }
 }
});

test('dates and stacks have distinct links, including nested projects and incomplete dates',()=>{
 const dates={start:'2022.06',end:'至今'};
 const m=normalizeDoc({master:{work:[{id:'w',company:'公司',...dates,location:'杭州',projects:[{id:'p',name:'公司项目',...dates,actions:[],results:[],stack:'Go · MySQL'}]}],sideProjects:[{id:'s',name:'独立项目',...dates,actions:[],results:[],stack:'React'}],research:[{id:'r',company:'研究机构',...dates,location:'武汉'}]}}).master;
 const html=render(m);
 for(const [id,parent,fields] of [['w',null,['start','end']],['p','w',['start','end','stack']],['s',null,['start','end','stack']],['r',null,['start','end']]]) {
  for(const field of fields){
   const target=`${id}::${field}`;
   assert.deepEqual(locatePath(m,target),[...(parent?[parent]:[]),id,target]);
   assert.equal(html.split(`data-locate="${target}"`).length-1,1,target);
  }
 }
 m.work[0].start='';m.sideProjects[0].end='';m.research[0].start='';m.research[0].end='';
 const incomplete=render(m);
 assert.match(incomplete,/<span class="entry-date"><span data-locate="w::end">至今<\/span><\/span>/);
 assert.match(incomplete,/<span class="entry-date"><span data-locate="s::start">2022.06<\/span><\/span>/);
 assert.doesNotMatch(incomplete,/data-locate="(?:w::start|s::end|r::start|r::end)"/);
});


test('resume omits all location fields while retaining their saved values',()=>{
 const m=normalizeDoc({master:{basics:{name:'测试',city:'基本信息城市'},work:[{id:'w',company:'公司',location:'工作城市'}],research:[{id:'r',company:'机构',location:'科研城市'}],education:[{id:'e',org:'学校',location:'教育城市'}]}}).master;
 const html=render(m);
 for(const city of ['基本信息城市','工作城市','科研城市','教育城市'])assert.ok(!html.includes(city));
 assert.doesNotMatch(html,/entry-loc/);
 assert.equal(m.basics.city,'基本信息城市');
 assert.equal(m.work[0].location,'工作城市');
 assert.equal(m.research[0].location,'科研城市');
 assert.equal(m.education[0].location,'教育城市');
});
