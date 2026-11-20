import { TECH_TERMS } from './keywords';

export type DiffPart = { kind: 'same' | 'added' | 'removed'; text: string };
// Keep English names/numbers intact, while Chinese edits can be highlighted within a sentence.
const tokenize = (text:string) => text.match(/[A-Za-z0-9]+(?:[._/+:#%-][A-Za-z0-9]+|[+#]+)*|\s+|[^\s]/gu) ?? [];

export function diffSummary(before:string,after:string):DiffPart[] {
 const a=tokenize(before),b=tokenize(after),out:DiffPart[]=[];
 const push=(kind:DiffPart['kind'],text:string)=>{if(!text)return;const last=out.at(-1);if(last?.kind===kind)last.text+=text;else out.push({kind,text});};
 let start=0;while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 let endA=a.length,endB=b.length;while(endA>start&&endB>start&&a[endA-1]===b[endB-1]){endA--;endB--;}
 push('same',a.slice(0,start).join(''));
 const n=endA-start,m=endB-start;
 // Bound work for pasted documents; preserve exact text even when the middle must be grouped.
 if(!n)push('added',b.slice(start,endB).join(''));
 else if(!m)push('removed',a.slice(start,endA).join(''));
 else if(n*m>1_000_000){push('removed',a.slice(start,endA).join(''));push('added',b.slice(start,endB).join(''));}
 else {
  const table=Array.from({length:n+1},()=>new Uint32Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)table[i][j]=a[start+i]===b[start+j]?1+table[i+1][j+1]:Math.max(table[i+1][j],table[i][j+1]);
  let i=0,j=0;
  while(i<n||j<m){
   if(i<n&&j<m&&a[start+i]===b[start+j]){push('same',a[start+i]);i++;j++;}
   else if(i<n&&(j===m||table[i+1][j]>=table[i][j+1]))push('removed',a[start+i++]);
   else push('added',b[start+j++]);
  }
 }
 push('same',a.slice(endA).join(''));return out;
}

const escapeRe=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const researchTerms=['随机对照试验','消融实验','对照实验','置信区间','显著性检验','回归分析','有限元','质谱','光谱','Transformer','PyTorch','TensorFlow','BERT','ResNet','LoRA','RAG'];
export function summaryTerms(text:string):string[] {
 const candidates:{text:string;start:number;end:number}[]=[];
 for(const term of [...TECH_TERMS,...researchTerms]){
  const re=new RegExp((/[a-z]/i.test(term)?'(?<![a-z0-9_+#])':'')+escapeRe(term)+(/[a-z]/i.test(term)?'(?![a-z0-9_+#])':''),'gi');
  for(const match of text.matchAll(re))candidates.push({text:match[0],start:match.index!,end:match.index!+match[0].length});
 }
 // Supplement the dictionary with acronyms and mixed-case technology names, not every English word.
 for(const match of text.matchAll(/(?<![A-Za-z0-9_])[A-Za-z][A-Za-z0-9]*(?:[./+#-][A-Za-z0-9]+|[+#]+)*(?![A-Za-z0-9_])/g)){
  if(/[A-Z].*[A-Z]/.test(match[0])||/[a-z][A-Z]|[A-Za-z]\d/.test(match[0]))candidates.push({text:match[0],start:match.index!,end:match.index!+match[0].length});
 }
 const longest=candidates.filter(c=>!candidates.some(other=>other.start<=c.start&&other.end>=c.end&&other.end-other.start>c.end-c.start)).sort((a,b)=>a.start-b.start);
 const seen=new Set<string>();return longest.flatMap(c=>{const key=c.text.toLowerCase();if(seen.has(key))return [];seen.add(key);return [c.text];});
}

export function summaryNumbers(text:string):string[] {
 const normalized=text.normalize('NFKC');
 const matches=normalized.match(/(?<![A-Za-z0-9_])[+−-]?\d+(?:,\d{3})*(?:\.\d+)?(?:[eE][+-]?\d+)?\s*(?:%|‰|ms|μs|µs|ns|秒|分钟|小时|个月|毫秒|万|亿|千|倍|人|次|天|年|个|条|起|项|台|套|层|[kKmMgGtT][bB]?|s)?\+?/g)??[];
 return [...new Set(matches.map(value=>value.replace(/\s+/g,'').replaceAll(',','').replace('−','-')))];
}
export function summaryFactChanges(before:string,after:string){
 const changes=(a:string[],b:string[],key:(s:string)=>string)=>({removed:a.filter(x=>!b.some(y=>key(x)===key(y))),added:b.filter(x=>!a.some(y=>key(x)===key(y)))});
 return {numbers:changes(summaryNumbers(before),summaryNumbers(after),s=>s),terms:changes(summaryTerms(before),summaryTerms(after),s=>s.toLowerCase())};
}
