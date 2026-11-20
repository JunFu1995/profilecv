import test from 'node:test';
import assert from 'node:assert/strict';
import { updateEditorDisclosure } from '../src/editorDisclosure.ts';

test('opening another item replaces the active item across categories', () => {
  const first = updateEditorDisclosure([], 'work-a', true);
  assert.deepEqual(updateEditorDisclosure(first, 'paper-a', true), ['paper-a']);
  assert.deepEqual(first, ['work-a']);
});

test('nested projects retain their company but only one sibling is open', () => {
  let path = updateEditorDisclosure([], 'project-a', true, 'company-a');
  assert.deepEqual(path, ['company-a', 'project-a']);
  path = updateEditorDisclosure(path, 'project-b', true, 'company-a');
  assert.deepEqual(path, ['company-a', 'project-b']);
  assert.equal(updateEditorDisclosure(path, 'company-a', true), path);
  assert.deepEqual(updateEditorDisclosure(path, 'paper-a', true), ['paper-a']);
  assert.deepEqual(updateEditorDisclosure(path, 'project-c', true, 'company-b'), ['company-b', 'project-c']);
});

test('closing a project retains its parent; closing the parent closes descendants', () => {
  const path = ['company-a', 'project-a'];
  assert.deepEqual(updateEditorDisclosure(path, 'project-a', false), ['company-a']);
  assert.deepEqual(updateEditorDisclosure(path, 'company-a', false), []);
  assert.equal(updateEditorDisclosure(path, 'other', false), path);
});

test('active editing follows open items and focus without closing the company or project', async () => {
  const { syncEditorSelection, focusEditorItem } = await import('../src/editorDisclosure.ts');
  let state = syncEditorSelection({ path: [], activeId: undefined }, ['company', 'project']);
  assert.equal(state.activeId, 'project');
  state = focusEditorItem(state, 'company');
  assert.deepEqual(state, { path: ['company', 'project'], activeId: 'company' });
  assert.equal(syncEditorSelection(state, state.path), state);
  state = focusEditorItem(state, 'project');
  assert.equal(state.activeId, 'project');
  assert.equal(focusEditorItem(state, 'closed-item'), state);
  state = syncEditorSelection(state, ['company']);
  assert.equal(state.activeId, 'company');
  state = syncEditorSelection(state, ['paper']);
  assert.equal(state.activeId, 'paper');
  state = syncEditorSelection(state, []);
  assert.equal(state.activeId, undefined);
});
