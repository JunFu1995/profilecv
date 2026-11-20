import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDoc } from '../src/storage.ts';

test('岗位库与版本关联经过备份往返保留，岗位修改不改变版本 JD', () => {
 const doc=normalizeDoc({master:{},jobs:[{id:'job1',company:'公司',role:'工程师',jdText:'原始要求',url:'https://example.com/job',note:'备注',updatedAt:'2026-10-30'}],variants:[{id:'v1',jobTarget:{jobId:'job1',company:'公司',role:'工程师',jdText:'原始要求'}}]});
 const restored=normalizeDoc(JSON.parse(JSON.stringify(doc)));
 assert.equal(restored.jobs[0].note,'备注');
 assert.equal(restored.variants[0].jobTarget.jobId,'job1');
 restored.jobs[0].jdText='新要求';
 assert.equal(restored.variants[0].jobTarget.jdText,'原始要求');
 restored.jobs=[];
 assert.equal(normalizeDoc(restored).variants[0].jobTarget.jdText,'原始要求');
 assert.deepEqual(normalizeDoc({master:{}}).jobs,[]);
});
