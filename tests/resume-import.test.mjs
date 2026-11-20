import test from 'node:test';
import assert from 'node:assert/strict';
import { coerceParsed, heuristicParse, toMaster } from '../src/import/parse.ts';
import { appendImport, loadImportUndo, saveImportUndo, clearImportUndo } from '../src/import/apply.ts';
import { sampleDoc, emptyDoc } from '../src/data.ts';
import { resolveVariant } from '../src/variants.ts';
import { normalizeDoc } from '../src/storage.ts';
import { PARSE_SYSTEM } from '../src/ai.ts';

const text=`张三
后端工程师
zhang@example.com
未归类原始内容需要保留。
个人简介
保持原文，不应被改写。
工作经历
某公司 | 工程师 2021.06 - 2023.07
负责账单系统，降低错误率 30%。
独立项目
个人项目 2023.08 - 至今
完整项目总结，支持 12 种输入格式。
科研经历
某大学实验室 | 研究助理 2019.09 - 2021.06
研究总结保留实验方法及 85% 的准确率。
发表论文
[1] 张三, 李四. 论文甲. 某期刊, 2024.
DOI:10.1234/example
[2] 张三. 论文乙. 某会议, 2025.
教育经历
某大学 | 计算机科学 2015.09 - 2019.06
本科，GPA 3.8，奖学金 3 次。
技能
语言：Go、Python`;

test('local parser preserves complete research, citations, summaries and unassigned text',()=>{
 const p=heuristicParse(text);
 assert.equal(p.work.length,1);assert.equal(p.sideProjects.length,1);assert.equal(p.research.length,1);assert.equal(p.publications.length,2);
 assert.equal(p.basics.summary,'保持原文，不应被改写。');
 assert.equal(p.work[0].end,'2023.07');assert.equal(p.research[0].role,'研究助理');
 assert.match(p.research[0].summary,/85%/);assert.match(p.publications[0].title,/10.1234\/example/);
 assert.equal(p.publications[0].status,'unknown');assert.equal(p.publications[0].selfPosition,'other');
 assert.match(p.education[0].detail,/奖学金 3 次/);assert.match(p.unassigned,/未归类原始内容/);
 assert.deepEqual(p.sideProjects[0].actions,[]);assert.equal(p.sideProjects[0].situation,'');
});

test('all editable AI extraction fields survive conversion and storage reload',()=>{
 const p=coerceParsed({research:[{company:'实验室',summary:'完整研究总结',star:{situation:'问题',task:'目标',action:'实验',result:'成果'},projects:[{name:'研究项目',summary:'项目原文'}]}],
  sideProjects:[{name:'项目',summary:'项目总结',actions:['行动'],results:['结果']}],
  publications:[{title:'论文',authors:'张三, 李四',highlight:'张三',venue:'期刊',venueShort:'J',level:'Q1',year:'2024',volume:'2',issue:'3',pages:'4-9',doi:'10.1234/abc',status:'accepted',selfPosition:'co-first',note:'备注',abstract:'摘要'}],
  education:[{org:'学校',role:'专业',degree:'博士',detail:'完整补充',bullets:['荣誉']}],unassigned:'尚未归类原文'});
 const master=toMaster(p),doc=normalizeDoc({...emptyDoc(),master});
 assert.equal(doc.master.research[0].researchDraft.text,'完整研究总结');
 assert.equal(doc.master.research[0].star.action,'实验');assert.equal(doc.master.research[0].projects[0].composed.text,'项目原文');
 assert.equal(doc.master.sideProjects[0].composed.text,'项目总结');
 for(const [key,value] of Object.entries(p.publications[0]))assert.equal(doc.master.publications[0][key],value);
 assert.equal(doc.master.education[0].degree,'博士');assert.equal(doc.master.education[0].bullets[0].text,'荣誉');
 assert.equal(doc.master.customCategories[0].items[0].body,'尚未归类原文');
});

test('unknown publication status does not become published after reload',()=>{
 const master=toMaster(coerceParsed({publications:[{title:'尚无状态'}]}));
 assert.equal(normalizeDoc({...emptyDoc(),master}).master.publications[0].status,'unknown');
});

test('append is immutable, keeps IDs, and freezes legacy delivery versions before basic changes',()=>{
 const doc=sampleDoc();doc.variants.forEach(v=>delete v.content);
 const original=structuredClone(doc),before=doc.variants.map(v=>resolveVariant(doc.master,v));
 const incoming=toMaster(heuristicParse(text));
 const after=appendImport(doc,incoming,['name','summary']);
 assert.deepEqual(doc,original);assert.equal(after.master.basics.name,'张三');
 assert.deepEqual(after.master.work.slice(0,doc.master.work.length),doc.master.work);
 assert.deepEqual(after.variants.map(v=>v.id),doc.variants.map(v=>v.id));
 after.variants.forEach((v,i)=>assert.deepEqual(resolveVariant(after.master,v),before[i]));
 assert.equal(after.master.work.length,doc.master.work.length+1);
 assert.equal(after.master.publications.length,doc.master.publications.length+2);
});

