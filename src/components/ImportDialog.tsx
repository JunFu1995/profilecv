import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../useEscapeKey';
import type { Doc, Master } from '../types';
import { parseResumeText, isConfigured, loadAiConfig, saveAiConfig } from '../ai';
import { coerceParsed, heuristicParse, toMaster, type ParsedResume } from '../import/parse';
import type { BasicField } from '../import/apply';
import { extractText } from '../import/extractText';
import { AiConfigForm } from './AiConfigForm';
import { ImportReview } from './ImportReview';
import { readJsonFile } from '../storage';

type Stage='pick'|'config'|'working'|'review'|'error';
export function ImportDialog({existing,variantCount,onApplyMaster,onApplyDoc,onClose}:{
 existing:Master;variantCount:number;onApplyMaster:(master:Master,replaceBasics:BasicField[])=>boolean;onApplyDoc:(doc:Doc)=>boolean;onClose:()=>void;
}){
 const [stage,setStage]=useState<Stage>('pick');const [error,setError]=useState('');
 const [parsed,setParsed]=useState<ParsedResume|null>(null);const [backup,setBackup]=useState<Doc|null>(null);
 const [source,setSource]=useState('');const [paste,setPaste]=useState('');const [lastText,setLastText]=useState('');
 const [useAi,setUseAi]=useState(()=>isConfigured(loadAiConfig()));const [replaceBasics,setReplaceBasics]=useState<BasicField[]>([]);
 const [applying,setApplying]=useState(false);const applyingRef=useRef(false);
 const alive=useRef(true),abortRef=useRef<AbortController|null>(null),fileRef=useRef<HTMLInputElement>(null),backupRef=useRef<HTMLInputElement>(null);
 useEscapeKey(onClose);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;abortRef.current?.abort();};},[]);
 const fail=(err:unknown)=>{if(!alive.current||(err instanceof DOMException&&err.name==='AbortError'))return;setError(err instanceof Error?err.message:'解析失败，请重试');setStage('error');};
 const parseText=async(text:string,label:string,withAi:boolean)=>{
  setBackup(null);setParsed(null);setReplaceBasics([]);setError('');setSource(label);setLastText(text);
  if(text.trim().length<20){setError('未读取到足够文字。扫描版 PDF 暂不支持识别，请改用文字版文件或粘贴文本。');setStage('error');return;}
  abortRef.current?.abort();const ctrl=new AbortController();abortRef.current=ctrl;
  if(withAi&&!isConfigured(loadAiConfig())){setStage('config');return;}setStage('working');
  try{const next=withAi?coerceParsed(await parseResumeText({text,config:loadAiConfig(),signal:ctrl.signal})):heuristicParse(text);
   if(!alive.current||ctrl.signal.aborted)return;setParsed(next);setStage('review');
  }catch(e){if(!ctrl.signal.aborted)fail(e);}
 };
 const onFile=async(file:File,isBackup=false)=>{
  setError('');setSource(file.name);setParsed(null);setBackup(null);setLastText('');setStage('working');
  try{if(isBackup){const doc=await readJsonFile(file);if(!alive.current)return;setBackup(doc);setStage('review');}
   else {const text=await extractText(file);if(alive.current)await parseText(text,file.name,useAi);}
  }catch(e){fail(e);}
 };
 const apply=()=>{
  if(applyingRef.current)return;applyingRef.current=true;setApplying(true);setError('');
  try{const ok=backup?onApplyDoc(backup):parsed?onApplyMaster(toMaster(coerceParsed(parsed)),replaceBasics):false;
   if(!ok)setError('未能保存导入，请检查浏览器存储空间；当前素材未被替换。');
  }catch(e){setError(e instanceof Error?e.message:'导入失败');}
  finally{applyingRef.current=false;setApplying(false);}
 };
 const count=parsed?parsed.work.length+parsed.research.length+parsed.sideProjects.length+parsed.publications.length+parsed.education.length+parsed.skills.length+[...parsed.work,...parsed.research].reduce((n,w)=>n+w.projects.length,0):0;
 const hasContent=!!parsed&&(count>0||Object.values(parsed.basics).some(v=>typeof v==='string'?v.trim():v.length)||!!parsed.unassigned.trim());
 return <div className="modal-mask" role="dialog" aria-modal="true" aria-labelledby="import-title" onClick={onClose}>
  <div className={`modal ${stage==='review'&&parsed?'import-dialog':'narrow'}`} onClick={e=>e.stopPropagation()}>
   <header className="modal-head"><div><h2 id="import-title">{backup?'恢复备份':stage==='review'?'核对导入内容':'导入简历'}</h2><p className="modal-sub">{stage==='review'&&parsed?'内容可直接修改，确认前不会写入素材库。':'上传文件或粘贴文本，核对后再加入素材库。'}</p></div><button type="button" className="btn" onClick={onClose}>取消</button></header>
   <div className="modal-body">
    {error&&<p className="ai-error" role="alert">{error}</p>}
    {stage==='config'&&<><p>配置 AI 接口后继续解析。也可以返回，使用本地规则解析。</p><AiConfigForm saveLabel="保存并解析" onSave={config=>{saveAiConfig(config);void parseText(lastText,source,true);}} onCancel={()=>setStage('pick')}/></>}
    {(stage==='pick'||stage==='error')&&<>
     <div className="import-choices"><button type="button" className="import-card" onClick={()=>fileRef.current?.click()}><span className="import-card-title">上传简历</span><span className="import-card-sub">PDF / DOCX / TXT / MD · 最多 15 MB</span></button><button type="button" className="import-card" onClick={()=>backupRef.current?.click()}><span className="import-card-title">恢复 JSON 备份</span><span className="import-card-sub">完整恢复素材及版本，单独确认</span></button></div>
     <label className="field import-paste"><span>或粘贴简历全文</span><textarea rows={7} value={paste} onChange={e=>setPaste(e.target.value)} placeholder="粘贴姓名、工作经历、科研经历、论文等完整内容"/></label>
     <label className="import-ai"><input type="checkbox" checked={useAi} onChange={e=>setUseAi(e.target.checked)}/><span>用 AI 识别结构</span></label>
     <p className="ai-note">{useAi?'简历文字会发送至 AI 设置中配置的服务商；只提取原文，不改写内容。':'本地规则解析不发送简历。能粗略识别分类，论文细节和项目归属需要手动核对。'}</p>
     <div className="ai-actions"><button className="btn btn-primary" type="button" disabled={!paste.trim()} onClick={()=>void parseText(paste,'粘贴文本',useAi)}>解析并核对</button>{stage==='error'&&lastText&&<button className="btn" type="button" onClick={()=>void parseText(lastText,source,false)}>用本地规则重试</button>}</div>
    </>}
    {stage==='working'&&<div className="ai-loading" role="status"><span className="spinner"/>正在解析「{source}」…</div>}
    {stage==='review'&&backup&&<div className="import-review"><p>完整备份：{backup.master.basics.name||'未填写姓名'} · {backup.variants.length} 个投递版本。</p><p className="import-warn">恢复备份会覆盖当前素材库及全部投递版本。确认前不修改任何内容，恢复后可撤销。</p></div>}
    {stage==='review'&&parsed&&<><div className="import-review-summary"><span>来源：{source}</span><strong>追加导入</strong><span>保留现有素材和 {variantCount} 个投递版本</span></div><ImportReview draft={parsed} onChange={setParsed} existing={existing} replaceBasics={replaceBasics} onReplaceBasics={setReplaceBasics} sourceText={lastText}/></>}
   </div>
   {stage==='review'&&<footer className="modal-foot import-confirm"><div><strong>{backup?'确认后恢复整份备份':`新增 ${count} 条素材${parsed?.unassigned.trim()?'，另保留待整理原文':''}`}</strong><span>{backup?'会保存导入前的恢复记录。':`仅更新你勾选的冲突字段；已有版本保持原样。导入后可撤销。`}</span></div><div className="ai-actions"><button type="button" className="btn" onClick={()=>{setBackup(null);setParsed(null);setError('');setStage('pick');}}>重新选择</button><button type="button" className="btn btn-primary" disabled={applying||(!backup&&!hasContent)} onClick={apply}>{applying?'正在保存…':backup?'确认覆盖并恢复':'确认导入'}</button></div></footer>}
   <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void onFile(f);e.target.value='';}}/>
   <input ref={backupRef} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void onFile(f,true);e.target.value='';}}/>
  </div>
 </div>;
}
