import type { Doc, Variant } from './types';
export type VariantLayout = Pick<Doc, 'locale' | 'template' | 'layoutScale' | 'layoutStretch' | 'theme'>;
export function layoutFor(doc: Doc, variant?: Variant | null): VariantLayout {
  const source = variant?.layout ?? doc;
  return { locale: source.locale, template: source.template, layoutScale: source.layoutScale, layoutStretch: source.layoutStretch, theme: { ...source.theme } };
}
export function updateVariantLayout(doc: Doc, id: string, patch: Partial<VariantLayout>): Doc {
  return { ...doc, variants: doc.variants.map(v => v.id === id ? { ...v, layout: { ...layoutFor(doc,v), ...patch } } : v) };
}
