import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../src/data.ts';
import { buildView } from '../src/variants.ts';
import { extractKeywords, analyzeJd, scoreTexts } from '../src/keywords.ts';
import { lintView, flattenView } from '../src/lint.ts';

const project = () => ({ id:'p',name:'项目',role:'',start:'',end:'',stack:'',company:'',situation:'Redis',task:'Kafka',actions:[{id:'a',text:'维护 Java 服务'}],results:[] });
test('JD extraction and scoring respect technical word boundaries', () => {
  const terms = extractKeywords('JavaScript Django GitLab C++ CI/CD Spring Boot');
  for (const word of ['java','go','git','ci','cd','boot']) assert.equal(terms.has(word),false,word);
  for (const word of ['javascript','django','gitlab','c++','ci/cd','spring boot']) assert.equal(terms.has(word),true,word);
  assert.equal(analyzeJd('Java', 'JavaScript').matched,0);
  assert.equal(scoreTexts('JavaScript', [{id:'a',text:'Java'}]).get('a').hits,0);
  assert.equal(analyzeJd('C++ C#', 'C++ C#').matched,2);
});
test('keyword checks follow summary content and respect intentionally emptied drafts', () => {
  const view=buildView(emptyDoc().master);
  view.projects=[{...project(),composed:{mode:'paragraph',text:'使用 Python 交付分析报告',bullets:[],sourceHash:''}}];
  assert.equal(analyzeJd('Python Java Redis Kafka',flattenView(view)).matched,1);
  assert.equal(lintView(view).issues[0].text,'使用 Python 交付分析报告');
  assert.equal(lintView(view).projectsWithoutResult.length,0);
  view.projects[0].composed={mode:'bullets',text:'',bullets:[{id:'c',text:'使用 Rust'}],sourceHash:''};
  assert.equal(analyzeJd('Rust Java',flattenView(view)).matched,1);
  view.projects[0].composed.bullets=[];
  assert.equal(analyzeJd('Java Redis Kafka',flattenView(view)).matched,0);
  delete view.projects[0].composed;
  assert.equal(analyzeJd('Java Redis Kafka',flattenView(view)).matched,3);
});
test('research summary and degree are included while hidden research bullets are excluded', () => {
  const view=buildView(emptyDoc().master);
  view.research=[{id:'r',company:'实验室',role:'',detail:'',location:'',summary:'Python',summaryOnly:true,bullets:[{id:'b',text:'Java'}],projects:[]}];
  view.education=[{id:'e',org:'学校',role:'',degree:'博士',detail:'',bullets:[]}];
  assert.equal(analyzeJd('Python Java',flattenView(view)).matched,1);
  assert.match(flattenView(view),/博士/);
  assert.equal(lintView(view).total,1);
  assert.equal(lintView(view).issues[0].text,'Python');
});
test('English checks compare whole verbs and measure words instead of characters', () => {
  const view=buildView(emptyDoc().master);
  view.education=[{id:'e',org:'School',bullets:[
    {id:'a',text:'Developed a reliable service that reduced response time by 20% across production environments.'},
    {id:'b',text:'Designed 3 automated workflows.'},
  ]}];
  assert.equal(lintView(view).issues.length,0);
  view.education[0].bullets.push({id:'c',text:'Developed 2 tools.'});
  assert.equal(lintView(view).byRule['dup-verb'],2);
  view.education[0].bullets=[{id:'d',text:'Responsible for 3 services.'}];
  assert.equal(lintView(view).byRule['weak-verb'],1);
});

test('paper hides work descriptions and renders academic-only resumes', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { Paper } = await import('../src/components/Paper.tsx');
  const view = buildView(emptyDoc().master);
  const render = () => renderToStaticMarkup(createElement(Paper,{view,locale:'zh',accent:'#000',scale:1,stretch:0,template:'classic'}));
  const work={id:'w',company:'研究机构',role:'',start:'',end:'',location:'',detail:'',bullets:[{id:'b',text:'交付可检索成果'}],projects:[]};
  view.work=[work];
  assert.doesNotMatch(render(),/交付可检索成果/);
  view.work=[];
  view.research=[work];
  assert.match(render(),/研究机构/);
  assert.doesNotMatch(render(),/开始写你的简历/);
  view.research=[];
  view.publications=[{id:'pub',title:'独立论文',authors:'',highlight:'',venue:'',volume:'',issue:'',pages:'',year:'',doi:'',note:'',status:'published',selfPosition:'first'}];
  assert.match(render(),/独立论文/);
});

test('work experience shows metadata and projects, excluding stored work descriptions', async () => {
  const {createElement}=await import('react');
  const {renderToStaticMarkup}=await import('react-dom/server');
  const {Paper}=await import('../src/components/Paper.tsx');
  const view=buildView(emptyDoc().master);
  view.work=[{id:'work',company:'公司',role:'',start:'',end:'',bullets:[{id:'a',text:'职责内容'},{id:'b',text:'成果内容'}],projects:[]}];
  const html=renderToStaticMarkup(createElement(Paper,{view,locale:'zh',accent:'#000',scale:1,stretch:0,template:'classic'}));
  assert.match(html,/公司/);
  assert.doesNotMatch(html,/work::summary|职责内容|成果内容/);
  assert.doesNotMatch(flattenView(view),/职责内容|成果内容/);
  assert.equal(lintView(view).total,0);
  assert.equal(view.work[0].bullets.length,2);
  assert.doesNotMatch(html,/entry-bullets|data-bullet-id/);
});
