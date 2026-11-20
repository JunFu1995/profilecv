import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleDoc } from '../src/data.ts';
import { normalizeDoc } from '../src/storage.ts';
import { archiveCategoryOrder, reorderArchiveCategory, LIBRARY_SECTIONS } from '../src/archiveCategoryOrder.ts';
import { emptyMaterialTrash } from '../src/materialTrash.ts';

test('category order survives save normalization and leaves record order intact', () => {
  const doc = sampleDoc();
  const next = reorderArchiveCategory(doc.master, '技能', '基本信息', 'before');
  assert.deepEqual(archiveCategoryOrder(next), ['技能', ...LIBRARY_SECTIONS.slice(0,-1)]);
  assert.equal(next.work, doc.master.work);
  assert.equal(next.basics, doc.master.basics);
  const loaded = normalizeDoc(JSON.parse(JSON.stringify({ ...doc, master: next })));
  assert.deepEqual(archiveCategoryOrder(loaded.master), archiveCategoryOrder(next));
});

test('hidden categories retain their place and newly created categories append', () => {
  const master = reorderArchiveCategory(sampleDoc().master, '技能', '工作经历', 'before');
  const hidden = { ...master, hiddenCategories: ['技能'] };
  assert.deepEqual(archiveCategoryOrder(hidden), archiveCategoryOrder(master));
  const created = { ...hidden, customCategories: [{ id:'award', name:'奖项', fields:[], items:[] }] };
  assert.equal(archiveCategoryOrder(created).at(-1), 'custom:award');
  const moved = reorderArchiveCategory(created, 'custom:award', '基本信息', 'before');
  const restored = { ...moved, hiddenCategories: [] };
  assert.deepEqual(archiveCategoryOrder(restored).slice(0,4), ['custom:award','基本信息','技能','工作经历']);
  const emptied = emptyMaterialTrash({ ...moved, hiddenCategories: ['custom:award'] });
  assert(!archiveCategoryOrder(emptied).includes('custom:award'));
});

test('legacy, duplicate and stale category order entries are handled safely', () => {
  const master = sampleDoc().master;
  assert.deepEqual(archiveCategoryOrder(master), [...LIBRARY_SECTIONS]);
  assert.deepEqual(archiveCategoryOrder({ ...master, categoryOrder:['missing','技能','技能'] }), ['技能',...LIBRARY_SECTIONS.slice(0,-1)]);
  assert.equal(reorderArchiveCategory(master, 'missing', '技能', 'after'), master);
  assert.equal(reorderArchiveCategory(master, '技能', '技能', 'before'), master);
});
