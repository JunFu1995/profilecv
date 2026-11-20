import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDoc} from '../src/data.ts';
import {createVariant,editableVariantContent,updateVariantContent,resolveVariant,supplementSource,assignProjectsToWork,assignProjectsToIndependent,toggleGroup,allProjects} from '../src/variants.ts';
import {normalizeDoc} from '../src/storage.ts';
const project=(id,name)=>({id,name,role:'负责人',start:'',end:'',stack:'',situation:'',task:'',actions:[],results:[]});
const work=(id)=>({id,company:id,role:'工程师',start:'',end:'',location:'',detail:'',bullets:[],projects:[]});
test('company project survives selection, independent editing and storage roundtrip',()=>{
 const master=emptyDoc().master;master.work=[{...work('company'),projects:[project('p','只有名称的项目')]}];
 let variant=createVariant(master,'投递版');
 const content=editableVariantContent(master,variant);assert.equal(content.work[0].projects[0].id,'p');assert.equal(content.sideProjects.length,0);
 variant=updateVariantContent(variant,content);
 const saved=normalizeDoc({...emptyDoc(),master,variants:[variant]});
 assert.equal(editableVariantContent(saved.master,saved.variants[0]).work[0].projects[0].id,'p');
 assert.equal(resolveVariant(saved.master,saved.variants[0]).projects[0].company,'company');
});
test('import and move to company retains variant edits, does not duplicate projects or change library',()=>{
 const master=emptyDoc().master;master.work=[work('a'),work('b')];master.sideProjects=[{...project('p','素材项目'),composed:{mode:'paragraph',text:'已整理成果',bullets:[],sourceHash:''}},project('new','待导入项目')];
 let variant=createVariant(master,'版本');variant.projects=variant.projects.filter(g=>g.groupId==='p');
 const content=editableVariantContent(master,variant);content.sideProjects[0].name='本版改写';variant=updateVariantContent(variant,content);
 const source=supplementSource(master,variant);const picks=toggleGroup(variant,source,'projects','new',true);
 const imported=assignProjectsToWork(editableVariantContent(source,{...picks,content:source}),'a',['p','new']);
 assert.deepEqual(imported.work[0].projects.map(p=>p.name),['本版改写','待导入项目']);assert.equal(imported.sideProjects.length,0);
 const moved=assignProjectsToWork(imported,'b',['p']);assert.equal(moved.work[0].projects.length,1);assert.equal(moved.work[1].projects[0].composed.text,'已整理成果');
 assert.equal(allProjects(assignProjectsToWork(moved,'b',['p'])).length,2);
 assert.equal(master.sideProjects[0].name,'素材项目');assert.equal(master.work[0].projects.length,0);
 const restored=editableVariantContent(master,updateVariantContent(variant,moved));assert.equal(restored.work[1].projects[0].id,'p');
 moved.work[1].projects[0].name='移动后继续编辑';assert.equal(imported.work[0].projects[0].name,'本版改写');
});
test('supplement merges source projects once and keeps current company ownership and wording',()=>{
 const master=emptyDoc().master;master.work=[{...work('a'),projects:[project('p','原名'),project('q','新项目')]},work('b')];
 let v=createVariant(master,'版本');v.projects=v.projects.filter(p=>p.groupId==='p');
 const current=assignProjectsToWork(editableVariantContent(master,v),'b',['p']);current.work[1].projects[0].name='本版名称';v=updateVariantContent(v,current);
 const merged=supplementSource(master,v);assert.deepEqual(merged.work[0].projects.map(p=>p.id),['q']);assert.equal(merged.work[1].projects[0].name,'本版名称');assert.equal(allProjects(merged).length,2);
});


test('import picker shows the active draft, and hides retired work descriptions', async () => {
 const {pickerGroups}=await import('../src/materialGroups.ts');
 const master=emptyDoc().master;
 master.work=[{...work('a'),bullets:[{id:'old',text:'不再显示的工作总结'}],projects:[{...project('p','项目'),composed:{mode:'paragraph',text:'首屏从 3.2 秒降至 1.4 秒',bullets:[],sourceHash:''}}]}];
 master.research=[{...work('r'),summary:'研究总结',summaryOnly:true,bullets:[{id:'hidden',text:'隐藏的研究要点'}]}];
 assert.equal(pickerGroups(master,'projects')[0].preview,'首屏从 3.2 秒降至 1.4 秒');
 assert.deepEqual(pickerGroups(master,'work')[0].bullets,[]);
 assert.equal(pickerGroups(master,'research')[0].preview,'研究总结');
 assert.deepEqual(pickerGroups(master,'research')[0].bullets,[]);
});


