// Run with node --import ./tests/register.mjs; API responses stay inside this test.
import assert from 'node:assert/strict';
import { normalizeDoc } from '../../src/storage.ts';
import { createVariant } from '../../src/variants.ts';
import { layoutFor } from '../../src/variantLayout.ts';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5273';
const doc = normalizeDoc({ master: { research: [{
  id: 'research-sync', company: 'Research Lab', role: 'Researcher',
  researchDraft: { mode: 'paragraph', text: '完成 3 组实验。', bullets: [], sourceHash: '' },
}] } });
const variant = { ...createVariant(doc.master, 'English research'), id: 'english-sync',
  content: structuredClone(doc.master), layout: { ...layoutFor(doc), locale: 'en' } };
doc.variants = [variant];
const translations = {
  '完成 3 组实验。': 'Completed 3 experiments.',
  '完成 6 组实验。': 'Completed 6 experiments.',
  '完成 9 组实验。': 'Completed 9 experiments.',
  '完成 15 组实验。': 'Completed 15 experiments.',
  '完成 18 组实验。': 'Completed 18 experiments.',
};
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(10000);
const requests = [];
let failNext = false;
try {
  await context.route('**/test-ai/chat/completions', async route => {
    const texts = JSON.parse(route.request().postDataJSON().messages.at(-1).content);
    requests.push(texts);
    if (failNext) {
      failNext = false;
      await route.fulfill({ status: 500, json: { error: { message: 'Temporary translation failure' } } });
      return;
    }
    await route.fulfill({ json: { choices: [{ message: {
      content: JSON.stringify(texts.map(text => translations[text] || 'Translated content')),
    } }] } });
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.evaluate(({ doc, base }) => {
    localStorage.setItem('resume-tool:v1', JSON.stringify(doc));
    localStorage.setItem('resume-tool:v3:ai', JSON.stringify({ baseUrl: `${base}/test-ai`, model: 'fixture', apiKey: '' }));
  }, { doc, base });
  await page.goto(`${base}/editor?resume=english-sync`);
  const preview = page.locator('.preview-pages');
  await preview.getByText('Completed 3 experiments.', { exact: true }).waitFor();
  await page.locator('.variant-full-editor .card-toggle').filter({ hasText: 'Research Lab' }).click();
  const summary = page.getByRole('textbox', { name: '研究总结正文', exact: true });
  await summary.fill('完成 6 组实验。');
  await preview.getByText('Completed 6 experiments.', { exact: true }).waitFor();
  await summary.fill('完成 9 组实验。');
  await preview.getByText('Completed 9 experiments.', { exact: true }).waitFor();
  await summary.fill('Manually revised English research.');
  await preview.getByText('Manually revised English research.', { exact: true }).waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).variants[0].content.research[0].researchDraft.text === 'Manually revised English research.');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('resume-tool:v1')));
  assert.equal(saved.master.research[0].researchDraft.text, '完成 3 组实验。');
  assert.deepEqual(requests, [['完成 3 组实验。'], ['完成 6 组实验。'], ['完成 9 组实验。']]);
  console.log('PASS: successive research edits update English preview and persist without changing archive sources');

  // Both intermediate and final drafts have one missing string: watch text, not only count.
  await summary.fill('完成 12 组实验。');
  await summary.fill('完成 15 组实验。');
  await preview.getByText('Completed 15 experiments.', { exact: true }).waitFor();
  assert(!requests.flat().includes('完成 12 组实验。'), 'rapid typing must not translate intermediate drafts');
  assert.equal(requests.length, 4);
  console.log('PASS: rapid edits coalesce into one translation of the latest text');

  failNext = true;
  await summary.fill('完成 18 组实验。');
  await page.locator('.translate-status.error').waitFor();
  // A bounded quiet interval verifies that failures cannot create an automatic retry loop.
  await page.waitForTimeout(1800);
  assert.equal(requests.length, 5);
  await page.locator('.translate-banner').getByRole('button', { name: '翻译', exact: true }).click();
  await preview.getByText('Completed 18 experiments.', { exact: true }).waitFor();
  assert.equal(requests.length, 6);
  console.log('PASS: failures stop automatic requests and the manual retry updates the preview');
} finally {
  await context.close();
  await browser.close();
}
