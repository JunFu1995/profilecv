import { Hint } from '../Hint';
import { TrashIcon } from '@radix-ui/react-icons';
import { useRef, useState } from 'react';
import type { Basics, LinkItem } from '../../types';
import { uid } from '../../data';
import { fileToPhotoDataUrl } from '../../photo';
import { AutoTextarea, Field, IconButton } from '../ui';
import { Section } from './Section';
import type { EditorSectionProps } from './types';

export function BasicsSection({ master, actions, activeSection, onSupplement }: EditorSectionProps) {
  const { set } = actions;
  const basics = master.basics;
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState('');

  const pickPhoto = async (file: File) => {
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      set((m) => ({ ...m, basics: { ...m.basics, photo: dataUrl } }));
      setPhotoError('');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '照片处理失败');
    }
  };
  const setBasics = (p: Partial<Basics>) => set((m) => ({ ...m, basics: { ...m.basics, ...p } }));

  const photoField = (
    <div className="photo-field">
      {basics.photo ? (
        <div className="photo-inline">
          <img src={basics.photo} alt="个人照片" />
          <div className="photo-actions">
            <button type="button" className="link-btn" onClick={() => photoRef.current?.click()}>
              更换
            </button>
            <button type="button" className="link-btn" onClick={() => setBasics({ photo: undefined })}>
              移除
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost small" onClick={() => photoRef.current?.click()}>
          ＋ 添加个人照片{activeSection === undefined ? '（可选）' : ''}
        </button>
      )}
      {photoError && <span className="field-hint warn">{photoError}</span>}
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickPhoto(f);
          e.target.value = '';
        }}
      />
    </div>
  );

  const setLinks = (links: LinkItem[]) => setBasics({ links });
  return <>
      <div data-locate="basics">
      <Section title="基本信息">
        {activeSection === undefined && photoField}
        <div className="grid-2 basics-grid">
          <Field label="姓名" value={basics.name} onChange={(v) => setBasics({ name: v })} placeholder="陈墨" />
          {activeSection === undefined ? <Field label="目标职位" value={basics.title} onChange={(v) => setBasics({ title: v })} placeholder="后端工程师" /> : <div className="field basics-photo-field">
            <span className="field-label">个人照片（可选）</span>
            {photoField}
          </div>}
          <Field label="手机" value={basics.phone} onChange={(v) => setBasics({ phone: v })} placeholder="138-0000-0000" />
          <Field label="邮箱" value={basics.email} onChange={(v) => setBasics({ email: v })} placeholder="you@example.com" />
          <Field label="城市" value={basics.city} onChange={(v) => setBasics({ city: v })} placeholder="杭州" />
          {activeSection !== undefined && <Field label="目标职位" value={basics.title} onChange={(v) => setBasics({ title: v })} placeholder="后端工程师" />}
        </div>

        <div className="field-block basics-links">
          <span className="field-label">链接</span>
          {basics.links.map((l) => (
            <div className="inline-row" key={l.id}>
              <input
                className="w-90"
                aria-label="链接名称"
                value={l.label}
                placeholder="GitHub"
                onChange={(e) => setLinks(basics.links.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))}
              />
              <input
                aria-label="链接地址"
                value={l.url}
                placeholder="github.com/yourname"
                onChange={(e) => setLinks(basics.links.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)))}
              />
              <IconButton title="删除链接" danger onClick={() => setLinks(basics.links.filter((x) => x.id !== l.id))}>
                <TrashIcon aria-hidden="true" />
              </IconButton>
            </div>
          ))}
          <button hidden={!!onSupplement} type="button" className="btn-ghost small" onClick={() => setLinks([...basics.links, { id: uid(), label: '', url: '' }])}>
            ＋ 添加链接
          </button>
        </div>

        <div className="field-block basics-summary">
          <div className="field-label-row"><span className="field-label">一句话简介</span><Hint label="一句话简介填写说明">3 行以内最佳：年限 + 领域 + 一个最硬的成果。</Hint></div>
          <AutoTextarea
            ariaLabel="一句话简介"
            value={basics.summary}
            onChange={(v) => setBasics({ summary: v })}
            placeholder="4 年后端经验，专注高并发交易系统。主导过单机 3 万 QPS 的订单服务重构……"
            minRows={3}
          />
        </div>
      </Section>
      </div>

  </>;
}
