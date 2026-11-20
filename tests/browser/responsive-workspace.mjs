// PLAYWRIGHT_MODULE_PATH=/path/to/playwright/index.mjs node --import ./tests/register.mjs tests/browser/responsive-workspace.mjs
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { sampleDoc } from '../../src/data.ts';
import { createVariant } from '../../src/variants.ts';
import { layoutFor } from '../../src/variantLayout.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5273';
const out = process.env.SCREENSHOT_DIR;
if (out) await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const failures = [], results = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
try {
for (const [width,height,touch] of [[320,740,true],[390,844,true],[768,1024,true],[1024,768,true],[1440,1000,false]]) {
 const context = await browser.newContext({ viewport:{width,height}, hasTouch:touch, isMobile:touch, deviceScaleFactor:1 });
 const page = await context.newPage(); page.setDefaultTimeout(8000);
 page.on('pageerror',error=>failures.push(`${width}: ${error.message}`));
 const doc = sampleDoc();doc.variants=[{...createVariant(doc.master,'触控适配检查'),id:'responsive',content:structuredClone(doc.master),layout:layoutFor(doc)}];
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.evaluate(doc=>localStorage.setItem('resume-tool:v1',JSON.stringify(doc)),doc);
 await page.goto(`${base}/editor?resume=responsive`,{waitUntil:'domcontentloaded'});
 await page.locator('.variant-full-editor').waitFor();
 async function capture(name) { await page.waitForTimeout(200); if(out)await page.screenshot({path:`${out}/${name}-${width}.png`}); check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${name}: document overflows`); }
 async function target(locator,name) { const r=await locator.boundingBox();check(r&&r.width>=43.5&&r.height>=43.5,`${width}: ${name} target ${r?.width}×${r?.height}`); }
 if(touch){
  await target(page.getByLabel('选择版本'),'version');
  await target(page.getByRole('button',{name:'从素材库补充',exact:true}).first(),'supplement');
  await target(page.locator('#editor-工作经历 .archive-drag-handle').first(),'drag');
  await target(page.locator('#editor-工作经历').getByRole('button',{name:'删除',exact:true}).first(),'delete');
  if(width<=880)await target(page.getByRole('button',{name:'预览',exact:true}),'preview tab');
 }
 await capture('editor');
 const basics=page.locator('#editor-基本信息');await basics.getByRole('button',{name:/基本信息/}).click();
 const phone=await basics.getByLabel('手机',{exact:true}).boundingBox(),email=await basics.getByLabel('邮箱',{exact:true}).boundingBox();
 const narrow=await basics.evaluate(el=>el.clientWidth<600);
 if(narrow) {check(email.y>=phone.y+phone.height,`${width}: email still alongside phone`); const row=basics.locator('.basics-links .inline-row').first(); const inputs=row.locator('input'); const label=await inputs.nth(0).boundingBox(),url=await inputs.nth(1).boundingBox(); check(url.y>=label.y+label.height,`${width}: URL still alongside label`); }
 await basics.getByLabel('姓名',{exact:true}).fill('触屏检查');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('resume-tool:v1')).variants[0].content.basics.name==='触屏检查');
 await capture('form');
 if(width<=880)await page.getByRole('button',{name:'预览',exact:true}).tap();
 await page.locator('.stage').waitFor({state:'visible'});await page.waitForTimeout(200);
 const zoom=page.getByRole('button',{name:'放大预览',exact:true});
 check(await zoom.isVisible(),`${width}: zoom control missing`);
 check(await page.locator('.stage .preview-page-count').isVisible(),`${width}: page count missing`);
 if(await zoom.isVisible()){
  if(touch){await target(zoom,'zoom');await target(page.getByRole('button',{name:'主题色：绿色',exact:true}),'color');await target(page.getByLabel('版式模板',{exact:true}),'template');await target(page.getByRole('button',{name:'智能一页',exact:true}),'fit');}
  const frame=page.locator('.stage .preview-frame');const original=(await frame.boundingBox()).width;
  const layout=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('resume-tool:v1')).variants[0].layout));
  for(let i=0;i<5;i++)await zoom.click();
  check((await frame.boundingBox()).width>original*1.4,`${width}: zoom did not enlarge preview`);
  const left=await page.locator('.stage .preview').evaluate(el=>{el.scrollLeft=0;return {viewport:el.getBoundingClientRect().left,frame:el.querySelector('.preview-frame').getBoundingClientRect().left};});
  check(left.frame>=left.viewport,`${width}: zoomed preview left edge inaccessible`);
  await capture('zoom');
  await page.locator('.stage .preview-zoom-value').click();
  check(Math.abs((await frame.boundingBox()).width-original)<2,`${width}: fit reset failed`);
  check(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('resume-tool:v1')).variants[0].layout))===layout,`${width}: screen zoom changed saved layout`);
 }
 await capture('preview');
 await page.getByLabel('简历语言',{exact:true}).focus();await page.keyboard.press('Tab');
 const focus=await page.getByRole('button',{name:'主题色：蓝色',exact:true}).evaluate(el=>({focused:el===document.activeElement,outline:getComputedStyle(el).outlineStyle}));
 check(focus.focused&&focus.outline!=='none',`${width}: selected color keyboard focus invisible`);
 await page.goto(`${base}/archive`,{waitUntil:'domcontentloaded'});await page.locator('.archive-book-index').waitFor();
 await page.locator('[data-archive-section="工作经历"]').click();
 const card=page.locator('.archive-card-grid > .experience-card').first();
 const head=card.locator(':scope > .card-head, :scope > .pcard-head');
 async function cardTargets(state){
  const drag=await head.locator('.archive-drag-handle').boundingBox(), title=await head.locator('.card-toggle').boundingBox();
  check(drag.x+drag.width<=title.x,`${width}: archive ${state} drag overlaps title`);
  if(touch)await target(head.locator('.archive-drag-handle'),`archive ${state} drag`);
 }
 await cardTargets('collapsed');await capture('archive-cards');
 await head.locator('.card-toggle').click();await cardTargets('expanded');await capture('archive-expanded');
 results.push({width,height,touch,failures:failures.filter(x=>x.startsWith(`${width}:`)||x.startsWith(`${width}/`))});
 await context.close();
}
}finally{await browser.close();if(out)await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
assert.deepEqual(failures,[],failures.join('\n'));
console.log('PASS: responsive controls, touch targets, form reflow, zoom/reset, scroll reachability and isolated layout at all 5 sizes');
