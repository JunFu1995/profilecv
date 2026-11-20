import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleDoc} from '../src/data.ts';
import {buildView} from '../src/variants.ts';
import {collectStrings,localizeView,mergeTranslations,textKey} from '../src/translate.ts';

test('Chinese names have an offline default and still appear in proofreading', () => {
  const source=buildView(sampleDoc().master);
  const localized=localizeView(source,{});
  assert.ok(!localized.missing.includes('陈墨'));
  assert.equal(collectStrings(source)[0],'陈墨');
  assert.equal(localized.view.basics.name,'Mo Chen');
});

test('English view translates names consistently while preserving Chinese source', () => {
  const source=buildView(sampleDoc().master);
  const dict=mergeTranslations({},['陈墨'],['Mo Chen']);
  const translated=localizeView(source,dict);
  assert.equal(translated.view.basics.name,'Mo Chen');
  assert.equal(source.basics.name,'陈墨');
  assert.equal(translated.view.publications[0].authors,'Mo Chen, Ming Li, Fang Wang');
  assert.equal(translated.view.publications[0].highlight,'Mo Chen');
  assert.equal(source.publications[0].authors,'陈墨, 李明, 王芳');
  assert.ok(!translated.missing.includes('陈墨'));
  dict[textKey('陈墨')]={src:'陈墨',en:'M. Chen',manual:true};
  assert.equal(localizeView(source,dict).view.basics.name,'M. Chen');
});

test('English names are kept and changed Chinese names get a new default', () => {
  const source=buildView(sampleDoc().master);
  source.basics.name='Mo Chen';
  assert.equal(localizeView(source,{}).view.basics.name,'Mo Chen');
  assert.ok(!collectStrings(source).includes('Mo Chen'));
  source.basics.name='李明';
  const translated=localizeView(source,mergeTranslations({},['陈墨'],['Mo Chen']));
  assert.equal(translated.view.basics.name,'Ming Li');
  assert.ok(!translated.missing.includes('李明'));
});


test('old automated surname-first caches follow the current rule without a new request', () => {
  const source=buildView(sampleDoc().master);
  const dict=mergeTranslations({},['陈墨'],['Chen Mo']);
  assert.equal(localizeView(source,dict).view.basics.name,'Mo Chen');
  assert.equal(dict[textKey('陈墨')].en,'Chen Mo');
  dict[textKey('陈墨')].manual=true;
  assert.equal(localizeView(source,dict).view.basics.name,'Chen Mo');
});

test('default pinyin handles compound and polyphonic surnames without changing English names', async () => {
  const {defaultEnglishName}=await import('../src/nameTranslation.ts');
  for(const [source,expected] of [['陈墨','Mo Chen'],['欧阳明月','Mingyue Ouyang'],['司马光','Guang Sima'],['单伟','Wei Shan'],['曾乐乐','Lele Zeng'],['张欧阳','Ouyang Zhang']]) {
    assert.equal(defaultEnglishName(source),expected);
  }
  for(const source of ['Mo Chen','陈墨 Chen','阿里·艾哈迈德','陈',''])assert.equal(defaultEnglishName(source),undefined);
});

test('compound and polyphonic names retain manual spelling through automatic responses and reload', async () => {
  const {normalizeDoc}=await import('../src/storage.ts');
  const {resolveNameTranslation}=await import('../src/nameTranslation.ts');
  for(const [name,automatic,manual] of [['欧阳明月','Mingyue Ouyang','M. Ouyang'],['单伟','Wei Shan','Will Shan']]) {
    const doc=sampleDoc();
    doc.master.basics.name=name;
    const source=buildView(doc.master);
    assert.equal(localizeView(source,{}).view.basics.name,automatic);
    assert.equal(resolveNameTranslation(name)?.en,automatic);
    const key=textKey(name);
    doc.translations[key]={src:name,en:manual,manual:true};
    // An already-running batch may complete after the user edits the translation.
    const original=doc.translations[key];
    doc.translations=mergeTranslations(doc.translations,[name],[automatic]);
    assert.equal(doc.translations[key],original);
    const reloaded=normalizeDoc(JSON.parse(JSON.stringify(doc)));
    assert.equal(reloaded.translations[key].manual,true);
    assert.equal(resolveNameTranslation(name,reloaded.translations[key]).en,manual);
    assert.equal(localizeView(buildView(reloaded.master),reloaded.translations).view.basics.name,manual);
    assert.ok(!localizeView(source,reloaded.translations).missing.includes(name));
    assert.equal(reloaded.master.basics.name,name);
  }
});

test('manual English names survive repeated language switches and real storage serialization', async () => {
  const {createVariant,resolveVariant}=await import('../src/variants.ts');
  const {layoutFor,updateVariantLayout}=await import('../src/variantLayout.ts');
  const {saveDoc,inspectStoredDoc}=await import('../src/storage.ts');
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const memory=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)}});
  try {
    for(const [name,manual] of [['欧阳明月','M. Ouyang'],['单伟','Will Shan']]) {
      let doc=sampleDoc();doc.master.basics.name=name;
      const variant=createVariant(doc.master,'语言切换验证');doc.variants=[variant];
      const key=textKey(name);doc.translations[key]={src:name,en:manual,manual:true};
      for(const locale of ['en','zh','en','zh','en']) {
        doc=updateVariantLayout(doc,variant.id,{locale});
        assert.equal(saveDoc(doc),true);
        const stored=inspectStoredDoc();assert.equal(stored.status,'ready');doc=stored.doc;
        const current=doc.variants[0];const source=resolveVariant(doc.master,current);
        const display=layoutFor(doc,current).locale==='en'?localizeView(source,doc.translations).view:source;
        assert.equal(display.basics.name,locale==='en'?manual:name);
        assert.deepEqual(doc.translations[key],{src:name,en:manual,manual:true});
        assert.equal(doc.master.basics.name,name);
      }
    }
  } finally {
    if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;
  }
});
