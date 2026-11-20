import {customItemLocateId} from '../customCategories';
import { isConfigured, loadAiConfig, recommendWithAi } from '../ai';
import { mergeRecommendedAdditions } from '../aiRecommendations';
import { loadCreationDraft, saveCreationDraft, clearCreationDraft } from '../creationDraft';
import { useEffect, useMemo, useRef, useState } from 'react';
import { uid } from '../id';
import type { Master, Variant, JobPosting } from '../types';
import { materialCategoryLabels, recommendMaterials, refreshRecommendations, toggleRecommendedBullet, variantFromRecommendations, type Recommendation } from '../recommendations';
import { analyzeJd } from '../keywords';
import { resolveVariant } from '../variants';
import { flattenView } from '../lint';
import { Preview } from './Preview';
import { useEscapeKey } from '../useEscapeKey';
import type { VariantLayout } from '../variantLayout';

export function CreateVariantDialog({master,layout,onCreate,onClose,jobs,onSaveJob}:{jobs:JobPosting[];onSaveJob:(job:JobPosting)=>void;master:Master;layout:VariantLayout;onCreate:(v:Variant)=>void;onClose:()=>void}) {
  const labels=materialCategoryLabels(master);
  const aiReady=isConfigured(loadAiConfig());
  const [method,setMethod]=useState<'quick'|'ai'>(()=>isConfigured(loadAiConfig())?'ai':'quick');
  const [busy,setBusy]=useState(false);
  const [recommendError,setRecommendError]=useState('');
  const [proposal,setProposal]=useState<Recommendation[]|null>(null);
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  const [restored]=useState(()=>loadCreationDraft(master));
  const [jobId,setJobId]=useState<string|undefined>(restored?.jobId);
  const [entry,setEntry]=useState<'existing'|'new'|'general'>(restored?.jobId?'existing':'new');
  const [jobSearch,setJobSearch]=useState('');
  const [restoreBanner,setRestoreBanner]=useState(!!restored);
  const [jobEditor,setJobEditor]=useState<{company:string;role:string;jd:string}|null>(null);
  const [company,setCompany]=useState(restored?.company??''); const [role,setRole]=useState(restored?.role??''); const [jd,setJd]=useState(restored?.jd??'');
  const [rows,applyRows]=useState<Recommendation[]|null>(restored?.rows??null); const [step,setStep]=useState<'job'|'select'>(restored?.step??'job');
  const [history,setHistory]=useState<(Recommendation[]|null)[]>([]);
  const setRows=(next:Recommendation[]|null|((old:Recommendation[]|null)=>Recommendation[]|null))=>{
    const value=typeof next==='function'?next(rows):next;
    setHistory(h=>[...h.slice(-29),rows]);applyRows(value);
  };
  const undo=()=>{if(!history.length)return;applyRows(history[history.length-1] ? refreshRecommendations(master,jd,history[history.length-1]!) : null);if(history[history.length-1]===null)setStep('job');setHistory(h=>h.slice(0,-1));};
  const [saveFailed,setSaveFailed]=useState(false);
  const [keyword,setKeyword]=useState('');
  const [collapsed,setCollapsed]=useState<Record<string,boolean>>({});
  const [groupTarget,setGroupTarget]=useState<{id:string;stamp:number}|null>(null);
  const [search,setSearch]=useState(''); const [filter,setFilter]=useState('all'); const [section,setSection]=useState('all'); const [mobile,setMobile]=useState('materials');
  const [design,setDesign]=useState(restored?.design??layout);
  const root = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<{id:string;side:'materials'|'preview';stamp:number}|null>(null);
  const [notice,setNotice]=useState(restored?'已恢复上次创建草稿，并按当前素材库更新内容。':'');
  const state={company,role,jd,rows,step,design,jobId};
  const finished=useRef(false);
  useEffect(()=>{if(!finished.current)setSaveFailed(!saveCreationDraft({company,role,jd,rows,step,design,jobId}));},[company,role,jd,rows,step,design,jobId]);
  const close=()=>{
    request.current?.abort();
    if(!saveCreationDraft(state)){setSaveFailed(true);setNotice('草稿保存失败，当前选择仍在此窗口中。请先完成创建，或检查浏览器存储。');return;}
    onClose();
  };
  useEscapeKey(()=>{if(busy){request.current?.abort();return;}if(proposal){setProposal(null);return;}if(jobEditor)setJobEditor(null);else close();});
  const restart=()=>{if(!window.confirm('放弃当前创建草稿，从头开始？素材库与已创建版本不受影响。'))return;
    setRestoreBanner(false);setJobId(undefined);setEntry('new');setJobEditor(null);setCompany('');setRole('');setJd('');applyRows(null);setStep('job');setDesign(layout);setHistory([]);setKeyword('');setNotice('已重新开始。');
  };
  const locatePreview = (r:Recommendation) => {
    if(!r.selected) { setNotice('这项素材尚未选入，勾选后即可在预览中查看。'); return; }
    setNotice(''); setMobile('preview'); setLocation({id:r.section.startsWith('custom:')?customItemLocateId(r.section.slice(7),r.id):r.id,side:'preview',stamp:Date.now()});
  };
  const locateMaterial = (id:string) => {
    const custom=(rows??[]).find(r=>r.section.startsWith('custom:')&&(id===customItemLocateId(r.section.slice(7),r.id)||id.startsWith(customItemLocateId(r.section.slice(7),r.id)+'::')));
    if(custom)id=custom.id;
    if(!(rows??[]).some(r=>r.id===id)) { setNotice('基本信息与章节标题不参与素材筛选，可在创建后编辑。'); return; }
    setCollapsed({});setKeyword('');setSearch('');setFilter('all');setSection('all');setMobile('materials');setNotice('');
    setLocation({id,side:'materials',stamp:Date.now()});
  };
  useEffect(()=>{
    if(!location) return;
    const scope=root.current;
    const container=scope?.querySelector<HTMLElement>(location.side==='preview'?'.creation-preview .preview':'.creation-materials');
    const target=scope?.querySelector<HTMLElement>(location.side==='preview'?`.creation-preview [data-locate="${CSS.escape(location.id)}"]`:`[data-material="${CSS.escape(location.id)}"]`);
    if(!container||!target) { setNotice('当前素材没有可显示的正文，请检查选中的要点。'); return; }
    const top=target.getBoundingClientRect().top-container.getBoundingClientRect().top+container.scrollTop;
    const offset=location.side==='materials'?(scope?.querySelector('.creation-filters')?.clientHeight??0)+12:45;
    container.scrollTo({top:Math.max(0,top-offset),behavior:'smooth'});
    target.classList.remove('selection-locate');void target.offsetWidth;target.classList.add('selection-locate');
    const timer=setTimeout(()=>target.classList.remove('selection-locate'),2200);
    return ()=>{clearTimeout(timer);target.classList.remove('selection-locate');};
  },[location]);
  const draft=useMemo(()=>({...variantFromRecommendations(master,rows??[],company.trim(),role.trim(),jd.trim()),layout:design}),[master,rows,company,role,jd,design]);
  const view=useMemo(()=>resolveVariant(master,draft),[master,draft]);
  const coverage=analyzeJd(jd,flattenView(view));
  const available=analyzeJd(jd,(rows??[]).map(r=>r.text).join('\n'));
  const canAdd=coverage.missing.filter(k=>available.present.some(a=>a.term===k.term));
  const absent=coverage.missing.filter(k=>!available.present.some(a=>a.term===k.term));
  const visible=(rows??[]).filter(r=>(!keyword||r.terms.includes(keyword))&&(section==='all'||r.section===section)&&(filter==='all'||filter==='selected'&&r.selected||filter==='unselected'&&!r.selected||filter==='recommended'&&r.level==='recommended')&&`${r.title} ${r.text}`.toLowerCase().includes(search.toLowerCase()));
  const groups=Object.entries(labels).map(([id,label])=>({id,label,items:visible.filter(r=>r.section===id),all:(rows??[]).filter(r=>r.section===id)})).filter(g=>g.items.length>0);
  useEffect(()=>{setCollapsed({});},[search,keyword,filter,section]);
  useEffect(()=>{
    if(!groupTarget)return;
    const container=root.current?.querySelector<HTMLElement>('.creation-materials');
    const target=root.current?.querySelector<HTMLElement>(`[data-material-group="${groupTarget.id}"]`);
    if(container&&target){
      const offset=root.current?.querySelector('.creation-filters')?.clientHeight??0;
      container.scrollTo({top:container.scrollTop+target.getBoundingClientRect().top-container.getBoundingClientRect().top-offset-8,behavior:'smooth'});
      target.querySelector<HTMLButtonElement>('.material-group-toggle')?.focus({preventScroll:true});
    }
  },[groupTarget]);
  const update=(row:Recommendation, fn:(r:Recommendation)=>Recommendation)=>setRows(old=>old!.map(r=>r.id===row.id&&r.section===row.section?{...fn(r),userAdjusted:true}:r));
  const generate=async(replace=false,forceQuick=false)=>{
    const source=recommendMaterials(master,jd.trim());setRecommendError('');
    if(method==='ai'&&!forceQuick&&jd.trim()){
      const ctrl=new AbortController();request.current=ctrl;setBusy(true);
      const timer=setTimeout(()=>ctrl.abort(),60000);
      try{const result=await recommendWithAi(source,jd.trim(),ctrl.signal);if(ctrl.signal.aborted)return;
        if(replace&&rows)setProposal(result);else{setRows(result);setStep('select');}
      }catch(err){setRecommendError(ctrl.signal.aborted?'推荐已取消或超时，原选择未改变。':err instanceof Error?err.message:'推荐失败');}
      finally{clearTimeout(timer);setBusy(false);}
    }else{if(replace&&rows)setProposal(source);else{setRows(source);setStep('select');}}
  };
  const next=()=>{if(entry==='existing'&&!jobId){setNotice('请先选择岗位。');return;}if(entry==='new'&&!jobId&&role.trim()&&jd.trim()){const id=uid();onSaveJob({id,company:company.trim(),role:role.trim(),jdText:jd.trim(),url:'',note:'',updatedAt:new Date().toISOString()});setJobId(id);}if(rows){setRows(refreshRecommendations(master,jd.trim(),rows));setStep('select');}else void generate();};
  const selectionChanges=proposal?(rows??[]).flatMap(r=>{
    const p=proposal.find(x=>x.id===r.id&&x.section===r.section);if(!p)return [];
    const before=r.selected?r.bullets.filter(b=>b.selected!==false).map(b=>b.id):[];
    const after=p.selected?p.bullets.filter(b=>b.selected!==false).map(b=>b.id):[];
    const added=after.filter(id=>!before.includes(id)).length;const removed=before.filter(id=>!after.includes(id)).length;
    return r.selected!==p.selected||added||removed?[`${r.title}：${!r.selected&&p.selected?'建议选入；':r.selected&&!p.selected?'建议移除；':''}新增 ${added} 条、移除 ${removed} 条要点`]:[];
  }):[];
  const applyJob = () => {
    if(!jobEditor)return;
    const nextJD=jobEditor.jd.trim();
    setCompany(jobEditor.company.trim());setRole(jobEditor.role.trim());setJd(nextJD);
    setRows(rows?refreshRecommendations(master,nextJD,rows):recommendMaterials(master,nextJD));
    setKeyword('');setFilter('all');setJobEditor(null);
    setNotice(nextJD?'已更新岗位与匹配提示，保留原有选择和素材顺序。':'已切换为通用简历，保留原有选择。');
  };
  const selected=(rows??[]).filter(r=>r.selected);
  return <div className="modal-mask" role="dialog" aria-modal="true" aria-labelledby="create-title"><div ref={root} className={`modal ${step==='select'?'creation-wide':'narrow'}`}>
    <header className="modal-head"><div><h2 id="create-title">{step==='job'?'创建投递版本':'挑选这次投递的素材'}</h2><p className="modal-sub">{step==='job'?'1 填写岗位 → 2 筛选并预览':`${company} ${role} · 选择立即反映到右侧，素材库不受影响`}</p></div><button className="btn" onClick={close}>保存草稿并关闭</button></header>
    <details className="creation-tools" open={step==='job'?true:undefined}><summary>推荐与草稿设置</summary>
    <div className="recommend-mode"><label>推荐方式 <select aria-label="推荐方式" disabled={busy||!!proposal} value={method} onChange={e=>setMethod(e.target.value as 'quick'|'ai')}><option value="quick">快速推荐 · 关键词</option><option value="ai" disabled={!aiReady}>AI 推荐{!aiReady?' · 请先在顶栏配置 AI':''}</option></select></label><span>{method==='ai'?'点击分析会将 JD 和经历素材发送到已配置接口，可能产生费用。':'本地关键词初筛，不调用接口。'}{rows?' 修改 JD 仅更新提示；需要重新选择时请主动重新推荐。':''}</span>{step==='select'&&jd.trim()&&<button className="btn" disabled={busy||!!jobEditor} onClick={()=>void generate(true)}>重新分析并推荐</button>}</div>
    <div className="draft-controls"><span role="status">{saveFailed?'草稿保存失败，请勿关闭页面':'草稿自动保存在本机，可关闭后继续'}</span><button className="btn" onClick={restart}>重新开始</button></div>
    </details>
    {recommendError&&<div className="recommending-error" role="alert">{recommendError}<button className="btn" onClick={()=>{setMethod('quick');void generate(!!rows,true);}}>改用快速推荐</button></div>}
    {busy&&<div className="recommend-overlay" role="status"><p>正在分析 JD 与素材证据…</p><p>当前选择不会被修改。</p><button className="btn" onClick={()=>request.current?.abort()}>取消分析</button></div>}
    {proposal&&<div className="recommend-overlay"><div className="recommend-proposal"><h3>确认推荐变化</h3><p>默认只补充新增建议；全部应用会替换现有勾选。应用后可撤销，经历顺序保持不变。</p>{selectionChanges.length?selectionChanges.map((line,i)=><p key={i}>{line}</p>):<p>与当前选择一致。</p>}<div className="ai-actions"><button className="btn btn-primary" onClick={()=>{setRows(mergeRecommendedAdditions(rows!,proposal));setProposal(null);}}>只补充新增建议</button><button className="btn" onClick={()=>{setRows(rows!.map(r=>proposal.find(p=>p.id===r.id&&p.section===r.section)??r));setProposal(null);}}>全部应用（含移除）</button><button className="btn" onClick={()=>setProposal(null)}>取消</button></div></div></div>}

    {saveFailed&&<div className="recommending-error" role="alert">草稿保存失败，请勿关闭页面。</div>}
    {restoreBanner&&<div className="restored-job-banner" role="status"><span>已恢复：{[restored?.company,restored?.role].filter(Boolean).join(' · ')||'通用简历'} · {restored?.jd.trim()?'已关联 JD':'未关联 JD'}</span><button className="btn" onClick={()=>setRestoreBanner(false)}>知道了</button></div>}
    {step==='job'?<div className="modal-body ai-form">
      <div className="job-entry-options" aria-label="岗位来源">{([{id:'existing',label:'选择已有岗位'},{id:'new',label:'新增岗位'},{id:'general',label:'通用简历'}] as const).map(item=><button type="button" className={`btn ${entry===item.id?'btn-primary':''}`} aria-pressed={entry===item.id} key={item.id} onClick={()=>{setEntry(item.id);setJobId(undefined);setCompany('');setRole('');setJd('');}}>{item.label}</button>)}</div>
      {entry==='existing'&&<><label className="ai-field">搜索岗位<input value={jobSearch} onChange={e=>setJobSearch(e.target.value)}/></label><label className="ai-field">选择岗位<select value={jobId??''} onChange={e=>{const job=jobs.find(j=>j.id===e.target.value);setJobId(job?.id);setCompany(job?.company??'');setRole(job?.role??'');setJd(job?.jdText??'');}}><option value="">请选择岗位</option>{jobs.filter(j=>`${j.company} ${j.role} ${j.jdText}`.toLowerCase().includes(jobSearch.toLowerCase())).map(j=><option key={j.id} value={j.id}>{j.company} · {j.role}</option>)}</select></label>{!jobs.length&&<p className="ai-note">岗位库为空，请切换到「新增岗位」。</p>}</>}
      {entry==='new'&&<p className="ai-note">填写岗位名称和 JD 后，继续时自动保存到岗位库。</p>}
      {entry!=='general'&&<>
      <label className="ai-field">公司<input readOnly={entry==='existing'} value={company} onChange={e=>setCompany(e.target.value)}/></label>
      <label className="ai-field">目标岗位<input readOnly={entry==='existing'} value={role} onChange={e=>setRole(e.target.value)}/></label>
      <label className="ai-field">岗位描述（JD，可选）<textarea rows={7} readOnly={entry==='existing'} value={jd} onChange={e=>setJd(e.target.value)} placeholder="粘贴岗位职责和任职要求；留空可创建通用简历。"/></label>
      </>}
      {entry==='general'&&<p className="ai-note">不关联岗位，自由选择素材，之后也可补充 JD。</p>}
      {notice&&<p role="status">{notice}</p>}
      {rows&&<p className="ai-note">修改 JD 后更新推荐理由，保留之前的勾选与素材顺序。</p>}
      <button className="btn btn-primary" onClick={next}>{rows?'更新提示并继续':jd.trim()?method==='ai'?'分析并推荐':'查看推荐素材':'选择通用简历素材'}</button>
    </div>:<>
      <div className="job-context-bar"><div><strong>{jd.trim()?[company,role].filter(Boolean).join(' · ')||'目标岗位待命名':'通用简历 · 未关联 JD'}</strong><span>{jd.trim()?`已填写 JD · ${jd.trim().length} 字 · 查看卡片推荐理由`:'可先自由选择素材，添加 JD 后再查看岗位匹配提示'}{!jd.trim()&&(company||role)?` · ${[company,role].filter(Boolean).join(' · ')}`:''}</span></div><button className="btn" onClick={()=>setJobEditor({company,role,jd})}>{jd.trim()?'查看 / 编辑 JD':'添加 JD'}</button></div>
      <div className="creation-mobile"><button className="btn" onClick={()=>setMobile('materials')}>素材</button><button className="btn" onClick={()=>setMobile('preview')}>预览</button></div>
      <div className={`creation-body mobile-${mobile}`}>
        {jobEditor&&<aside className="job-editor" role="region" aria-label="编辑目标岗位"><header><h3>目标岗位与 JD</h3><button className="btn" onClick={()=>setJobEditor(null)}>取消编辑</button></header><div className="ai-form">
          <label className="ai-field">公司<input autoFocus value={jobEditor.company} onChange={e=>setJobEditor({...jobEditor,company:e.target.value})}/></label>
          <label className="ai-field">目标岗位<input value={jobEditor.role} onChange={e=>setJobEditor({...jobEditor,role:e.target.value})}/></label>
          <label className="ai-field">JD 原文<textarea rows={12} value={jobEditor.jd} onChange={e=>setJobEditor({...jobEditor,jd:e.target.value})} placeholder="粘贴岗位职责与任职要求"/></label>
          <p className="ai-note">保存只更新匹配提示，保留已选素材与顺序。清空 JD 将切换为通用简历。取消或按 Esc 放弃本次编辑。</p>
          <button className="btn btn-primary" onClick={applyJob}>保存并更新提示</button>
        </div></aside>}

        <section className="creation-materials" aria-label="素材选择">
          <div className="creation-filters">
            <input aria-label="搜索素材" placeholder="搜索公司、项目或技术…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <nav className="material-group-nav" aria-label="素材分类快捷导航">{groups.map(g=><button type="button" key={g.id} onClick={()=>{setCollapsed(c=>({...c,[g.id]:false}));setGroupTarget({id:g.id,stamp:Date.now()});}}>{g.label}<span>{g.items.length}</span></button>)}</nav>
            <details className="advanced-material-filters"><summary>筛选与关键词分析{filter!=='all'||section!=='all'||keyword?' · 已启用筛选':''}</summary>
            <div className="design-options"><select aria-label="筛选状态" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部素材</option>{jd.trim()&&<option value="recommended">推荐素材</option>}<option value="selected">已选</option><option value="unselected">未选</option></select><select aria-label="素材分类" value={section} onChange={e=>setSection(e.target.value)}><option value="all">全部分类</option>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
            <p className="ai-note">{jd.trim()?'关键词标签仅作辅助，AI 建议会附原文证据。未推荐素材也可手动选入。':'通用简历模式，不按岗位匹配推荐。'}工作经历默认时间倒序。</p>
            {jd.trim()&&<details className="keyword-groups"><summary>关键词覆盖 {coverage.matched}/{coverage.total} · 查看可补充素材</summary>
              {([{title:'已选内容覆盖',items:coverage.present},{title:'素材有，尚未选入',items:canAdd},{title:'素材库未找到',items:absent}]).map(group=><div key={group.title}><strong>{group.title}（{group.items.length}）</strong><div className="chips">{group.items.map(k=><button className="btn" key={k.term} onClick={()=>{
                if(group.title==='素材库未找到'){setNotice(`素材库中未找到「${k.display}」的关键词证据，请核实后补充真实经历。`);return;}
                const matches=(rows??[]).filter(r=>r.terms.includes(k.display));
                if(!matches.length){setNotice(`「${k.display}」出现在基本信息或简介中，可在创建后编辑。`);return;}
                setKeyword(k.display);setSearch('');setFilter('all');setSection('all');setMobile('materials');setNotice(`已筛出包含「${k.display}」的素材，展开卡片可选择对应要点。`);
              }}>{k.display}</button>)}</div></div>)}
            </details>}
            </details>
            {(filter!=='all'||section!=='all')&&<button className="btn" onClick={()=>{setFilter('all');setSection('all');}}>清除状态 / 分类筛选</button>}
            {keyword&&<button className="btn" onClick={()=>setKeyword('')}>清除关键词筛选：{keyword} ×</button>}

          </div>
          {visible.length===0&&<p className="ai-note">没有符合条件的素材，试试其他分类或搜索词。</p>}
          {groups.map(group=><section className="material-group" data-material-group={group.id} key={group.id} aria-label={group.label}>
            <header className="material-group-heading">
              <button type="button" className="material-group-toggle" aria-expanded={!collapsed[group.id]} aria-controls={`materials-${group.id}`} onClick={()=>setCollapsed(c=>({...c,[group.id]:!c[group.id]}))}><span aria-hidden>{collapsed[group.id]?'▸':'▾'}</span><strong>{group.label}</strong><span>已选 {group.all.filter(r=>r.selected).length} / 共 {group.all.length} 项{group.items.length!==group.all.length?` · 显示 ${group.items.length} 项`:''}</span></button>
              <div className="group-batch-actions"><span>仅操作当前显示的 {group.items.length} 项</span><button type="button" className="btn" onClick={()=>{
                setRows(old=>old!.map(r=>group.items.includes(r)?{...r,userAdjusted:true,selected:true,bullets:r.bullets.map(b=>({...b,selected:true}))}:r));
                setNotice(`已选入${group.label}当前显示的 ${group.items.length} 项及其全部要点，可撤销。`);
              }}>选入当前组</button><button type="button" className="btn" onClick={()=>{
                setRows(old=>old!.map(r=>group.items.includes(r)?{...r,userAdjusted:true,selected:false,bullets:r.bullets.map(b=>({...b,selected:false}))}:r));
                setNotice(`已取消${group.label}当前显示的 ${group.items.length} 项，可撤销。`);
              }}>取消当前组</button></div>
            </header>
            <div id={`materials-${group.id}`} hidden={!!collapsed[group.id]}>
          {group.items.map(r=>{const i=rows!.indexOf(r);return <article data-material={r.id} className={`recommendation-card${r.selected?' is-picked':''}`} key={`${r.section}-${r.id}`}>
            <label><input type="checkbox" aria-label={`整段选择 ${r.title}`} ref={el=>{if(el) el.indeterminate=r.selected&&!r.composed&&r.bullets.some(b=>b.selected===false);}} checked={r.selected} onChange={e=>update(r,x=>({...x,selected:e.target.checked,bullets:x.bullets.map(b=>({...b,selected:e.target.checked}))}))}/><strong>{labels[r.section]} · {r.title||'未命名'}</strong><span className={`selection-badge${r.selected?' active':''}`}>{!r.selected?'未选':!r.composed&&r.bullets.some(b=>b.selected===false)?'部分选入':'全部选入'}</span></label>
            <div className="material-meta"><span>{r.end||'时间未填写'}</span><span>{r.userAdjusted?'已手动调整 · ':''}{r.provenance?.method==='ai'?'AI 推荐依据':r.provenance?'关键词推荐依据':'通用素材'}{r.provenance&&(r.provenance.jd!==jd.trim()||r.provenance.text!==r.text)&&<strong className="stale-recommendation"> · 依据待更新</strong>}</span></div>
            <details className="recommend-reason"><summary>为什么推荐 / 查看依据</summary>{r.provenance&&(r.provenance.jd!==jd.trim()||r.provenance.text!==r.text)&&<p className="selection-warning">JD 或素材已变化，以下为旧推荐依据，选择已保留。可在「推荐与草稿设置」中重新分析。</p>}<p>{r.reason}</p>{r.provenance&&<details><summary>当时的 JD</summary><p>{r.provenance.jd}</p></details>}</details>
            {r.composed?<><p className="ai-note">此项目使用 STAR 合成稿，整段选入；原始要点不单独控制合成稿。</p><p className="creation-excerpt">{r.text}</p></>:<>
              {r.bullets.length===0&&<p className="creation-excerpt">{r.text}</p>}
              {r.bullets.slice(0,2).map(b=><label className="bullet-choice" key={b.id}><input type="checkbox" checked={r.selected&&b.selected!==false} onChange={e=>update(r,x=>toggleRecommendedBullet(x,b.id,e.target.checked))}/><span>{b.text}{b.terms.length>0&&<small>命中 {b.terms.join('、')}</small>}</span></label>)}
              {r.bullets.length>2&&<details><summary>展开其余 {r.bullets.length-2} 条要点</summary>{r.bullets.slice(2).map(b=><label className="bullet-choice" key={b.id}><input type="checkbox" checked={r.selected&&b.selected!==false} onChange={e=>update(r,x=>toggleRecommendedBullet(x,b.id,e.target.checked))}/><span>{b.text}</span></label>)}</details>}
            </>}
            {r.selected&&!r.composed&&r.bullets.length>0&&r.bullets.every(b=>b.selected===false)&&<p className="selection-warning">未选择要点，标题、职位或背景等信息仍可能出现在简历中。若要移除整段，请取消顶部的整段勾选。</p>}
            <button className="btn locate-preview-button" onClick={()=>locatePreview(r)}>{r.selected?'在预览中定位':'查看预览位置'}</button><div className="creation-card-footer"><span>{r.selected?'已选入':'未选入'}{!r.composed&&r.bullets.length>0&&` · ${r.selected?r.bullets.filter(b=>b.selected!==false).length:0}/${r.bullets.length} 条要点`}</span><div>{[-1,1].map(delta=><button className="btn" key={delta} disabled={!rows![i+delta]||rows![i+delta].section!==r.section} onClick={()=>{const next=[...rows!];[next[i],next[i+delta]]=[next[i+delta],next[i]];setRows(next);}}>{delta<0?'上移':'下移'}</button>)}</div></div>
          </article>;})}
            </div>
          </section>)}
        </section>
        <section className="creation-preview" aria-label="所选简历预览"><Preview onLocate={locateMaterial} view={view} accent={design.theme.accent} locale={design.locale} scale={design.layoutScale} stretch={design.layoutStretch} template={design.template} onLayout={({scale,stretch})=>setDesign(d=>({...d,layoutScale:scale,layoutStretch:stretch}))}/></section>
      </div>
      <footer className="creation-footer">{notice&&<span className="creation-notice" role="status">{notice}</span>}<span role="status">已选 {selected.length} / {rows!.length} 项素材 · {selected.filter(r=>!r.composed).reduce((n,r)=>n+r.bullets.filter(b=>b.selected!==false).length,0)} 条原始要点</span><div><button className="btn" disabled={!history.length} onClick={undo}>撤销</button><button className="btn btn-primary" disabled={!selected.length||!!jobEditor} onClick={()=>{finished.current=true;onCreate({...draft,jobTarget:{...draft.jobTarget,jobId}});clearCreationDraft();}}>创建版本</button></div></footer>
    </>}
  </div></div>;
}
