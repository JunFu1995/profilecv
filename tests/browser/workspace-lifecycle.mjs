// Isolated fictional data; checks the public UI rather than hook implementation.
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { sampleDoc } from '../../src/data.ts';
import { normalizeDoc } from '../../src/storage.ts';
import { editableVariantContent } from '../../src/variants.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5273';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const doc = sampleDoc();
doc.variants = doc.variants.map((v, i) => ({ ...v, id: `lifecycle-${i}`, content: editableVariantContent(doc.master, v) }));
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('resume-tool:v1')));
const category = title => page.locator(`[data-archive-section="${title}"]`).click();
async function toolsMenu() {
  const disclosure = page.locator('details.archive-tools-disclosure');
  if (!await disclosure.evaluate(el => el.open)) await disclosure.locator('summary').first().click();
  const menu = disclosure.locator('.action-menu').filter({ has: page.locator('summary', { hasText: '备份与恢复' }) });
  if (!await menu.evaluate(el => el.open)) await menu.locator('summary').click();
}
try {
  await page.goto(base);
  await page.evaluate(doc => localStorage.setItem('resume-tool:v1', JSON.stringify(doc)), doc);
  await page.goto(`${base}/archive`);
  await category('基本信息');
  await page.getByLabel('姓名', { exact: true }).fill('章节编辑测试');
  const entries = [
    ['工作经历', 'work', '公司', '重构验证公司'],
    ['独立项目', 'sideProjects', '项目名称', '重构验证项目'],
    ['科研经历', 'research', '机构 / 实验室', '重构验证实验室'],
    ['发表论文', 'publications', '标题', '重构验证论文'],
    ['教育经历', 'education', '学校', '重构验证大学'],
    ['技能', 'skills', '分组名称', '重构验证技能'],
  ];
  for (const [title, key, label, value] of entries) {
    await category(title);
    const card = page.locator(`#editor-${title} [data-locate="${doc.master[key][0].id}"]`).first();
    const toggle = card.locator('.card-toggle').first();
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    await card.getByLabel(label, { exact: true }).fill(value);
  }
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).master.skills[0].label === '重构验证技能');
  const updated = await saved();
  assert.equal(updated.master.basics.name, '章节编辑测试');
  for (const [, key, , value] of entries) assert(Object.values(updated.master[key][0]).includes(value));
  assert(isDeepStrictEqual(updated.variants, JSON.parse(JSON.stringify(normalizeDoc(doc).variants))), 'editing archive chapters leaves both persisted variants intact');
  await page.reload();
  await category('基本信息');
  assert.equal(await page.getByLabel('姓名', { exact: true }).inputValue(), '章节编辑测试');
  console.log('PASS: all seven chapters save independently and survive reload');

  await page.getByRole('link', { name: /进入简历库/ }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).first().click();
  await page.locator('.variant-select').selectOption('lifecycle-0');
  await page.waitForURL('**/editor?resume=lifecycle-0');
  await page.locator('.variant-select').selectOption('lifecycle-1');
  await page.waitForURL('**/editor?resume=lifecycle-1');
  await page.goBack();
  await page.waitForURL('**/editor?resume=lifecycle-0');
  assert.equal(await page.locator('.variant-select').inputValue(), 'lifecycle-0');
  await page.reload();
  assert.equal(await page.locator('.variant-select').inputValue(), 'lifecycle-0');
  assert.match(await page.title(), new RegExp(doc.variants[0].name));
  await page.goto(`${base}/archive`);
  const before = await saved();
  const imported = sampleDoc(); imported.master.basics.name = '备份导入测试';
  await page.getByRole('button', { name: '导入档案', exact: true }).click();
  await page.locator('input[type="file"][accept=".json,application/json"]').setInputFiles({ name: 'fictional-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await page.getByRole('button', { name: '确认覆盖并恢复', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).master.basics.name === '备份导入测试');
  await page.getByLabel('姓名', { exact: true }).fill('导入后的修改');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).master.basics.name === '导入后的修改');
  await page.reload();
  await toolsMenu();
  await page.getByRole('button', { name: '撤销本次导入', exact: true }).click();
  await page.getByRole('button', { name: '保留当前内容', exact: true }).click();
  assert.equal((await saved()).master.basics.name, '导入后的修改');
  await toolsMenu();
  await page.getByRole('button', { name: '撤销本次导入', exact: true }).click();
  await page.getByRole('button', { name: '确认撤销', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).master.basics.name === '章节编辑测试');
  assert(isDeepStrictEqual(await saved(), before), 'undo restores the complete persisted document');
  await page.reload();
  assert(isDeepStrictEqual(await saved(), before), 'undo restores the complete persisted document');
  console.log('PASS: variant history/refresh and import undo confirmation preserve exact saved data');
  await toolsMenu();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '清空全部内容', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).variants.length === 0);
  await page.goto(`${base}/editor?resume=missing`);
  await page.waitForURL('**/resumes');
  await page.getByRole('heading', { name: '简历库', exact: true }).waitFor();
  await page.getByRole('link', { name: /返回档案库/ }).click();
  await toolsMenu();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '恢复上次操作前', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).variants.length === 2);
  assert(isDeepStrictEqual(await saved(), before), 'snapshot restores all chapters and resumes after clear and reload');
  console.log('PASS: empty editor route falls back to resume library; snapshot restoration survives navigation');
  assert.deepEqual(errors, []);
} finally { await context.close(); await browser.close(); }
