import assert from 'node:assert/strict';
import { sampleDoc } from '../../src/data.ts';
import { createVariant } from '../../src/variants.ts';
import { layoutFor } from '../../src/variantLayout.ts';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5273';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try { for(const width of [390,1024]) {
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();page.setDefaultTimeout(8000);
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const doc=sampleDoc();doc.variants=[{...createVariant(doc.master,'打印检查'),id:'print',content:structuredClone(doc.master),layout:layoutFor(doc)}];
 await page.evaluate(d=>localStorage.setItem('resume-tool:v1',JSON.stringify(d)),doc);
 await page.goto(`${base}/editor?resume=print`,{waitUntil:'domcontentloaded'});await page.locator('.variant-full-editor').waitFor();
 await page.evaluate(()=>{window.print=()=>{window.__printed=[...document.querySelectorAll('.stage .preview-page')].map(el=>el.textContent);window.dispatchEvent(new Event('afterprint'));};});
 const exportButton=page.getByRole('button',{name:'导出 PDF',exact:true});
 await exportButton.tap();
 let printed=await page.evaluate(()=>window.__printed);assert(printed.length>0,'Export before opening preview must have pages');assert(printed.join('').includes('陈墨'));
 if(width<=880)assert(await page.locator('.panel').isVisible(),'Restore edit pane after printing');
 await page.locator('#editor-基本信息').getByRole('button',{name:/基本信息/}).tap();await page.getByLabel('姓名',{exact:true}).fill('即时打印姓名');
 await exportButton.tap();printed=await page.evaluate(()=>window.__printed);assert(printed.join('').includes('即时打印姓名'),'Print uses latest input');
 if(width<=880)await page.getByRole('button',{name:'预览',exact:true}).tap();
 const zoom=page.getByRole('button',{name:'放大预览',exact:true});for(let i=0;i<5;i++)await zoom.tap();
 await exportButton.tap();await page.emulateMedia({media:'print'});
 const paper=await page.locator('.stage .preview-page').first().boundingBox();assert(Math.abs(paper.width-793.7)<2,'Screen zoom must not enlarge printed paper');
 assert.equal(await page.locator('.preview-controls').isVisible(),false);
 assert((await page.locator('.preview-pages').innerText()).includes('即时打印姓名'));
 await context.close();console.log(`PASS ${width}: first export, latest edit, pane restore and A4 at 150% screen zoom`);
}}finally{await browser.close();}
