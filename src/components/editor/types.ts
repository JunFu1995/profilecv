import type { Master } from '../../types';
import type { LibrarySection } from '../LibraryNav';
import type { EditorActions } from './useEditorActions';

export interface EditorSectionProps {
  master: Master;
  actions: EditorActions;
  onSupplement?: (category: string) => void;
  expandNewExperience: (id: string, group: string) => void;
  activeSection?: LibrarySection | null;
  isVariant: boolean;
}
