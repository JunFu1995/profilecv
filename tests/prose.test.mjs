import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {normalizeProse,joinProse} from '../src/prose.ts';
import {researchStar,updateResearchStar} from '../src/researchStar.ts';
import {emptyDoc} from '../src/data.ts';
import {Paper} from '../src/components/Paper.tsx';

test('prose joins omit empty sections and replace boundary punctuation once',()=>{
 assert.equal(joinProse([' 差错滞后 5 天。 ','','压到当天。']),'差错滞后 5 天；压到当天。');
 assert.equal(joinProse(['背景；','目标，','行动。','成果。']),'背景；目标；行动；成果。');
 assert.equal(joinProse(['单独一句。']),'单独一句。');
 assert.equal(joinProse(['Completed.','Next step.']),'Completed. Next step.');
 assert.equal(joinProse(['为什么？','验证结果。']),'为什么？ 验证结果。');
});
test('normalize duplicate Chinese punctuation without damaging technical text',()=>{
 assert.equal(normalizeProse('背景。；目标，。成果；；完成。。'),'背景；目标。成果；完成。');
 const text='Node.js v3.2、P99 1.4ms；2023.03 – 2023.11；Ph.D.；https://example.com/a.b；doi:10.1/abc；真的吗？！……';
 assert.equal(normalizeProse(text),text);
 assert.equal(normalizeProse('第一段。\n；第二段'),'第一段。\n；第二段');
});
test('existing STAR remains structured when moving from legacy to normalized composition',()=>{
 const star={situation:'背景。',task:'目标。',action:'行动。',result:'结果。'};
 const work={star,summary:Object.values(star).join('；')};
 assert.deepEqual(researchStar(work),star);
 const changed={...work,...updateResearchStar(work,'task','新目标。')};
 assert.equal(changed.summary,'背景；新目标；行动；结果。');
 assert.deepEqual(researchStar(changed),changed.star);
 assert.equal(work.summary,'背景。；目标。；行动。；结果。');
 const english={star:{situation:'Background.',task:'Goal.',action:'',result:''},summary:'Background.；Goal.'};
 assert.equal(researchStar(english).task,'Goal.');
});
test('paper fixes prose across sections while preserving field navigation and source text',()=>{
 const master=emptyDoc().master;
 const project={id:'p',name:'项目',role:'',company:'',start:'',end:'',stack:'',situation:'背景。',task:'目标。',actions:[{id:'a',text:'行动，。'}],results:[]};
 const view={basics:{...master.basics,name:'测试',summary:'简介。；能力。'},work:[],projects:[project],research:[{id:'r',company:'实验室',role:'',start:'',end:'',location:'',detail:'',summary:'研究。；成果。',summaryOnly:true,bullets:[],projects:[]}],education:[],publications:[],skills:[]};
 const html=renderToStaticMarkup(React.createElement(Paper,{view,accent:'#1f5f9e',locale:'zh',scale:1,stretch:1,template:'classic'}));
 assert.match(html,/data-locate="p::summary">背景；目标；行动。/);
 assert.match(html,/简介；能力。/);assert.match(html,/研究；成果。/);assert.match(html,/行动。/);assert.doesNotMatch(html,/。；|，。/);
 assert.equal(project.situation,'背景。');assert.equal(view.research[0].summary,'研究。；成果。');
});
