import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { GRADING, type Grade, type GradeItem } from '@/data/admin';

type Snapshot = { items: GradeItem[]; comments: Record<string, string> };
type ReviewState = Snapshot & { undo: (Snapshot & { id: string }) | null };
type ReviewContext = ReviewState & { apply: (id: string, grade: Grade, comment: string) => boolean; undoLast: () => string | null };
const Context = createContext<ReviewContext | null>(null);

/** Ephemeral teacher fixtures. Deliberately independent of student results and all storage. */
export function TeacherReviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReviewState>(() => ({ items: GRADING.map(x => ({ ...x })), comments: {}, undo: null }));
  const current = useRef(state);
  const commit = (next: ReviewState) => { current.current = next; setState(next); };
  const apply = (id: string, grade: Grade, comment: string) => {
    const prev = current.current; const item = prev.items.find(x => x.id === id);
    if (!item || (item.grade === grade && (prev.comments[id] ?? '') === comment)) return false;
    commit({ items: prev.items.map(x => x.id === id ? { ...x, grade } : x), comments: { ...prev.comments, [id]: comment }, undo: { items: prev.items, comments: prev.comments, id } });
    return true;
  };
  const undoLast = () => {
    const previous = current.current.undo; if (!previous) return null;
    commit({ items: previous.items, comments: previous.comments, undo: null }); return previous.id;
  };
  return <Context.Provider value={{ ...state, apply, undoLast }}>{children}</Context.Provider>;
}
export function useTeacherReview() {
  const value = useContext(Context);
  if (!value) throw new Error('Teacher review requires its provider');
  return value;
}
