// Run with PLAYWRIGHT_MODULE_PATH pointing to an installed playwright entry point.
// Uses a fresh context: never reads or modifies the user's browser data.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome', ignoreDefaultArgs: ['--disable-back-forward-cache'] });
const context = await browser.newContext();
context.setDefaultTimeout(10000);
context.on('page', page => {
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
});
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5273';
const errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
const editor = page => page.locator('.app.workspace-theme');
const endEditing = async page => {
  const tools = page.getByRole('navigation', { name: '档案工具', exact: true });
  const disclosure = tools.locator('details.archive-tools-disclosure');
  if (!await disclosure.evaluate(element => element.open)) await disclosure.locator('summary').first().click();
  await tools.getByRole('button', { name: '结束本页编辑', exact: true }).click();
};
const retry = page => page.getByRole('button', { name: '在此继续编辑', exact: true }).click();
const savedName = page => page.evaluate(() => JSON.parse(localStorage.getItem('resume-tool:v1')).master.basics.name);
const openName = async page => {
  await page.getByRole('navigation', { name: '档案类别' }).getByRole('button', { name: '基本信息', exact: true }).click();
  return page.getByLabel('姓名', { exact: true });
};
try {
  const first = await context.newPage();
  await first.goto(`${base}/archive`);
  await first.getByRole('heading', { name: '档案库', exact: true }).waitFor();
  const second = await context.newPage();
  await second.goto(`${base}/archive`);
  // A second mounted editor is the regression, even before either tab is edited.
  await second.waitForTimeout(700);
  assert.equal(await second.locator('input, textarea, [contenteditable="true"]').count(), 0,
    'a second tab must not mount any editable workspace or autosave effects');
  await second.getByRole('heading', { name: '此档案正在另一个标签页编辑' }).waitFor();
  console.log('PASS: secondary tab does not mount an editor');

  const name = await openName(first);
  await name.fill('首次交接前的修改');
  await endEditing(first);
  await first.getByRole('heading', { name: '本页已结束编辑' }).waitFor();
  assert.equal(await savedName(second), '首次交接前的修改');
  await retry(second);
  const secondName = await openName(second);
  assert.equal(await secondName.inputValue(), '首次交接前的修改');
  console.log('PASS: handoff flushes pending edits and reads the latest saved document');

  await secondName.fill('第二页的更新');
  await endEditing(second);
  await retry(first);
  const returnedName = await openName(first);
  assert.equal(await returnedName.inputValue(), '第二页的更新');
  console.log('PASS: remounting a previously used tab does not restore its old module snapshot');

  await first.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'resume-tool:v1') throw new DOMException('Test quota', 'QuotaExceededError');
      return window.originalSetItem.call(this, key, value);
    };
  });
  await returnedName.fill('保存失败时必须保留的内容');
  await endEditing(first);
  await first.getByRole('alert').filter({ hasText: '自动保存失败' }).waitFor();
  assert.equal(await editor(first).count(), 1);
  assert.equal(await returnedName.inputValue(), '保存失败时必须保留的内容');
  await retry(second);
  await second.getByRole('heading', { name: '此档案正在另一个标签页编辑' }).waitFor();
  assert.equal(await savedName(second), '第二页的更新');
  await first.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await endEditing(first);
  await retry(second);
  assert.equal(await (await openName(second)).inputValue(), '保存失败时必须保留的内容');
  console.log('PASS: failed saves retain the editor, lock and unsaved content');

  const before = await second.evaluate(() => localStorage.getItem('resume-tool:v1'));
  await first.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await first.waitForTimeout(650);
  assert.equal(await second.evaluate(() => localStorage.getItem('resume-tool:v1')), before);
  await first.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await first.getByRole('heading', { name: '此档案正在另一个标签页编辑' }).waitFor();
  console.log('PASS: released tab lifecycle events cannot overwrite the current editor');

  await (await openName(second)).fill('关闭前的最后修改');
  await Promise.all([second.waitForEvent('close'), second.close({ runBeforeUnload: true })]);
  await retry(first);
  assert.equal(await (await openName(first)).inputValue(), '关闭前的最后修改');
  console.log('PASS: closing the owner flushes edits and frees the lock');

  await first.reload();
  assert.equal(await (await openName(first)).inputValue(), '关闭前的最后修改');
  await first.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await first.getByRole('heading', { name: '本页已结束编辑' }).waitFor();
  const third = await context.newPage();
  await third.goto(`${base}/archive`);
  await editor(third).waitFor();
  await first.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await first.getByRole('heading', { name: '此档案正在另一个标签页编辑' }).waitFor();
  console.log('PASS: refresh preserves data; a restored page must compete for editing again');

  await third.getByRole('link', { name: /进入简历库/ }).click();
  await third.getByRole('heading', { name: '简历库', exact: true }).waitFor();
  await third.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await retry(third);
  await third.getByRole('heading', { name: '简历库', exact: true }).waitFor();
  console.log('PASS: reentering the same tab preserves the current workspace route');

  await third.setViewportSize({ width: 390, height: 844 });
  await first.setViewportSize({ width: 390, height: 844 });
  for (const page of [first, third]) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  }
  console.log('PASS: editor and read-only screen fit narrow viewports');

  const unsupported = await context.newPage();
  await unsupported.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
  await unsupported.goto(`${base}/archive`);
  await unsupported.getByRole('heading', { name: '当前环境暂时无法安全编辑' }).waitFor();
  assert.equal(await unsupported.locator('input, textarea').count(), 0);
  assert.equal(await savedName(unsupported), '关闭前的最后修改');
  console.log('PASS: unsupported environments remain read-only and preserve stored data');

  const parallel = await browser.newContext();
  parallel.setDefaultTimeout(10000);
  try {
    const tabs = await Promise.all(Array.from({ length: 4 }, () => parallel.newPage()));
    await Promise.all(tabs.map(page => page.goto(`${base}/archive`)));
    await Promise.all(tabs.map(page => page.waitForFunction(() =>
      document.querySelector('.app.workspace-theme') || document.querySelector('h1')?.textContent === '此档案正在另一个标签页编辑')));
    const owners = await Promise.all(tabs.map(page => editor(page).count()));
    assert.equal(owners.reduce((sum, count) => sum + count, 0), 1);
    assert.equal(await editor(third).count(), 1, 'independent browser contexts must not share a lock');
    console.log('PASS: simultaneous startup grants exactly one editor per browser context');
  } finally { await parallel.close(); }

  const corrupt = await browser.newContext();
  corrupt.setDefaultTimeout(10000);
  try {
    const page = await corrupt.newPage();
    await page.goto(base);
    await page.evaluate(() => localStorage.setItem('resume-tool:v1', '{broken-original'));
    await page.goto(`${base}/archive`);
    await page.getByRole('alert').filter({ hasText: '存档读取失败' }).waitFor();
    const recoveryName = await openName(page);
    await recoveryName.fill('尚未解决读取错误时的修改');
    await endEditing(page);
    assert.equal(await editor(page).count(), 1, 'recovery mode must veto releasing unsaved edits');
    assert.equal(await recoveryName.inputValue(), '尚未解决读取错误时的修改');
    assert.equal(await page.evaluate(() => localStorage.getItem('resume-tool:v1')), '{broken-original');
    console.log('PASS: unreadable archives block handoff and retain unsaved edits and the original data');
  } finally { await corrupt.close(); }

  const history = await browser.newContext();
  history.setDefaultTimeout(10000);
  await history.addInitScript(() => {
    window.addEventListener('pageshow', event => { window.restoredFromCache = event.persisted; });
  });
  try {
    const old = await history.newPage();
    await old.goto(`${base}/archive`);
    await (await openName(old)).fill('导航前保存的内容');
    await old.goto(base);
    const current = await history.newPage();
    await current.goto(`${base}/archive`);
    const currentName = await openName(current);
    assert.equal(await currentName.inputValue(), '导航前保存的内容');
    await currentName.fill('历史页面恢复时的新内容');
    await current.waitForFunction(() => JSON.parse(localStorage.getItem('resume-tool:v1')).master.basics.name === '历史页面恢复时的新内容');
    // Wait for the visible result: cached restores have no fresh load event.
    await old.evaluate(() => window.history.back());
    await old.getByRole('heading', { name: '此档案正在另一个标签页编辑' }).waitFor();
    assert.equal(await savedName(old), '历史页面恢复时的新内容');
    const cached = await old.evaluate(() => window.restoredFromCache);
    console.log(`PASS: real history navigation preserves latest data (BFCache restored: ${cached})`);
    if (process.env.REQUIRE_BFCACHE) assert.equal(cached, true, 'production test must exercise a real cached page restoration');
  } finally { await history.close(); }
  assert.deepEqual(errors, []);
} finally {
  await context.close();
  await browser.close();
}
