// Start pnpm dev, then run with the same loader as the browser regression tests:
// PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs node --import ./tests/register.mjs scripts/capture-screenshots.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { sampleDoc } from '../src/data.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5273';
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Use a local development server for documentation screenshots.');
const out = new URL('../docs/screenshots/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  // Never reuse a personal browser profile or call model providers.
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  const settle = async () => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    });
    await page.waitForTimeout(500);
  };
  await page.goto(base, { waitUntil: 'networkidle' });
  await settle();
  await page.screenshot({ path: new URL('home.jpg', out).pathname, quality: 90, animations: 'disabled' });
  const doc = sampleDoc();
  doc.variants[0].id = 'readme-backend';
  await page.evaluate(doc => {
    localStorage.clear();
    localStorage.setItem('resume-tool:v1', JSON.stringify(doc));
    localStorage.setItem('resume-tool:v1:demo', '1');
  }, doc);
  await page.goto(`${base}/editor?resume=readme-backend`, { waitUntil: 'networkidle' });
  await page.locator('.variant-full-editor').waitFor();
  await page.getByRole('button', { name: '智能一页', exact: true }).click();
  await settle();
  const basics = page.locator('#editor-基本信息');
  if (!(await basics.getByLabel('姓名', { exact: true }).isVisible())) {
    await basics.getByRole('button', { name: /基本信息/ }).click();
  }
  await page.mouse.click(1550, 20);
  await settle();
  await page.screenshot({ path: new URL('editor.png', out).pathname, animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto(`${base}/resumes`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '预览简历：后端开发 · 校招示例', exact: true }).click();
  const dialog = page.locator('.resume-preview-dialog');
  await dialog.waitFor();
  await page.mouse.move(10, 10);
  await settle();
  await dialog.screenshot({ path: new URL('preview.png', out).pathname, animations: 'disabled' });
  assert.equal(await page.evaluate(() => localStorage.getItem('resume-tool:v3:ai')), null);
  assert.deepEqual(errors, []);
  console.log('Captured home, editor and preview with fictional sample data; no API key or model requests.');
  await context.close();
} finally { await browser.close(); }
