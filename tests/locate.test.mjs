import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../src/data.ts';
import { locate, locatePath, locatePreview, registerLocate } from '../src/locate.ts';

test('locate paths include company, nested project, skills section and bullet parents', () => {
  const master=emptyDoc().master;
  master.work=[{id:'work',bullets:[{id:'wb'}],projects:[{id:'project',actions:[{id:'action'}],results:[],composed:{bullets:[{id:'composed'}]}}]}];
  master.education=[{id:'school',bullets:[{id:'eb'}]}];
  master.skills=[{id:'skill'}];
  master.sideProjects=[{id:'side',actions:[],results:[{id:'result'}]}];
  assert.deepEqual(locatePath(master,'action'),['work','project','project::actions']);
  assert.deepEqual(locatePath(master,'composed'),['work','project','project::summary']);
  assert.deepEqual(locatePath(master,'wb'),['work']);
  assert.deepEqual(locatePath(master,'eb'),['school','eb']);
  assert.deepEqual(locatePath(master,'skill'),['skills','skill']);
  assert.deepEqual(locatePath(master,'result'),['side','side::results']);
  assert.deepEqual(locatePath(master,'basics'),['basics']);
});

test('nested navigation waits for child registration, never selects preview as editor fallback', () => {
  const queue=[]; const events=[]; const cleanups=[];
  const originals={window:globalThis.window,document:globalThis.document,CSS:globalThis.CSS};
  const target={getClientRects:()=>[{}],scrollIntoView:()=>events.push('scroll'),classList:{remove(){},add(){}},offsetWidth:1};
  globalThis.window={setTimeout:fn=>queue.push(fn)};
  globalThis.CSS={escape:x=>x};
  globalThis.document={querySelector:selector=>{assert.equal(selector,'.panel');return {querySelector:selector=>selector.includes('child')?target:null};}};
  try {
    cleanups.push(registerLocate('parent',()=>{events.push('parent');cleanups.push(registerLocate('child',()=>events.push('child')));}));
    locate('child',{path:['parent','child']});
    assert.deepEqual(events,['parent']);
    while(queue.length)queue.shift()();
    assert.deepEqual(events,['parent','child','scroll']);
    events.length=0;
    locate('child'); locate('missing');
    while(queue.length)queue.shift()();
    assert.deepEqual(events,['child']);
  } finally {cleanups.forEach(off=>off());Object.assign(globalThis,originals);}
});

test('editor focus can locate non-bullet preview regions and falls back to visible parent', () => {
  const originals={window:globalThis.window,document:globalThis.document,CSS:globalThis.CSS};
  const selectors=[]; let scrolled=0;
  globalThis.window={setTimeout(){}};globalThis.CSS={escape:x=>x};
  globalThis.document={querySelector:selector=>{selectors.push(selector);return selector.includes('project')?{scrollIntoView(){scrolled++;},classList:{add(){},remove(){}},offsetWidth:1}:null;}};
  const parent={dataset:{locate:'project'},parentElement:null};
  const child={dataset:{locate:'hidden-action'},parentElement:{closest:()=>parent}};
  try {
    assert.equal(locatePreview({closest:()=>child}),'project');
    assert.equal(scrolled,1);
    assert.match(selectors[1],/data-locate="project"/);
  } finally {Object.assign(globalThis,originals);}
});

test('research summary and legacy evidence share the summary edit target', () => {
  const master=emptyDoc().master;
  master.research=[{id:'research',summary:'研究总结',bullets:[{id:'evidence'}],projects:[]}];
  assert.deepEqual(locatePath(master,'research::summary'),['research','research::summary']);
  assert.deepEqual(locatePath(master,'evidence'),['research','research::summary']);
});

test('variant navigation follows preserved project ownership', async () => {
  const {sampleDoc}=await import('../src/data.ts');
  const {editableVariantContent}=await import('../src/variants.ts');
  const doc=sampleDoc();
  const master=editableVariantContent(doc.master,doc.variants[0]);
  const owner=master.work.find(w=>w.projects.length);
  assert.ok(owner);
  const project=owner.projects[0];
  assert.deepEqual(locatePath(master,`${project.id}::summary`),[owner.id,project.id,`${project.id}::summary`]);
});

