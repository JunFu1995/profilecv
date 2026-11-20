import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDoc} from '../src/storage.ts';
import {researchStar,updateResearchStar} from '../src/researchStar.ts';
test('STAR 编辑保留旧概述并经过备份保存',()=>{
 const work=normalizeDoc({master:{research:[{id:'r',summary:'原始研究描述'}]}}).master.research[0];
 const updated={...work,...updateResearchStar(work,'task','研究目标')};
 assert.equal(updated.summary,'原始研究描述；研究目标');
 const restored=normalizeDoc({master:{research:[updated]}}).master.research[0];
 assert.equal(researchStar(restored).task,'研究目标');
 assert.equal(researchStar(restored).situation,'原始研究描述');
});
test('重新合成概述后 STAR 使用新文本，不恢复过期内容',()=>{
 const work=normalizeDoc({master:{research:[{summary:'新合成文本',star:{situation:'旧背景',task:'旧目标',action:'',result:''}}]}}).master.research[0];
 assert.deepEqual(researchStar(work),{situation:'新合成文本',task:'',action:'',result:''});
 assert.equal(updateResearchStar(work,'result','成果').summary,'新合成文本；成果');
});
test('科研总结模式与关联论文在保存后保留',()=>{
 const doc=normalizeDoc({master:{research:[{id:'r',summary:'研究总结',summaryOnly:true,publicationIds:['p1','p2'],bullets:[{id:'b',text:'原要点'}]}]}});
 const restored=normalizeDoc(JSON.parse(JSON.stringify(doc))).master.research[0];
 assert.equal(restored.summaryOnly,true);
 assert.deepEqual(restored.publicationIds,['p1','p2']);
 assert.equal(restored.bullets[0].text,'原要点');
});
test('AI 总结不覆盖原始 STAR 记录',()=>{
 const work=normalizeDoc({master:{research:[{summary:'AI 整理的总结',summaryOnly:true,star:{situation:'背景',task:'目标',action:'行动',result:'已发表论文'}}]}}).master.research[0];
 assert.equal(researchStar(work).situation,'背景');
 assert.equal(researchStar(work).result,'已发表论文');
});
test('仅有旧要点且 STAR 为空时也可用于 AI 改写',async()=>{
 const {researchRewriteSource}=await import('../src/researchStar.ts');
 const work=normalizeDoc({master:{research:[{bullets:[{id:'b',text:'已有研究成果'}]}]}}).master.research[0];
 assert.match(researchRewriteSource(work),/已有研究成果/);
 assert.equal(researchRewriteSource({...work,bullets:[]}), '');
});
