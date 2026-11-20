import { segment } from 'pinyin-pro';
import type { TranslationEntry } from './types';

/** Default for an ordinary Han Chinese full name; other naming systems stay in proofreading. */
export function defaultEnglishName(name: string): string | undefined {
  const source = name.trim();
  if (!/^\p{Script=Han}{2,6}$/u.test(source)) return undefined;
  const [surname, ...given] = segment(source, { surname: 'head', toneType: 'none' });
  if (!surname || !given.length) return undefined;
  const family = surname.result.replace(/\s/g, '');
  const personal = given.map(part => part.result).join('').replace(/\s/g, '');
  if (![family, personal].every(part => /^[a-zü]+$/i.test(part))) return undefined;
  const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);
  return `${capitalize(personal)} ${capitalize(family)}`;
}

/** Manual spellings take priority; old automatic caches must not override the current order. */
export function resolveNameTranslation(name: string, cached?: TranslationEntry): TranslationEntry | undefined {
  const src = name.trim();
  const matching = cached?.src === src ? cached : undefined;
  if (matching?.manual && matching.en.trim()) return matching;
  const en = defaultEnglishName(src);
  return en ? { src, en } : matching;
}
