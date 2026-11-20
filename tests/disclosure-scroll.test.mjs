import test from 'node:test';
import assert from 'node:assert/strict';
import { disclosureScrollTop } from '../src/disclosureScroll.ts';

test('switching a long company or nested project aligns the new heading below sticky navigation', () => {
  assert.equal(disclosureScrollTop({scrollTop:460,headingTop:300,targetTop:140,maxScroll:1200}),620);
  assert.equal(disclosureScrollTop({scrollTop:620,headingTop:100,targetTop:140,maxScroll:1200}),580);
});
test('retains the heading position for ordinary toggles, even after browser anchoring', () => {
  assert.equal(disclosureScrollTop({scrollTop:500,headingTop:250,targetTop:250,maxScroll:1200}),500);
  assert.equal(disclosureScrollTop({scrollTop:500,headingTop:150,targetTop:250,maxScroll:1200}),400);
});
test('short cards and top/bottom boundaries clamp without overscrolling', () => {
  assert.equal(disclosureScrollTop({scrollTop:0,headingTop:100,targetTop:140,maxScroll:900}),0);
  assert.equal(disclosureScrollTop({scrollTop:700,headingTop:600,targetTop:140,maxScroll:750}),750);
  assert.equal(disclosureScrollTop({scrollTop:0,headingTop:600,targetTop:140,maxScroll:0}),0);
});

test('shared toggle restoration runs after layout and scrolls only the owning editor/archive panel', async () => {
  const { prepareDisclosureScroll } = await import('../src/disclosureScroll.ts');
  const previous = Object.fromEntries(['document','window','getComputedStyle'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  try {
    for (const sticky of [true, false]) {
      const calls=[];
      const nav={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:60,bottom:150})};
      const panel={isConnected:true,scrollHeight:2200,clientHeight:800,clientTop:0,scrollTop:500,parentElement:null,
        getBoundingClientRect:()=>({top:60}),querySelector:()=>sticky?nav:null,
        scrollTo:options=>calls.push(options)};
      let headingTop=800;
      const heading={isConnected:true,parentElement:panel,getBoundingClientRect:()=>({top:headingTop,height:60})};
      const button={closest:()=>heading};
      Object.defineProperty(globalThis,'document',{configurable:true,value:{scrollingElement:{}}});
      Object.defineProperty(globalThis,'window',{configurable:true,value:{innerHeight:1000}});
      Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({overflowY:'auto'})});
      const restore=prepareDisclosureScroll(button,true);
      assert.deepEqual(calls,[],'does not scroll before the previous body collapses');
      headingTop=300;
      restore();
      assert.deepEqual(calls,[{top:sticky?638:728,behavior:'instant'}]);
      calls.length=0;
      heading.isConnected=false;
      restore();
      assert.deepEqual(calls,[],'does not scroll after the item has unmounted');
    }
  } finally {
    for(const [key,descriptor] of Object.entries(previous)) {
      if(descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  }
});

test('a panel that initially fits remains the scroll owner after expansion', async () => {
  const { prepareDisclosureScroll } = await import('../src/disclosureScroll.ts');
  const previous = Object.fromEntries(['document','window','getComputedStyle'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  try {
    const calls=[];
    const root={isConnected:true,scrollHeight:1000,clientHeight:1000,scrollTop:0,clientTop:0,getBoundingClientRect:()=>({top:0}),querySelector:()=>null,scrollTo:()=>{throw new Error('must not scroll the document');}};
    const panel={isConnected:true,scrollHeight:600,clientHeight:600,scrollTop:0,clientTop:0,parentElement:null,getBoundingClientRect:()=>({top:50}),querySelector:()=>null,scrollTo:options=>calls.push(options)};
    let top=400;
    const heading={isConnected:true,parentElement:panel,getBoundingClientRect:()=>({top,height:50})};
    Object.defineProperty(globalThis,'document',{configurable:true,value:{scrollingElement:root}});
    Object.defineProperty(globalThis,'window',{configurable:true,value:{innerHeight:1000}});
    Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({overflowY:'auto'})});
    const restore=prepareDisclosureScroll({closest:()=>heading},true);
    panel.scrollHeight=1300;
    top=300;
    restore();
    assert.deepEqual(calls,[{top:238,behavior:'instant'}]);
  } finally {
    for(const [key,descriptor] of Object.entries(previous)) {
      if(descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  }
});

test('repeated company/project toggles use final bottom-clamped geometry in editor and archive', async () => {
  const { prepareDisclosureScroll } = await import('../src/disclosureScroll.ts');
  const previous=Object.fromEntries(['document','window','getComputedStyle'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  try {
    for(const sticky of [true,false]) {
      let height=2600,scroll=1800,offset=2200;
      const nav={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:50,bottom:140})};
      const panel={isConnected:true,clientHeight:800,clientTop:0,parentElement:null,
        get scrollHeight(){return height;},get scrollTop(){return scroll;},
        getBoundingClientRect:()=>({top:50}),querySelector:()=>sticky?nav:null,
        scrollTo:({top})=>{scroll=Math.max(0,Math.min(top,height-800));}};
      const heading={isConnected:true,parentElement:panel,getBoundingClientRect:()=>({top:50+offset-scroll,height:60})};
      Object.defineProperty(globalThis,'document',{configurable:true,value:{scrollingElement:{}}});
      Object.defineProperty(globalThis,'window',{configurable:true,value:{innerHeight:1000}});
      Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({overflowY:'auto'})});
      // Large company -> short sibling -> nested project -> collapse -> previous company.
      for(const step of [{height:1100,offset:650,switching:true},{height:2100,offset:750,switching:false},{height:1150,offset:750,switching:false},{height:2500,offset:1200,switching:true}]) {
        const originalTop=heading.getBoundingClientRect().top;
        const restore=prepareDisclosureScroll({closest:()=>heading},step.switching);
        height=step.height;offset=step.offset;
        scroll=Math.min(scroll,height-800); // Browser clamps after the previous body disappears.
        restore();
        const safeTop=sticky?140:50;
        const target=step.switching?safeTop+12:Math.max(safeTop+8,Math.min(originalTop,782));
        const expected=Math.max(0,Math.min(height-800,50+offset-target));
        assert.equal(scroll,expected);
        const after=scroll;
        restore();
        assert.equal(scroll,after,'settled geometry does not cause a second adjustment');
        assert.ok(heading.getBoundingClientRect().top>=safeTop);
      }
    }
  } finally {
    for(const [key,descriptor] of Object.entries(previous)) {
      if(descriptor)Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  }
});
