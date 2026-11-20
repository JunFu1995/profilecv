import test from 'node:test';
import assert from 'node:assert/strict';
import {diffSummary,summaryFactChanges,summaryNumbers,summaryTerms} from '../src/summaryDiff.ts';

const reconstruct=(parts,side)=>parts.filter(p=>p.kind!==(side==='before'?'added':'removed')).map(p=>p.text).join('');
test('diff preserves exact Chinese, English, emoji and punctuation on both sides',()=>{
 for(const [before,after] of [['使用 Redis，延迟 200ms。','采用 Kafka，延迟 80ms。'],['','新增'],['删除',''],['保持不变','保持不变'],['A/B test C++ 👩‍💻\n结果。','C++ 👩‍💻 A/B test\n新结果。'],['a '.repeat(1500),'b '.repeat(1500)]]){
  const parts=diffSummary(before,after);
  assert.equal(reconstruct(parts,'before'),before);assert.equal(reconstruct(parts,'after'),after);
  if(before===after)assert.ok(parts.every(p=>p.kind==='same'));
 }
 const parts=diffSummary('使用 Redis 缓存','使用 Kafka 缓存');
 assert.ok(parts.some(p=>p.kind==='removed'&&p.text==='Redis'));
 assert.ok(parts.some(p=>p.kind==='added'&&p.text==='Kafka'));
});
test('fact checks distinguish units, decimals, percentages, thousands and case-insensitive technology names',()=>{
 assert.deepEqual(summaryNumbers('从 １,０００ ms 降至 80ms，提升 20.5%，样本 3 万，-2.5，1e-3。'),['1000ms','80ms','20.5%','3万','-2.5','1e-3']);
 const facts=summaryFactChanges('使用 Redis 和 Java，延迟 200ms，内存 2GB。','使用 redis 和 JavaScript，延迟 80ms，内存 2MB。');
 assert.deepEqual(facts.numbers,{removed:['200ms','2GB'],added:['80ms','2MB']});
 assert.deepEqual(facts.terms,{removed:['Java'],added:['JavaScript']});
 assert.deepEqual(summaryFactChanges('200 ms','200ms').numbers,{removed:[],added:[]});
});
test('technical and research terms avoid partial names and ordinary English words',()=>{
 assert.deepEqual(summaryTerms('JavaScript Node.js C++ C# CI/CD SQL Server'),['JavaScript','Node.js','C++','C#','CI/CD','SQL Server']);
 const facts=summaryFactChanges('基于 PyTorch 完成消融实验，使用 HNSW 索引。','基于 TensorFlow 完成对照实验，使用 HNSW 索引。');
 assert.deepEqual(facts.terms,{removed:['PyTorch','消融实验'],added:['TensorFlow','对照实验']});
 assert.deepEqual(summaryTerms('Improved response time using a reliable approach.'),[]);
});
test('editing a generated candidate back to original clears all differences',()=>{
 const original='使用 Redis 将延迟降至 80ms。';
 assert.ok(summaryFactChanges(original,'使用 Kafka 将延迟降至 20ms。').numbers.added.length);
 assert.deepEqual(summaryFactChanges(original,original),{numbers:{removed:[],added:[]},terms:{removed:[],added:[]}});
 assert.deepEqual(diffSummary(original,original),[{kind:'same',text:original}]);
});

test('comparison renderer escapes content and uses semantic insertions and deletions',async()=>{
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {SummaryDiff}=await import('../src/components/SummaryDiff.tsx');
 const html=renderToStaticMarkup(createElement(SummaryDiff,{original:'使用 Redis，延迟 200ms。',candidate:'采用 Kafka，延迟 80ms。<script>alert(1)</script>'}));
 assert.match(html,/<del>Redis<\/del>/);assert.match(html,/<ins>Kafka<\/ins>/);
 assert.ok(html.includes('数字与术语变化'));assert.ok(html.includes('200ms'));assert.ok(html.includes('80ms'));
 assert.ok(html.includes('&lt;'));assert.ok(!html.includes('<script>'));
});