test('independent supplement detaches library company projects before view resolution and persists ownership',()=>{
 const master=emptyDoc().master;
 master.work=[{...work('a'),projects:[{...project('p','公司项目'),composed:{mode:'paragraph',text:'完整项目总结',bullets:[],sourceHash:''}}]}];
 let v=createVariant(master,'版本');v.work=[];v.projects=[];
 const baseline=structuredClone(master);
 const source=supplementSource(master,v);
 const picks=toggleGroup(v,source,'projects','p',true);
 const independent=assignProjectsToIndependent(source,['p']);
 v=updateVariantContent(picks,editableVariantContent(independent,{...picks,content:independent}));
 const saved=normalizeDoc({...emptyDoc(),master,variants:[v]});
 const view=resolveVariant(saved.master,saved.variants[0]);
 assert.equal(view.work.length,0,'must not automatically bring the original company into this version');
 assert.equal(view.projects.length,1);
 assert.equal(view.projects[0].workId,undefined);
 assert.equal(view.projects[0].company,'');
 assert.equal(view.projects[0].composed.text,'完整项目总结');
 assert.equal(supplementSource(master,v).sideProjects[0].id,'p','later supplements preserve independent ownership');
 assert.deepEqual(master,baseline);
});

test('moving an already selected company project to independent preserves edits and other projects without duplicates',()=>{
 const master=emptyDoc().master;master.work=[{...work('a'),projects:[project('p','原名'),project('q','留在公司')]}];
 master.sideProjects=[project('s','原有独立项目')];
 let v=createVariant(master,'版本');
 const content=editableVariantContent(master,v);
 content.work[0].projects[0].name='本版改名';
 content.work[0].projects[0].composed={mode:'paragraph',text:'本版总结',bullets:[],sourceHash:''};
 v=updateVariantContent(v,content);
 const source=assignProjectsToIndependent(supplementSource(master,v),['p']);
 v=updateVariantContent(v,editableVariantContent(source,{...v,content:source}));
 const result=editableVariantContent(master,v);
 assert.deepEqual(result.work[0].projects.map(p=>p.id),['q']);
 assert.deepEqual(result.sideProjects.map(p=>p.id).sort(),['p','s']);
 assert.equal(result.sideProjects.find(p=>p.id==='p').name,'本版改名');
 assert.equal(result.sideProjects.find(p=>p.id==='p').composed.text,'本版总结');
 assert.equal(allProjects(assignProjectsToIndependent(result,['p'])).length,3);
 assert.equal(master.work[0].projects[0].name,'原名');
});

test('company supplement does not bring an unselected source company into the version',async()=>{
 const {applyVariantSupplement}=await import('../src/supplement.ts');
 const master=emptyDoc().master;
 master.work=[{...work('source'),projects:[project('p','导入项目')]},work('target')];
 let v=createVariant(master,'版本');v.work=v.work.filter(w=>w.groupId==='target');v.projects=[];
 const selected=toggleGroup(v,supplementSource(master,v),'projects','p',true);
 v=applyVariantSupplement(master,v,selected,['p'],{kind:'work',workId:'target'});
 const view=resolveVariant(master,v);
 assert.deepEqual(view.work.map(w=>w.id),['target']);
 assert.equal(view.projects[0].workId,'target');
});

test('supplement roundtrip independent to company A to company B and back retains edited summary and locate paths',async()=>{
 const {applyVariantSupplement}=await import('../src/supplement.ts');
 const {locatePath,fieldLocateId}=await import('../src/locate.ts');
 const master=emptyDoc().master;master.work=[work('a'),work('b')];
 master.sideProjects=[{...project('p','项目'),situation:'原始背景',actions:[{id:'act',text:'原始行动'}],results:[{id:'res',text:'原始成果'}]}];
 let v=createVariant(master,'版本');const local=editableVariantContent(master,v);
 local.sideProjects[0].composed={mode:'paragraph',text:'本版手工总结：优化延迟并完成验证。',bullets:[],sourceHash:''};
 local.sideProjects[0].actions[0].text='本版行动';
 v=updateVariantContent(v,local);const baseline=structuredClone(master);
 for(const owner of ['a','b',null,'b',null]){
  v=applyVariantSupplement(master,v,v,['p'],owner?{kind:'work',workId:owner}:{kind:'independent'});
  v=normalizeDoc({...emptyDoc(),master,variants:[v]}).variants[0];
  const content=editableVariantContent(master,v);const refs=allProjects(content).filter(r=>r.project.id==='p');
  assert.equal(refs.length,1);assert.equal(refs[0].workId,owner??undefined);
  assert.equal(refs[0].project.composed.text,'本版手工总结：优化延迟并完成验证。');
  assert.equal(refs[0].project.actions[0].text,'本版行动');
  const field=fieldLocateId('p','name');
  assert.deepEqual(locatePath(content,field),owner?[owner,'p',field]:['p',field]);
  assert.equal(resolveVariant(master,v).projects.filter(p=>p.id==='p').length,1);
 }
 assert.deepEqual(master,baseline);
});
