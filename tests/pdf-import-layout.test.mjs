import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfPageText} from '../src/import/pdfLayout.ts';
const run=(str,x,y,width=10)=>({str,width,height:10,transform:[10,0,0,10,x,y]});
test('PDF fragments rejoin Chinese headings, English words and DOI without synthetic spaces',()=>{
 assert.equal(pdfPageText([run('教育',0,100,20),run('经历',20,100,20),run('T',0,80,5),run('race-Based',5,80,50),run('Service',58,80,30),run('DOI:',0,60,20),run(' ',20,60,3),run('10.1234',23,60,35),run('/test.001',58,60,40)]),'教育经历\nTrace-Based Service\nDOI: 10.1234/test.001');
});
test('PDF row grouping tolerates baseline rounding boundaries, orders runs and retains word gaps',()=>{
 assert.equal(pdfPageText([run('2024',100,100,20),run('公司',0,99.4,20),run('行二',0,86,20),{},run('末行',0,70,20)]),'公司 2024\n行二\n末行');
});
