import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './basic';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** sheet = bottom sheet (mobile), pop = popover above the exam toolbar, dialog = centered */
  variant: 'sheet' | 'pop' | 'dialog';
  labelledBy: string;
  alert?: boolean;
  /** Selector of the element that should receive focus first. */
  initialFocus?: string;
  scrim?: boolean;
  modal?: boolean;
  dismissOnBackdrop?: boolean;
  className?: string;
  id?: string;
  restoreFocus?: boolean;
  children: ReactNode;
}

/** Opaque native dialog. Modality is explicit and independent of visual placement. */
export function Overlay({ open, onClose, variant, labelledBy, alert, initialFocus, modal = true, scrim = modal, dismissOnBackdrop = !alert, className, id, restoreFocus = true, children }: OverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const prev = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const restoreRef = useRef(restoreFocus);
  restoreRef.current = restoreFocus;

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    prev.current = document.activeElement as HTMLElement | null;
    if (modal) el.showModal(); else el.show();
    const visible = (item: HTMLElement) => !item.matches(':disabled') && !item.closest('[hidden]') && item.getClientRects().length > 0 && getComputedStyle(item).visibility !== 'hidden';
    const requested = initialFocus ? el.querySelector<HTMLElement>(initialFocus) : null;
    const first = requested && visible(requested) ? requested : [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].find(item => visible(item) && item.tabIndex >= 0);
    (first ?? el).focus();
    const oldOverflow = document.body.style.overflow;
    if (modal) document.body.style.overflow = 'hidden';
    return () => {
      el.close();
      if (modal) document.body.style.overflow = oldOverflow;
      if (restoreRef.current && prev.current?.isConnected) prev.current.focus();
    };
  }, [open, initialFocus, modal]);

  if (!open) return null;
  const cls = variant === 'sheet' ? 'ov-sheet slide-up' : variant === 'pop' ? 'ov-pop fade-in' : 'ov-dialog fade-in';
  return createPortal(
      <dialog
        ref={ref}
        className={cx('overlay col', cls, className)}
        id={id}
        tabIndex={-1}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal={modal ? true : undefined}
        aria-labelledby={labelledBy}
        data-scrim={scrim}
        onCancel={event => { event.preventDefault(); event.stopPropagation(); closeRef.current(); }}
        onKeyDown={event => {
          if (!modal && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
          if (!modal || event.key !== 'Tab') return;
          const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(item => item.tabIndex >= 0 && !item.matches(':disabled') && !item.closest('[hidden]') && item.getClientRects().length > 0 && getComputedStyle(item).visibility !== 'hidden');
          const first = items[0];
          const last = items[items.length - 1];
          if (!first) { event.preventDefault(); event.currentTarget.focus(); }
          else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus(); }
        }}
        onClick={event => {
          if (event.target !== event.currentTarget || !modal || !dismissOnBackdrop) return;
          const r = event.currentTarget.getBoundingClientRect();
          if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeRef.current();
        }}
      >
        {variant === 'sheet' && <div className="grab" />}
        {children}
      </dialog>,
    document.body
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="glass toast fade-in" role="status" aria-live="polite">
      {children}
    </div>,
    document.body
  );
}
