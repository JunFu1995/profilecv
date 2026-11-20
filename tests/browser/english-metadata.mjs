// Isolated browser storage; no real user data or translation API calls.
import assert from 'node:assert/strict';
import {sampleDoc} from '../../src/data.ts';
import {buildView, createVariant} from '../../src/variants.ts';
import {layoutFor} from '../../src/variantLayout.ts';
import {localizeView, textKey} from '../../src/translate.ts';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5273';
const doc = sampleDoc();
doc.master.education[0].degree='本科';
// Keep the date assertion independent of future sample resume edits.
doc.master.work[0].start='2022.06';
doc.master.work[0].end='至今';
doc.translations={};
for (const src of localizeView(buildView(doc.master),{}).missing) {
  doc.translations[textKey(src)]={src,en:'English fixture text'};
}
doc.variants=[{...createVariant(doc.master,'English metadata'),id:'english-metadata',
  content:structuredClone(doc.master),layout:{...layoutFor(doc),locale:'en'}}];
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
context.setDefaultTimeout(10000);
try {
  const page=await context.newPage();
  await page.goto(base);
  await page.evaluate(doc=>localStorage.setItem('resume-tool:v1',JSON.stringify(doc)),doc);
  await page.goto(`${base}/editor?resume=english-metadata`);
  const preview=page.locator('.preview-pages');
  await preview.getByText("English fixture text · Bachelor's degree",{exact:true}).first().waitFor();
  assert.match(await preview.innerText(),/2022.06 – Present/);
  assert.match(await preview.innerText(),/Mo Chen, Ming Li, Fang Wang/);
  assert.equal(await preview.locator('strong.pub-self').first().innerText(),'Mo Chen');
  assert.doesNotMatch(await preview.innerText(),/至今|本科|陈墨|李明|王芳/);
  await page.getByRole('button',{name:'校对译文',exact:true}).click();
  const dialog=page.getByRole('dialog');
  assert.equal(await dialog.getByRole('textbox',{name:'李明的英文译文',exact:true}).inputValue(),'Ming Li');
  assert.equal(await dialog.getByRole('textbox',{name:'本科的英文译文',exact:true}).inputValue(),"Bachelor's degree");
  await dialog.getByRole('textbox',{name:'李明的英文译文',exact:true}).fill('M. Li');
  await dialog.getByRole('textbox',{name:'英文姓名',exact:true}).fill('M. Chen');
  await dialog.getByRole('textbox',{name:'本科的英文译文',exact:true}).fill('B.Sc.');
  await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  await preview.getByText('English fixture text · B.Sc.',{exact:true}).first().waitFor();
  assert.match(await preview.innerText(),/M. Chen, M. Li, Fang Wang/);
  assert.equal(await preview.locator('strong.pub-self').first().innerText(),'M. Chen');
  await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('resume-tool:v1')).translations).some(t=>t.en==='B.Sc.'));
  await page.reload();
  await preview.getByText('English fixture text · B.Sc.',{exact:true}).first().waitFor();
  assert.match(await preview.innerText(),/M. Chen, M. Li, Fang Wang/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('resume-tool:v1')));
  assert.equal(saved.master.education[0].degree,'本科');
  assert.equal(saved.variants[0].content.publications[0].authors,'陈墨, 李明, 王芳');
  console.log('PASS: English metadata renders offline, proofreading matches preview, manual spelling and self highlight persist, Chinese source is unchanged');
} finally {
  await context.close();await browser.close();
}
