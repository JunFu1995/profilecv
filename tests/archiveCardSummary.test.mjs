import test from 'node:test';
import assert from 'node:assert/strict';
import { educationCardSummary, projectCardSummary, workCardSummary } from '../src/archiveCardSummary.ts';

test('education highlights explicit and legacy degrees without modifying the record', () => {
  const item = {role:'计算机科学 · 本科', location:'武汉', detail:'GPA 3.7/4.0', bullets:[{text:'校级奖学金 2 次'}]};
  const before = structuredClone(item);
  assert.deepEqual(educationCardSummary(item), {badge:'本科',meta:'计算机科学 · 武汉',detail:'GPA 3.7/4.0',extra:'校级奖学金 2 次'});
  assert.deepEqual(item,before);
  assert.equal(educationCardSummary({...item,degree:''}).badge,'');
  assert.equal(educationCardSummary({...item,degree:'硕士'}).badge,'硕士');
  assert.equal(educationCardSummary({...item,degree:'硕士'}).meta,'计算机科学 · 武汉');
});

test('project summaries prioritize nonempty results and respect draft mode', () => {
  const project={role:'作者',stack:'Go',results:[{text:' '},{text:'延迟下降 40%'}],actions:[],task:'实现限流',situation:''};
  assert.deepEqual(projectCardSummary(project),{meta:'作者 · Go',detail:'延迟下降 40%'});
  assert.equal(projectCardSummary({...project,results:[],composed:{mode:'bullets',text:'旧段落',bullets:[{text:'当前总结'}]}}).detail,'当前总结');
  assert.equal(projectCardSummary({...project,results:[]}).detail,'实现限流');
});

test('work and research summaries omit empty fields and use real source content', () => {
  const work={role:'工程师',location:'',detail:'',projects:[{name:' '},{name:'订单系统'}],summary:'',bullets:[{text:' '},{text:'优化吞吐'}],star:{result:'完成实验'}};
  assert.deepEqual(workCardSummary(work),{meta:'工程师',detail:'优化吞吐',extra:'项目：订单系统'});
  assert.deepEqual(workCardSummary(work,true),{meta:'工程师',detail:'完成实验',extra:''});
  assert.deepEqual(workCardSummary({...work,role:'',bullets:[],projects:[]}),{meta:'',detail:'',extra:''});
});
