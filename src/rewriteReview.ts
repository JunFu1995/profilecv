import { checkNumbers } from './digits';
export interface DiffPiece { type:'same'|'added'|'removed'; text:string }
export function textDiff(original:string,next:string):DiffPiece[]{
 const a=Array.from(original),b=Array.from(next);
 if(a.length*b.length>1000000)return [{type:'removed',text:original},{type:'added',text:next}];
 const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 const out:DiffPiece[]=[];const push=(type:DiffPiece['type'],text:string)=>{const last=out.at(-1);if(last?.type===type)last.text+=text;else out.push({type,text});};
 let i=0,j=0;while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){push('same',a[i++]);j++;}else if(j<b.length&&(i===a.length||dp[i][j+1]>=dp[i+1][j]))push('added',b[j++]);else push('removed',a[i++]);}
 return out;
}
export function factWarnings(original:string,next:string):string[]{
 const out:string[]=[];const numbers=checkNumbers(original,next);
 if(numbers.extra.length)out.push(`新增数字：${numbers.extra.join('、')}，请核实来源。`);
 if(numbers.missing.length)out.push(`未保留数字：${numbers.missing.join('、')}，请核实是否遗漏或只是单位换算。`);
 if(/参与|协助|配合|支持/.test(original)&&/主导|独立|牵头|全面负责/.test(next)&&!/主导|独立|牵头|全面负责/.test(original))out.push('职责可能被放大：参与或协助被改成主导、独立承担等表述。');
 if(/计划|目标|预计|拟|希望/.test(original)&&/实现|达成|提升|降低|完成/.test(next)&&!/计划|目标|预计|拟|希望/.test(next))out.push('目标可能被写成已实现成果，请核实是否真正达成。');
 if(/团队|协同|共同/.test(original)&&/独立|个人|本人/.test(next))out.push('团队成果可能被归为个人贡献，请核实归属。');
 const terms=(s:string)=>new Set((s.match(/[A-Za-z][A-Za-z0-9+#.-]*/g)??[]).map(x=>x.toLowerCase()));
 const before=terms(original),added=[...terms(next)].filter(t=>!before.has(t));
 if(added.length)out.push(`新增英文术语：${added.join('、')}，可能涉及新增技术，请核实。`);
 return out;
}
