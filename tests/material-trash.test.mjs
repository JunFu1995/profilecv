import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDoc} from '../src/storage.ts';
import {collectMaterialDeletions,restoreMaterialItem} from '../src/materialItemsTrash.ts';
import {emptyMaterialTrash} from '../src/materialTrash.ts';
test('删除要点逐项持久化还原，不覆盖后续编辑',()=>{
 const original=normalizeDoc({master:{work:[{id:'w',company:'公司',bullets:[{id:'b',text:'成果'}]}]}}).master;
 const changed=structuredClone(original);changed.work[0].bullets=[];
 const deleted=collectMaterialDeletions(original,changed);
 assert.equal(deleted.trashItems.length,1);
 const saved=normalizeDoc({master:deleted}).master;saved.work[0].company='新名称';
 const restored=restoreMaterialItem(saved,saved.trashItems[0].id);
 assert.equal(restored.work[0].company,'新名称');assert.equal(restored.work[0].bullets[0].text,'成果');assert.equal(restored.trashItems.length,0);
});
test('清空回收站不会重新捕获永久删除的内容',()=>{
 const original=normalizeDoc({master:{hiddenCategories:['工作经历'],work:[{id:'w',company:'公司'}]}}).master;
 assert.deepEqual(collectMaterialDeletions(original,emptyMaterialTrash(original)).trashItems,[]);
});
