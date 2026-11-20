import test from 'node:test';
import assert from 'node:assert/strict';
import * as workerThreads from 'node:worker_threads';
import { acquireWorkspaceLock } from '../src/workspaceLock.ts';

// Node 24.5+ exposes real Web Locks. Browser coverage exercises this on older Node too.
const locks = workerThreads.locks;
test('only one simultaneous workspace can edit; release permits a fresh owner', { skip: !locks }, async () => {
  const leases = await Promise.all(Array.from({ length: 8 }, () => acquireWorkspaceLock(locks)));
  const owners = leases.filter(Boolean);
  assert.equal(owners.length, 1);
  try {
    assert.equal(await acquireWorkspaceLock(locks), null);
  } finally {
    await owners[0].release();
  }
  const next = await acquireWorkspaceLock(locks);
  assert.ok(next);
  await next.release();
  await next.release(); // Repeated cleanup must not affect another owner.
  const last = await acquireWorkspaceLock(locks);
  assert.ok(last);
  await last.release();
});

test('missing or rejected lock manager never grants edit access', async () => {
  await assert.rejects(acquireWorkspaceLock(undefined));
  await assert.rejects(acquireWorkspaceLock({ request: () => Promise.reject(new Error('blocked')) }), /blocked/);
});
