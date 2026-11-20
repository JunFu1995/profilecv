import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDoc} from '../src/storage.ts';
test('学历独立保存，旧学历专业自动拆分且允许清空学历',()=>{
 const doc=normalizeDoc({master:{education:[{id:'e',role:'计算机科学与技术 · 本科'}]}});
 assert.equal(doc.master.education[0].role,'计算机科学与技术');
 assert.equal(doc.master.education[0].degree,'本科');
 doc.master.education[0].degree='';
 assert.equal(normalizeDoc(JSON.parse(JSON.stringify(doc))).master.education[0].degree,'');
 doc.master.education[0].degree='工程硕士';
 assert.equal(normalizeDoc(doc).master.education[0].degree,'工程硕士');
});