test('existing basics are kept by default, empty basics are filled, links deduplicate by URL',()=>{
 const doc=sampleDoc();doc.master.basics.phone='';
 const incoming=toMaster(coerceParsed({basics:{name:'新姓名',phone:'13800000000',links:[{label:'重复',url:doc.master.basics.links[0].url},{label:'新增',url:'https://new.example.com'}]}}));
 const next=appendImport(doc,incoming,[]);
 assert.equal(next.master.basics.name,doc.master.basics.name);assert.equal(next.master.basics.phone,'13800000000');
 assert.equal(next.master.basics.links.length,doc.master.basics.links.length+1);
});

test('independent version content and custom material data remain unchanged',()=>{
 const doc=sampleDoc();doc.master.customCategories=[{id:'custom',name:'原分类',fields:[],items:[]}];doc.master.hiddenCategories=['科研经历'];
 doc.variants[0].content=structuredClone(doc.master);
 const incoming=toMaster(coerceParsed({research:[{company:'新增实验室'}],unassigned:'原文'}));
 const next=appendImport(doc,incoming,[]);
 assert.deepEqual(next.variants[0],doc.variants[0]);assert.deepEqual(next.master.customCategories[0],doc.master.customCategories[0]);
 assert.equal(next.master.customCategories.length,2);assert.ok(!next.master.hiddenCategories.includes('科研经历'));
});

test('undo snapshot persists across reload and storage failure is explicit',()=>{
 const saved=globalThis.localStorage,items=new Map();
 globalThis.localStorage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)};
 try{
  const before=sampleDoc(),after=appendImport(before,toMaster(heuristicParse(text)),[]);
  assert.equal(saveImportUndo({before,after,wasDemo:true}),true);
  const receipt=loadImportUndo();assert.deepEqual(receipt.before,normalizeDoc(before));assert.equal(receipt.after.master.research.length,after.master.research.length);
  clearImportUndo();assert.equal(loadImportUndo(),null);
  globalThis.localStorage.setItem=()=>{throw new Error('quota');};
  assert.equal(saveImportUndo({before,after,wasDemo:false}),false);
 }finally{globalThis.localStorage=saved;}
});

test('AI extraction contract separates extraction from rewriting and covers academic fields',()=>{
 for(const field of ['research','publications','unassigned','summary','degree','unknown','selfPosition'])assert.ok(PARSE_SYSTEM.includes(field));
 assert.match(PARSE_SYSTEM,/不润色/);assert.match(PARSE_SYSTEM,/不把总结强行拆成 STAR/);
});

test('uploaded resume fixture preserves company projects, header details and research across pages',async()=>{
 const {readFile}=await import('node:fs/promises');
 const text=await readFile(new URL('./fixtures/resume-import/complete.txt',import.meta.url),'utf8');
 const p=heuristicParse(text);
 assert.equal(p.work.length,2);assert.deepEqual(p.work.map(w=>w.projects.length),[2,1]);
 assert.equal(p.work[0].detail,'交易平台组');
 assert.equal(p.work[0].projects[0].name,'订单一致性平台');
 assert.equal(p.work[0].projects[0].role,'核心开发');
 assert.equal(p.work[0].projects[0].stack,'Go · MySQL · Kafka');
 assert.match(p.work[0].projects[0].summary,/0.02%/);
 assert.equal(p.research.length,2);assert.equal(p.research[0].detail,'导师：王老师');
 assert.match(p.research[0].summary,/128 组实验[\s\S]*23.5%/);
 assert.equal(p.publications.length,2);assert.match(p.publications[1].title,/Trace-Based Service Diagnosis[\s\S]*10.1234\/test.2023.002/);
 assert.equal(p.education[0].degree,'硕士');assert.match(p.education[0].detail,/2 次奖学金/);
 assert.equal(p.sideProjects[0].role,'维护者');assert.equal(p.sideProjects[0].stack,'Rust · SQLite');
 const master=normalizeDoc({...emptyDoc(),master:toMaster(p)}).master;
 assert.equal(master.work[0].summary,p.work[0].summary);
 assert.equal(master.work[0].detail,'交易平台组');
 assert.equal(master.research[0].researchDraft.text,p.research[0].summary);
 assert.equal(master.work[1].projects[0].composed.text,p.work[1].projects[0].summary);
});

test('explicit projects without dates remain with their owner and separated heading text is recognized',()=>{
 const p=heuristicParse('工作经历\n甲公司 | 工程师 2020 - 至今\n职责完整\n项目名称：甲项目\n技术栈：Go\n项目正文\n科研 经历\n乙实验室 | 助理 | 导师甲 2019 - 2020\n科研正文\n项目：科研工具\n保留研究项目\n教育 经历\n乙大学 | 专业 | 硕士 | 优秀毕业生 2016 - 2019\n教育正文');
 assert.equal(p.work.length,1);assert.equal(p.work[0].projects[0].summary,'项目正文');
 assert.equal(p.work[0].projects[0].stack,'Go');
 assert.equal(p.research[0].projects[0].name,'科研工具');assert.equal(p.research[0].summary,'科研正文');
 assert.equal(p.education[0].degree,'硕士');assert.equal(p.education[0].detail,'优秀毕业生\n教育正文');
});
