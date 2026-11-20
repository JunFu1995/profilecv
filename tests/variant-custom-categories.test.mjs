import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDoc} from '../src/data.ts';
import {createMaterialCategory,CATEGORY_TEMPLATES} from '../src/categoryTemplates.ts';
import {createVariant,editableVariantContent,updateVariantContent,resolveVariant,supplementSource} from '../src/variants.ts';
import {recommendMaterials,variantFromRecommendations} from '../src/recommendations.ts';
import {selectCustomItem,customItemLocateId,customCategoryLocateId} from '../src/customCategories.ts';
import {normalizeDoc} from '../src/storage.ts';
import {locatePath,fieldLocateId} from '../src/locate.ts';
import {localizeView,collectStrings,textKey} from '../src/translate.ts';

function fixture(){
 const doc=emptyDoc();
 const c=createMaterialCategory('荣誉奖项',['颁发机构','时间'],CATEGORY_TEMPLATES[2]);
 c.items=[{id:'a',title:'一等奖',body:'真实成果\n个人贡献',values:{[c.fields[0].id]:'机构甲',[c.fields[1].id]:'2025'}},{id:'b',title:'二等奖',body:'第二项',values:{}}];
 const custom=createMaterialCategory('教学经历',['课程']);custom.items[0].title='教学助理';custom.items[0].body='批改作业';
 const hidden=createMaterialCategory('已删除',['字段']);hidden.items[0].title='不可选';
 doc.master.customCategories=[c,custom,hidden];doc.master.hiddenCategories=[`custom:${hidden.id}`];
 return {doc,c,custom,hidden};
}

test('template/custom records enter selection and only chosen items enter the version; old versions opt out',()=>{
 const {doc,c,custom}=fixture();const rows=recommendMaterials(doc.master,'');
 assert.equal(rows.length,3);assert.ok(!rows.some(r=>r.title==='不可选'));
 const v=variantFromRecommendations(doc.master,rows.map(r=>({...r,selected:r.id==='a'||r.section===`custom:${custom.id}`})),'','','');
 assert.deepEqual(resolveVariant(doc.master,v).customCategories.map(c=>c.items.map(i=>i.title)),[['一等奖'],['教学助理']]);
 const old={...createVariant(doc.master,'old')};delete old.custom;
 assert.deepEqual(resolveVariant(doc.master,normalizeDoc({...doc,variants:[old]}).variants[0]).customCategories,[]);
 assert.equal(v.custom[0].categoryId,c.id);
});

test('version edits, rename, reorder, empty values and backup roundtrip are isolated from source and siblings',()=>{
 const {doc}=fixture();const original=structuredClone(doc.master);
 const v=createVariant(doc.master,'本版'),other=createVariant(doc.master,'另一版');
 const content=editableVariantContent(doc.master,v);
 content.customCategories.reverse();content.customCategories[0].name='教学与指导';
 content.customCategories[1].items.reverse();content.customCategories[1].items[1].title='本版奖项';
 content.customCategories[1].items[1].body='';content.customCategories[1].items[1].values={};
 const changed=updateVariantContent(v,content);
 const saved=normalizeDoc(JSON.parse(JSON.stringify({...doc,variants:[changed,other]})));
 const view=resolveVariant(saved.master,saved.variants[0]);
 assert.equal(view.customCategories[0].name,'教学与指导');
 assert.deepEqual(view.customCategories[1].items.map(i=>i.title),['二等奖','本版奖项']);
 assert.equal(view.customCategories[1].items[1].body,'');
 assert.deepEqual(doc.master,original);
 assert.equal(resolveVariant(doc.master,other).customCategories[0].items[0].title,'一等奖');
});

test('supplement merges new items and preserves local edited fields, order and removed edits',()=>{
 const {doc,c}=fixture();let v=createVariant(doc.master,'本版');
 const content=editableVariantContent(doc.master,v);content.customCategories[0].items[0].title='本版改写';
 v=updateVariantContent(v,content);
 const selected=editableVariantContent(doc.master,v);selected.customCategories[0].items=selected.customCategories[0].items.filter(i=>i.id!=='a');
 v=updateVariantContent(v,selected);
 const source=supplementSource(doc.master,v);const next=selectCustomItem(v,c.id,'a');
 const restored=editableVariantContent(source,{...next,content:source});
 assert.deepEqual(restored.customCategories[0].items.map(i=>i.title),['二等奖','本版改写']);
 assert.equal(doc.master.customCategories[0].items[0].title,'一等奖');
});

test('each custom field resolves through category and collapsed item without cross-category collisions',()=>{
 const {doc,c,custom}=fixture();custom.items[0].id='a';
 for(const category of [c,custom])for(const item of category.items){
  const id=customItemLocateId(category.id,item.id);
  for(const key of ['title','body',...category.fields.map(f=>`value:${f.id}`)]){
   const field=fieldLocateId(id,key);assert.deepEqual(locatePath(doc.master,field),[customCategoryLocateId(category.id),id,field]);
  }
 }
 assert.notEqual(customItemLocateId(c.id,'a'),customItemLocateId(custom.id,'a'));
});

test('English view preserves custom records and IDs while translating headings, labels and content',()=>{
 const {doc}=fixture();const view=resolveVariant(doc.master,createVariant(doc.master,'test'));
 const strings=collectStrings(view);assert.ok(strings.includes('荣誉奖项'));assert.ok(strings.includes('颁发机构'));assert.ok(strings.includes('真实成果\n个人贡献'));
 const translated=localizeView(view,{[textKey('荣誉奖项')]:{src:'荣誉奖项',en:'Awards'}}).view;
 assert.equal(translated.customCategories[0].name,'Awards');
 assert.equal(translated.customCategories[0].id,view.customCategories[0].id);
 assert.equal(translated.customCategories[0].items[0].values[view.customCategories[0].fields[1].id],'2025');
});
