import test from 'node:test';
import assert from 'node:assert/strict';
import { gridDropTarget } from '../src/gridDropTarget.ts';
const cards=[{left:0,right:200,top:0,bottom:120},{left:220,right:420,top:0,bottom:120},{left:0,right:200,top:140,bottom:260}];
test('grid drop distinguishes left and right cards in the same row',()=>{
 assert.deepEqual(gridDropTarget(cards,{x:230,y:50},420),{index:1,position:'before'});
 assert.deepEqual(gridDropTarget(cards,{x:390,y:50},420),{index:1,position:'after'});
 assert.deepEqual(gridDropTarget(cards,{x:20,y:190},420),{index:2,position:'before'});
 assert.deepEqual(gridDropTarget(cards,{x:190,y:290},420),{index:2,position:'after'});
});
test('expanded and mobile single-column cards use vertical insertion',()=>{
 const full=[{left:0,right:420,top:0,bottom:700}];
 assert.deepEqual(gridDropTarget(full,{x:390,y:30},420),{index:0,position:'before'});
 assert.deepEqual(gridDropTarget(full,{x:20,y:650},420),{index:0,position:'after'});
 assert.equal(gridDropTarget([],{x:0,y:0},420),null);
});
