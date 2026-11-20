/** PDF text runs may split a word or Chinese heading into several adjacent fragments. */
export interface PdfTextRun { str?:string; width?:number; height?:number; transform?:number[] }
export function pdfPageText(items:readonly PdfTextRun[]):string {
  const rows:{y:number;runs:PdfTextRun[]}[]=[];
  for(const item of items){
    if(typeof item.str!=='string'||!item.str||!item.transform)continue;
    const y=item.transform[5];
    let row=rows.find(r=>Math.abs(r.y-y)<2);
    if(!row){row={y,runs:[]};rows.push(row);}row.runs.push(item);
  }
  return rows.sort((a,b)=>b.y-a.y).map(row=>{
    const runs=row.runs.sort((a,b)=>a.transform![4]-b.transform![4]);
    let line='';let previous:PdfTextRun|undefined;
    for(const run of runs){
      if(previous && !/\s$/.test(line) && !/^\s/.test(run.str!)){
        const gap=run.transform![4]-(previous.transform![4]+(previous.width??0));
        const size=Math.abs(run.height||run.transform![3]||10);
        // Contiguous fragments form one word; a visual word/column gap needs a separator.
        if(gap>Math.max(0.7,size*0.18))line+=' ';
      }
      line+=run.str;previous=run;
    }
    return line.replace(/\s+/g,' ').trim();
  }).filter(Boolean).join('\n');
}
