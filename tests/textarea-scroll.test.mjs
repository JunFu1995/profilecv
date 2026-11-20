import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeTextarea } from '../src/textareaResize.ts';

test('measurement does not lose bottom scroll position when textarea temporarily shrinks', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis,'getComputedStyle');
  try {
    Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({overflowY:'auto'})});
    // The browser clamps scrollTop while height:auto is measured; both editor and archive use panels.
    for(const originalTop of [0,640,900]) {
      const calls=[];
      const panel={scrollTop:originalTop,scrollTo:({top})=>{calls.push(top);panel.scrollTop=top;}};
      let height='800px';
      const el={parentElement:panel,clientWidth:300,offsetHeight:50,clientHeight:48,
        getClientRects:()=>[{}],scrollHeight:800,
        style:{get height(){return height;},set height(value){height=value;if(value==='auto')panel.scrollTop=Math.min(panel.scrollTop,150);}}};
      resizeTextarea(el,2);
      assert.equal(panel.scrollTop,originalTop);
      assert.equal(height,'802px');
      assert.deepEqual(calls,originalTop>150?[originalTop]:[]);
    }
  } finally {
    if(previous)Object.defineProperty(globalThis,'getComputedStyle',previous);
    else delete globalThis.getComputedStyle;
  }
});

test('hidden textarea measurements do not change height or scroll', () => {
  const el={getClientRects:()=>[],clientWidth:0,style:{height:'200px'}};
  resizeTextarea(el,2);
  assert.equal(el.style.height,'200px');
});
