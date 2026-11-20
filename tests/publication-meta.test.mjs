import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationCardMeta} from '../src/publication.ts';
import {normalizeDoc} from '../src/storage.ts';
test('论文标签只使用明确等级和简称并保留作者位次',()=>{
 const p={venue:'International Conference (ICDCS)',note:'CCF-B',selfPosition:'co-first'};
 assert.deepEqual(publicationCardMeta(p),{venue:'ICDCS',level:'CCF-B',position:'共同一作'});
 assert.deepEqual(publicationCardMeta({...p,venue:'Some Unknown Journal',note:'其他备注',selfPosition:'other'}),{venue:'',level:'',position:''});
 const doc=normalizeDoc({master:{publications:[{...p,venueShort:'简称',level:'自填等级'}]}});
 assert.equal(publicationCardMeta(doc.master.publications[0]).level,'自填等级');
 assert.equal(publicationCardMeta(doc.master.publications[0]).venue,'简称');
});
