import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../src/data.ts';
import { createVariant, editableVariantContent, updateVariantContent, resolveVariant } from '../src/variants.ts';
import { normalizeDoc } from '../src/storage.ts';

test('版本完整编辑与保存不修改素材库或其他版本，允许清空字段', () => {
  const doc = emptyDoc();
  doc.master.basics.name = '原姓名';
  doc.master.basics.summary = '原简介';
  doc.master.skills = [{ id: 'skill', label: '语言', value: '中文' }];
  const before = structuredClone(doc.master);
  const original = createVariant(doc.master, '原版');
  const other = createVariant(doc.master, '其他版本');
  const content = editableVariantContent(doc.master, original);
  content.basics.name = '本版姓名';
  content.basics.summary = '';
  content.skills[0].value = '英语';
  const changed = updateVariantContent(original, content);
  assert.deepEqual(doc.master, before);
  assert.equal(resolveVariant(doc.master, other).basics.name, '原姓名');
  assert.equal(resolveVariant(doc.master, changed).basics.summary, '');
  const saved = normalizeDoc(JSON.parse(JSON.stringify({ ...doc, variants: [changed] })));
  assert.equal(resolveVariant(saved.master, saved.variants[0]).basics.name, '本版姓名');
  assert.equal(resolveVariant(saved.master, saved.variants[0]).skills[0].value, '英语');
});

test('补充素材保留本版字段和顺序', async () => {
  const { supplementSource, toggleGroup } = await import('../src/variants.ts');
  const doc = emptyDoc();
  doc.master.education = [
    {id:'a',org:'原学校',role:'本科',start:'',end:'',location:'',detail:'',bullets:[]},
    {id:'b',org:'新学校',role:'硕士',start:'',end:'',location:'',detail:'',bullets:[]},
  ];
  let variant = createVariant(doc.master, '测试');
  variant.education = variant.education.slice(0, 1);
  const content = editableVariantContent(doc.master, variant);
  content.education[0].org = '本版学校';
  variant = updateVariantContent(variant, content);
  const source = supplementSource(doc.master, variant);
  const next = toggleGroup(variant, source, 'education', 'b', true);
  const result = editableVariantContent(source, {...next, content:source});
  assert.deepEqual(result.education.map(e=>e.org), ['本版学校','新学校']);
  assert.equal(doc.master.education[0].org, '原学校');
});
