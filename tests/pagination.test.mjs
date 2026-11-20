import test from 'node:test';
import assert from 'node:assert/strict';
import { planPageSlices } from '../src/pagination.ts';

test('exact one-page content and empty documents never create a trailing blank page', () => {
  assert.deepEqual(planPageSlices(50, 1050, 1000, [], []), [{from:50,to:1050}]);
  assert.deepEqual(planPageSlices(50, 50, 1000, [], []), [{from:50,to:50}]);
});

test('ordinary entries and headings move intact to the next page', () => {
  assert.deepEqual(planPageSlices(50, 1400, 1000, [], [{top:900,bottom:1200}]),
    [{from:50,to:900},{from:900,to:1400}]);
});

test('oversized paragraphs split between complete lines and preserve every line exactly once', () => {
  const lines=Array.from({length:150},(_,i)=>({top:50+i*22,bottom:68+i*22}));
  const bottom=lines.at(-1).bottom;
  const slices=planPageSlices(50,bottom,1000,lines,[{top:50,bottom}]);
  assert.equal(slices.length,4);
  assert.equal(slices[0].from,50);
  assert.equal(slices.at(-1).to,bottom);
  slices.forEach((slice,i)=>{
    assert.ok(slice.to>slice.from && slice.to-slice.from<=1000);
    if(i)assert.equal(slice.from,slices[i-1].to);
  });
  lines.forEach(line=>assert.equal(slices.filter(s=>line.top>=s.from && line.bottom<=s.to).length,1));
});

test('mixed inline font sizes cannot be bisected at page boundaries',()=>{
  const lines=[{top:980,bottom:1010},{top:975,bottom:990}];
  assert.equal(planPageSlices(0,1800,1000,lines,[])[0].to,975);
});

test('retreating for one group also preserves a second group at the new boundary',()=>{
  const slices=planPageSlices(0,1800,1000,[],[{top:900,bottom:1100},{top:850,bottom:950}]);
  assert.equal(slices[0].to,850);
});

test('long resumes are not silently truncated at thirty pages',()=>{
  const pages=planPageSlices(0,41000,1000,[],[]);
  assert.equal(pages.length,41);
  assert.equal(pages.at(-1).to,41000);
});

test('impossible page dimensions and oversized indivisible elements fail explicitly',()=>{
  assert.throws(()=>planPageSlices(0,100,0,[],[]));
  assert.throws(()=>planPageSlices(0,2000,1000,[{top:0,bottom:1500}],[]));
});
