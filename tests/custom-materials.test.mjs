import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDoc } from '../src/storage.ts';
test('自定义素材类别、字段和内容在备份往返后完整保留',()=>{
 const category={id:'c1',name:'证书',fields:[{id:'f1',label:'颁发机构'}],items:[{id:'i1',title:'资格证',body:'正文',values:{f1:'机构'}}]};
 const doc=normalizeDoc({master:{customCategories:[category]}});
 assert.deepEqual(normalizeDoc(JSON.parse(JSON.stringify(doc))).master.customCategories,[category]);
 assert.deepEqual(normalizeDoc({master:{}}).master.customCategories,[]);
 const invalid=normalizeDoc({master:{customCategories:[null,{fields:[null],items:[{values:{bad:42,good:'文本'}}]}]}});
 assert.deepEqual(invalid.master.customCategories[0].items[0].values,{good:'文本'});
});
test('内置类别改名只更新显示名称并随备份保存',()=>{
 const doc=normalizeDoc({master:{categoryNames:{'工作经历':'职业经历','技能':'专业能力'},work:[]}});
 const restored=normalizeDoc(JSON.parse(JSON.stringify(doc)));
 assert.equal(restored.master.categoryNames['工作经历'],'职业经历');
 assert.equal(restored.master.categoryNames['技能'],'专业能力');
 assert.deepEqual(restored.master.work,[]);
});
test('类别删除状态持久化且保留素材以便恢复',()=>{
 const restored=normalizeDoc(JSON.parse(JSON.stringify(normalizeDoc({master:{hiddenCategories:['工作经历'],work:[{id:'w1',company:'公司'}]}}))));
 assert.deepEqual(restored.master.hiddenCategories,['工作经历']);
 assert.equal(restored.master.work[0].id,'w1');
});

test('清空回收站仅清除被删除类别的内容，不修改其他素材和原对象',async()=>{
 const {emptyMaterialTrash}=await import('../src/materialTrash.ts');
 const doc=normalizeDoc({master:{hiddenCategories:['工作经历','custom:c'],work:[{id:'w',company:'公司'}],skills:[{id:'s',name:'语言',text:'JS'}],customCategories:[{id:'c',name:'删除',items:[],fields:[]},{id:'keep',name:'保留',items:[],fields:[]}]}});
 const result=emptyMaterialTrash(doc.master);
 assert.deepEqual(result.work,[]);
 assert.equal(doc.master.work.length,1);
 assert.deepEqual(result.skills,doc.master.skills);
 assert.deepEqual(result.customCategories.map(c=>c.id),['keep']);
 assert.deepEqual(result.hiddenCategories,[]);
});
