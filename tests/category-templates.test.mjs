import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES,EXISTING_CATEGORY_TEMPLATES,availableCategoryName,createMaterialCategory,templatesFromCategories} from '../src/categoryTemplates.ts';
import {normalizeDoc} from '../src/storage.ts';
import {emptyDoc} from '../src/data.ts';

test('templates create empty independent records with unique field identities',()=>{
 for(const template of [...CATEGORY_TEMPLATES,...EXISTING_CATEGORY_TEMPLATES]){
  const a=createMaterialCategory(template.name,template.fields,template);
  const b=createMaterialCategory(template.name,template.fields,template);
  assert.notEqual(a.id,b.id);
  assert.deepEqual(a.items.map(i=>({title:i.title,body:i.body,values:i.values})),[{title:'',body:'',values:{}}]);
  assert.ok(a.fields.every(f=>!b.fields.some(g=>f.id===g.id)));
  const doc=emptyDoc();doc.master.customCategories=[a];
  assert.deepEqual(normalizeDoc(JSON.parse(JSON.stringify(doc))).master.customCategories,[a]);
 }
});
test('reusing an existing category copies schema only and does not mutate source',()=>{
 const original=createMaterialCategory('教学经历',['课程','开始时间'],CATEGORY_TEMPLATES[0]);
 original.items[0].title='私有经历';original.items[0].values[original.fields[0].id]='课程内容';
 const master=emptyDoc().master;master.customCategories=[original];
 const snapshot=JSON.stringify(master);
 const template=templatesFromCategories(master)[0];
 const copy=createMaterialCategory('教学经历 2',template.fields,template);
 assert.deepEqual(copy.fields.map(f=>f.label),['课程','开始时间']);
 assert.equal(copy.items[0].title,'');assert.deepEqual(copy.items[0].values,{});
 assert.equal(JSON.stringify(master),snapshot);
 master.hiddenCategories=[`custom:${original.id}`];assert.deepEqual(templatesFromCategories(master),[]);
});
test('custom fields are trimmed and deduplicated; category naming skips existing suffixes',()=>{
 assert.deepEqual(createMaterialCategory(' 教学经历 ',['课程',' 课程 ','','学期']).fields.map(f=>f.label),['课程','学期']);
 assert.equal(availableCategoryName('工作经历',['工作经历','工作经历 2','工作经历 4']),'工作经历 3');
 assert.equal(availableCategoryName('奖项',[]),'奖项');
});
