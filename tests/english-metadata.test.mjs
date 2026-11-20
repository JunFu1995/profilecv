import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleDoc} from '../src/data.ts';
import {buildView} from '../src/variants.ts';
import {collectStrings, localizeView, textKey} from '../src/translate.ts';

test('English dates cover every experience and leave the source untouched', () => {
  const source = buildView(sampleDoc().master);
  for (const section of ['work', 'research', 'projects', 'education']) {
    assert.ok(source[section].length);
    for (const item of source[section]) { item.start='2022.06'; item.end='至今'; }
  }
  for (const mode of ['star', 'summary']) {
    source.research.forEach(item => item.researchDisplay=mode);
    source.projects.forEach(item => item.display=mode);
    const {view} = localizeView(source, {});
    for (const section of ['work', 'research', 'projects', 'education']) {
      for (const item of view[section]) {
        assert.equal(item.start, '2022.06'); assert.equal(item.end, 'Present');
      }
      assert.equal(source[section][0].end, '至今');
    }
  }
});

test('publication names preserve order, English spellings, manual corrections, and self highlight', () => {
  const source = buildView(sampleDoc().master);
  source.publications[0].authors='陈墨，李明; Jane Doe、王芳';
  const dict = {[textKey('李明')]:{src:'李明',en:'M. Li',manual:true}};
  const result = localizeView(source, dict);
  assert.equal(result.view.publications[0].authors,'Mo Chen, M. Li, Jane Doe, Fang Wang');
  assert.equal(result.view.publications[0].highlight,'Mo Chen');
  assert.equal(source.publications[0].highlight,'陈墨');
  assert.ok(!result.missing.includes('王芳'));
  assert.ok(collectStrings(source).includes('李明'));
  assert.ok(collectStrings(source).includes('王芳'));
});

test('standard degrees translate offline; custom degrees enter translation and proofreading', () => {
  const source = buildView(sampleDoc().master);
  source.education[0].degree='本科';
  let result = localizeView(source, {});
  assert.equal(result.view.education[0].degree,"Bachelor's degree");
  assert.ok(!result.missing.includes('本科'));
  assert.ok(collectStrings(source).includes('本科'));
  const dict = {[textKey('本科')]:{src:'本科',en:'B.Sc.',manual:true}};
  assert.equal(localizeView(source,dict).view.education[0].degree,'B.Sc.');
  source.education[0].degree='工学学士';
  assert.ok(localizeView(source,{}).missing.includes('工学学士'));
  dict[textKey('工学学士')]={src:'工学学士',en:'Bachelor of Engineering'};
  assert.equal(localizeView(source,dict).view.education[0].degree,'Bachelor of Engineering');
  assert.equal(source.education[0].degree,'工学学士');
});
