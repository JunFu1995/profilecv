import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleDoc } from '../src/data.ts';
import { reorderArchiveMaterial } from '../src/archiveReorder.ts';

test('archive reorder preserves content and only changes the selected list', () => {
  const master = sampleDoc().master;
  const [first, second] = master.sideProjects;
  const next = reorderArchiveMaterial(master, second.id, first.id, 'before');
  assert.deepEqual(next.sideProjects, [second, first]);
  assert.equal(next.sideProjects[0], second);
  assert.equal(next.work, master.work);
  assert.equal(next.basics, master.basics);
  assert.deepEqual(master.sideProjects, [first, second]);
  assert.equal(reorderArchiveMaterial(next, first.id, second.id, 'after'), next);
});

test('nested projects reorder within their company without changing any parent order', () => {
  const master = sampleDoc().master;
  const company = master.work[0];
  const [first, second] = company.projects;
  const next = reorderArchiveMaterial(master, first.id, second.id, 'after');
  assert.deepEqual(next.work.map(item => item.id), master.work.map(item => item.id));
  assert.deepEqual(next.work[0].projects, [second, first]);
  assert.equal(next.work[1], master.work[1]);
  assert.equal(next.sideProjects, master.sideProjects);
});

test('skill cards reorder without changing contents or other categories', () => {
  const master = sampleDoc().master;
  const [first, second, third, ...rest] = master.skills;
  const next = reorderArchiveMaterial(master, third.id, first.id, 'before');
  assert.deepEqual(next.skills, [third, first, second, ...rest]);
  assert.equal(next.work, master.work);
  assert.deepEqual(master.skills, [first, second, third, ...rest]);
  assert.equal(reorderArchiveMaterial(master, first.id, master.work[0].id, 'after'), master);
});

test('unknown, same-item and cross-category drops leave all data intact', () => {
  const master = sampleDoc().master;
  const source = master.work[0];
  for (const target of ['missing', source.id, master.sideProjects[0].id, source.projects[0].id]) {
    assert.equal(reorderArchiveMaterial(master, source.id, target, 'before'), master);
  }
  assert.equal(reorderArchiveMaterial(master, source.projects[0].id, master.work[1].projects[0].id, 'after'), master);
});

test('resume drag order is persisted only in the edited variant', async () => {
  const { createVariant, editableVariantContent, updateVariantContent } = await import('../src/variants.ts');
  const { normalizeDoc } = await import('../src/storage.ts');
  const doc = sampleDoc();
  const originalMaster = structuredClone(doc.master);
  const variant = createVariant(doc.master, '排序验证');
  const original = editableVariantContent(doc.master, variant);
  const [first, second] = original.work;
  const moved = reorderArchiveMaterial(original, second.id, first.id, 'before');
  const changed = updateVariantContent(variant, moved);
  const saved = normalizeDoc(JSON.parse(JSON.stringify({ ...doc, variants: [changed] })));
  assert.deepEqual(editableVariantContent(saved.master, saved.variants[0]).work.map(x => x.id), [second.id, first.id]);
  assert.deepEqual(doc.master, originalMaster);
  assert.deepEqual(editableVariantContent(doc.master, variant).work, original.work);
});

test('custom item sorting preserves fields and refuses unknown destinations', async () => {
  const { reorderItems } = await import('../src/archiveReorder.ts');
  const first = { id: 'a', title: '奖项', values: { year: '2025' } };
  const second = { id: 'b', title: '证书', values: { year: '2026' } };
  const items = [first, second];
  assert.deepEqual(reorderItems(items, 'b', 'a', 'before'), [second, first]);
  assert.equal(reorderItems(items, 'a', 'another-category', 'after'), items);
});

test('nested reorder survives save, preserves edits and keeps preview location in the same company', async () => {
  const { createVariant, editableVariantContent, updateVariantContent, resolveVariant } = await import('../src/variants.ts');
  const { normalizeDoc } = await import('../src/storage.ts');
  const { locatePath, fieldLocateId } = await import('../src/locate.ts');
  const { updateEditorDisclosure } = await import('../src/editorDisclosure.ts');
  const doc = sampleDoc();
  const variant = createVariant(doc.master, '子项目检查');
  const original = editableVariantContent(doc.master, variant);
  const company = original.work[0];
  const [first, second] = company.projects;
  const moved = reorderArchiveMaterial(original, second.id, first.id, 'before');
  const edited = { ...moved, work: moved.work.map(w => w.id === company.id ? {
    ...w, projects: w.projects.map(p => p.id === first.id ? { ...p, name: '已编辑的子项目' } : p),
  } : w) };
  const saved = normalizeDoc(JSON.parse(JSON.stringify({ ...doc, variants: [updateVariantContent(variant, edited)] })));
  const content = editableVariantContent(saved.master, saved.variants[0]);
  assert.deepEqual(content.work[0].projects.map(p => p.id), [second.id, first.id]);
  assert.equal(content.work[0].projects[1].name, '已编辑的子项目');
  const baseline = normalizeDoc(JSON.parse(JSON.stringify({ ...doc, variants: [variant] })));
  assert.deepEqual(content.work.slice(1), editableVariantContent(baseline.master, baseline.variants[0]).work.slice(1));
  assert.deepEqual(locatePath(content, fieldLocateId(first.id, 'name')), [company.id, first.id, fieldLocateId(first.id, 'name')]);
  const preview = resolveVariant(saved.master, saved.variants[0]);
  assert.deepEqual(preview.projects.filter(p => p.workId === company.id).map(p => p.id), [second.id, first.id]);
  assert.deepEqual(updateEditorDisclosure([company.id, first.id], second.id, true, company.id), [company.id, second.id]);
  assert.deepEqual(doc.master.work[0].projects.map(p => p.id), [first.id, second.id]);
});
