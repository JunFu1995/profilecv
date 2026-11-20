import { PersonIcon, BackpackIcon, CodeIcon, CubeIcon, FileTextIcon, ReaderIcon, StarIcon } from '@radix-ui/react-icons';
import { createContext } from 'react';
import { LIBRARY_SECTIONS, type LibrarySection } from '../archiveCategoryOrder';
export { LIBRARY_SECTIONS, type LibrarySection } from '../archiveCategoryOrder';
export const LibrarySectionContext = createContext<{ remove?: (key:LibrarySection)=>void; names?: Record<string,string>; rename?: (key:string,name:string)=>void; active: LibrarySection | null; select: (section: LibrarySection | null) => void } | null>(null);
export function LibrarySectionIcon({ title, size = 20 }: { title: string; size?: number }) {
  const icons = [PersonIcon, BackpackIcon, CodeIcon, CubeIcon, FileTextIcon, ReaderIcon, StarIcon];
  const Icon = icons[LIBRARY_SECTIONS.indexOf(title as typeof LIBRARY_SECTIONS[number])] ?? FileTextIcon;
  return <Icon width={size} height={size} aria-hidden="true" />;
}
