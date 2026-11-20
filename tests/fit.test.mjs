import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPaper, fitFeedback, A4_HEIGHT_PX, MIN_FIT} from '../src/fit.ts';

function measuredPaper(natural, gaps = 5) {
  const values = new Map();
  return {
    style: {minHeight: '', setProperty: (key, value) => values.set(key, value)},
    get offsetHeight() { return natural * Number(values.get('--fit') ?? 1) + gaps * parseFloat(values.get('--stretch') ?? '0'); },
    querySelectorAll: () => Array(gaps),
  };
}

test('smart fit distinguishes fitting near the minimum font from actual overflow', () => {
  const target = A4_HEIGHT_PX - 16;
  const boundary = fitPaper(measuredPaper(target / .7608));
  assert.ok(boundary.scale <= MIN_FIT + .001);
  assert.equal(boundary.fitsOnPage, true);
  const overflow = fitPaper(measuredPaper(3000));
  assert.equal(overflow.scale, MIN_FIT);
  assert.equal(overflow.fitsOnPage, false);
});

test('smart fit handles compression, existing fit and short content without overflow', () => {
  for (const [natural, reason] of [[1400, 'compressed'], [1090, 'fits'], [400, 'expanded']]) {
    const paper = measuredPaper(natural);
    const result = fitPaper(paper);
    assert.equal(result.reason, reason);
    assert.equal(result.fitsOnPage, true);
    assert.ok(paper.offsetHeight <= A4_HEIGHT_PX - 16);
  }
});


test('smart fit warns when real pagination still needs more than one page', () => {
  const result = fitPaper(measuredPaper(1400));
  assert.equal(result.fitsOnPage, true);
  const feedback = fitFeedback(result, 2);
  assert.ok(feedback);
  assert.match(feedback.text, /当前仍为 2 页/);
  assert.match(feedback.text, /已保留全部内容/);
  assert.equal(fitFeedback(result, 1), null);
});

test('smart fit reports overflow and safety-margin failures without claiming one-page success', () => {
  const result = fitPaper(measuredPaper(3000));
  const overflow = fitFeedback(result, 3);
  assert.ok(overflow);
  assert.match(overflow.text, /当前仍为 3 页/);
  const boundary = fitFeedback(result, 1);
  assert.ok(boundary);
  assert.match(boundary.text, /导出时可能分页/);
  assert.doesNotMatch(boundary.text, /当前仍为 1 页|正好一页/);
});


test('all successful one-page outcomes are silent, including sparse content', () => {
  for (const natural of [1400, 1090, 400]) {
    const result = fitPaper(measuredPaper(natural));
    assert.equal(result.fitsOnPage, true);
    assert.equal(fitFeedback(result, 1), null);
  }
});
