// node --import ./tests/register.mjs tests/browser/variant-basics.mjs
import assert from 'node:assert/strict';
import { sampleDoc } from '../../src/data.ts';
import { createVariant } from '../../src/variants.ts';
import { layoutFor } from '../../src/variantLayout.ts';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5273';
const doc = sampleDoc();
doc.variants = ['basics-first', 'basics-other'].map(id => ({
  ...createVariant(doc.master, id), id, content: structuredClone(doc.master),
  layout: { ...layoutFor(doc), locale: 'zh' },
}));
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(10000);
try {
  const page = await context.newPage();
  await page.goto(base);
  await page.evaluate(doc => localStorage.setItem('resume-tool:v1', JSON.stringify(doc)), doc);
  await page.goto(`${base}/editor?resume=basics-first`);
  await page.locator('.variant-full-editor').waitFor();
  const basics = page.locator('#editor-基本信息');
  const toggle = basics.getByRole('button', { name: /基本信息/ });
  await toggle.waitFor();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await basics.getByLabel('姓名', { exact: true }).isVisible(), false);
  assert.equal(await page.getByRole('navigation', { name: '简历章节' }).count(), 0);
  assert(await basics.evaluate(element => !!(element.compareDocumentPosition(document.getElementById('editor-工作经历')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  if (process.env.SCREENSHOT_DIR) {
    await (await import('node:fs/promises')).mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/editor-desktop.png` });
  }
  await toggle.click();
  await basics.getByLabel('姓名', { exact: true }).fill('仅当前版本姓名');
  await page.locator('.preview-pages').getByRole('heading', { name: '仅当前版本姓名', exact: true }).waitFor();
  await toggle.click();
  await page.locator('.preview-pages').getByRole('heading', { name: '仅当前版本姓名', exact: true }).click();
  await basics.getByLabel('姓名', { exact: true }).waitFor();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).variants[0].content.basics.name === '仅当前版本姓名');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('resume-tool:v1')));
  assert.equal(saved.master.basics.name, doc.master.basics.name);
  assert.equal(saved.variants[1].content.basics.name, doc.master.basics.name);
  await page.locator('.variant-select').selectOption('basics-other');
  await page.waitForFunction(() => new URL(location.href).searchParams.get('resume') === 'basics-other');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  console.log('PASS: basics starts collapsed, edits only this version, and expands from preview navigation');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/editor-${width}.png` });
    await toggle.click();
    assert(await basics.getByLabel('姓名', { exact: true }).isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await toggle.click();
  }
  console.log('PASS: collapsed and expanded basics fit mobile layouts');
} finally {
  await context.close();
  await browser.close();
}