test('paper defaults projects to summary targets and preserves research evidence targets', async () => {
  const {createElement}=await import('react');
  const {renderToStaticMarkup}=await import('react-dom/server');
  const {Paper}=await import('../src/components/Paper.tsx');
  const {buildView}=await import('../src/variants.ts');
  const view=buildView(emptyDoc().master);
  view.research=[{id:'research',company:'机构',role:'',start:'',end:'',summary:'研究总结',summaryOnly:true,bullets:[],projects:[]}];
  const project={id:'p',name:'项目',start:'',end:'',role:'',company:'',stack:'',situation:'背景',task:'目标',actions:[{id:'a',text:'行动'}],results:[{id:'r',text:'成果'}]};
  view.projects=[project];
  const render=()=>renderToStaticMarkup(createElement(Paper,{view,locale:'zh',accent:'#000',scale:1,stretch:0,template:'classic'}));
  let html=render();
  for(const target of ['research::summary','p::summary']) assert.ok(html.includes(`data-locate="${target}"`),target);
  project.composed={mode:'paragraph',text:'项目总结',bullets:[],sourceHash:''};
  html=render();assert.match(html,/data-locate="p::summary">项目总结/);
  project.composed={mode:'bullets',text:'',bullets:[{id:'cb',text:'总结要点'}],sourceHash:''};
  assert.match(render(),/data-locate="p::summary">总结要点/);
  project.composed={mode:'paragraph',text:'',bullets:[],sourceHash:''};
  assert.doesNotMatch(render(),/背景|目标|行动|成果|项目总结|总结要点/);
});

test('focus selects a visible editable field and skips disabled or hidden controls', () => {
  const originals={window:globalThis.window,document:globalThis.document,CSS:globalThis.CSS};
  const queue=[];let focused='';
  const field=(id,visible,disabled=false)=>({getClientRects:()=>visible?[{}]:[],hasAttribute:()=>disabled,focus:()=>{focused=id;}});
  const target={getClientRects:()=>[{}],scrollIntoView(){},classList:{remove(){},add(){}},offsetWidth:1,querySelectorAll:selector=>{
    assert.match(selector,/:not\(\[type=file\]\)/);
    return [field('hidden',false),field('disabled',true,true),field('name',true)];
  }};
  globalThis.window={setTimeout:fn=>queue.push(fn)};globalThis.CSS={escape:x=>x};
  globalThis.document={querySelector:()=>({querySelector:()=>target})};
  try {locate('basics',{focus:true});while(queue.length)queue.shift()();assert.equal(focused,'name');}
  finally {Object.assign(globalThis,originals);}
});

test('summary selection follows bullet identity across repeated lines, blank lines and reorder', async () => {
  const {summarySelection}=await import('../src/locate.ts');
  const master=emptyDoc().master;
  const bullets=[{id:'first',text:'相同内容'},{id:'blank',text:''},{id:'second',text:'相同内容'},{id:'last',text:'最后一条。'}];
  const draft={mode:'bullets',text:'',sourceHash:'',bullets};
  master.sideProjects=[{id:'side',composed:draft,actions:[],results:[]}];
  assert.deepEqual(summarySelection(master,'second'),{start:6,end:10});
  assert.deepEqual(locatePath(master,'second'),['side','side::summary']);
  master.sideProjects=[];
  master.work=[{id:'company',projects:[{id:'project',composed:draft,actions:[],results:[]}],bullets:[]}];
  assert.deepEqual(summarySelection(master,'last'),{start:11,end:16});
  assert.deepEqual(locatePath(master,'last'),['company','project','project::summary']);
  master.work=[];
  master.research=[{id:'research',researchDraft:draft,projects:[],bullets:[]}];
  assert.deepEqual(summarySelection(master,'second'),{start:6,end:10});
  bullets.reverse();assert.deepEqual(summarySelection(master,'last'),{start:0,end:5});
  assert.deepEqual(locatePath(master,'last'),['research','research::summary']);
  draft.mode='paragraph';assert.equal(summarySelection(master,'last'),undefined);
});

test('preview navigation sets the matching textarea range before focus triggers reverse linking',()=>{
  const originals={window:globalThis.window,document:globalThis.document,CSS:globalThis.CSS};
  const queue=[];const events=[];
  const field={tagName:'TEXTAREA',getClientRects:()=>[{}],hasAttribute:()=>false,setSelectionRange:(start,end)=>events.push(['select',start,end]),focus:()=>events.push(['focus'])};
  const target={getClientRects:()=>[{}],scrollIntoView(){},classList:{remove(){},add(){}},offsetWidth:1,querySelectorAll:()=>[field]};
  globalThis.window={setTimeout:fn=>queue.push(fn)};globalThis.CSS={escape:x=>x};
  globalThis.document={querySelector:()=>({querySelector:()=>target})};
  try {locate('second',{focus:true,path:['summary'],selection:{start:6,end:10}});while(queue.length)queue.shift()();assert.deepEqual(events,[['select',6,10],['focus']]);}
  finally {Object.assign(globalThis,originals);}
});

test('reverse focus highlights the matching preview line instead of the first bullet',()=>{
  const originals={window:globalThis.window,document:globalThis.document,CSS:globalThis.CSS};
  let matched='';const node={dataset:{locate:'research::summary'}};
  globalThis.window={setTimeout(){}};globalThis.CSS={escape:x=>x};
  globalThis.document={querySelector:selector=>{matched=selector;return {scrollIntoView(){},classList:{add(){},remove(){}},offsetWidth:1};}};
  try {assert.equal(locatePreview({tagName:'TEXTAREA',value:'第一条\n\n第三条',selectionStart:5,closest:()=>node}),'research::summary');assert.match(matched,/data-summary-line="2"/);}
  finally {Object.assign(globalThis,originals);}
});

test('caret line follows the active end of forward and backward selections, including blank lines',async()=>{
 const {summaryCaretLine}=await import('../src/locate.ts');
 const field={value:'首条\n\n末条',selectionStart:0,selectionEnd:6,selectionDirection:'forward'};
 assert.equal(summaryCaretLine(field),2);
 assert.equal(summaryCaretLine({...field,selectionDirection:'backward'}),0);
 assert.equal(summaryCaretLine({...field,selectionStart:3,selectionEnd:3}),1);
});

test('a blank summary line locates the whole summary instead of an unrelated first item',()=>{
 const originals={window:globalThis.window,document:globalThis.document,CSS:globalThis.CSS};
 const queried=[];let scrolled=false;
 const group={scrollIntoView(){scrolled=true;},classList:{add(){},remove(){}},offsetWidth:1};
 globalThis.window={setTimeout(){}};globalThis.CSS={escape:x=>x};
 globalThis.document={querySelector:selector=>{queried.push(selector);return selector.includes('data-summary-group')?group:null;}};
 try {
  assert.equal(locatePreview({tagName:'TEXTAREA',value:'首条\n\n末条',selectionStart:3,selectionEnd:3,closest:()=>({dataset:{locate:'project::summary'}})}),'project::summary');
  assert.equal(scrolled,true);assert.equal(queried.length,2);assert.match(queried[0],/data-summary-line="1"/);assert.match(queried[1],/data-summary-group/);
 } finally {Object.assign(globalThis,originals);}
});

test('reverse linking clears previous highlights and stale timers cannot erase the current highlight',()=>{
 const originals={window:globalThis.window,document:globalThis.document,CSS:globalThis.CSS};
 const queue=[];const scrolls=[];
 const target=id=>({highlighted:false,scrollIntoView(){scrolls.push(id);},classList:{add(){this.owner.highlighted=true;},remove(){this.owner.highlighted=false;}},offsetWidth:1});
 const first=target('first'),second=target('second');first.classList.owner=first;second.classList.owner=second;
 globalThis.window={setTimeout:fn=>queue.push(fn)};globalThis.CSS={escape:x=>x};
 globalThis.document={querySelector:selector=>selector.includes('data-summary-line="0"')?first:second};
 const source={tagName:'TEXTAREA',value:'首条\n末条',selectionStart:0,selectionEnd:0,closest:()=>({dataset:{locate:'research::summary'}})};
 try {
  locatePreview(source);assert.equal(first.highlighted,true);
  source.selectionStart=source.selectionEnd=3;locatePreview(source,{scroll:'if-changed'});
  assert.equal(first.highlighted,false);assert.equal(second.highlighted,true);
  locatePreview(source,{scroll:'if-changed'});assert.deepEqual(scrolls,['first','second']);
  queue.shift()();queue.shift()();assert.equal(second.highlighted,true);
  queue.shift()();assert.equal(second.highlighted,false);
  locatePreview(source);assert.deepEqual(scrolls,['first','second','second']);
 } finally {Object.assign(globalThis,originals);}
});
