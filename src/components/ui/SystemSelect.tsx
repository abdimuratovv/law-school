import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, type IconName } from './Icon';

/** System-style single select with native button focus and keyboard navigation. */
export function SystemSelect({ label, value, options, onChange, icon }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; icon: IconName;
}) {
  const id = useId(); const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false); const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ above: false, height: 320 });
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  const search = useRef({ text: '', time: 0 });
  useEffect(() => { if (open) refs.current[active]?.focus({ preventScroll: true }); }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  const show = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const upward = below < 200 && above > below;
      setPlacement({ above: upward, height: Math.max(88, Math.min(320, upward ? above : below)) });
    }
    search.current = { text: '', time: 0 }; setActive(selected); setOpen(true);
  };
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); const now = Date.now();
      search.current = { text: (now - search.current.time < 700 ? search.current.text : '') + event.key.toLocaleLowerCase(), time: now };
      const index = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(search.current.text));
      if (index >= 0) setActive(index);
    }
  };
  // Keep the active option visible without scrolling the surrounding report page.
  useEffect(() => {
    if (!open) return;
    const item = refs.current[active]; const menu = item?.parentElement;
    if (!item || !menu) return;
    if (item.offsetTop < menu.scrollTop) menu.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = item.offsetTop + item.offsetHeight - menu.clientHeight;
  }, [open, active]);
  return <div className="system-field system-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label id={id+'-label'} htmlFor={id+'-trigger'}>{label}</label>
    <button id={id+'-trigger'} ref={trigger} type="button" className="system-select-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id+'-list' : undefined} aria-labelledby={id+'-label '+id+'-value'}
      onClick={() => { if (open) close(); else show(); }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } }}>
      <Icon name={icon} size="s" /><span id={id+'-value'}>{options[selected]?.label}</span><Icon name="down" size="xs" />
    </button>
    {open && <div className={'system-select-menu'+(placement.above ? ' is-above' : '')} style={{ maxHeight: placement.height }} id={id+'-list'} role="listbox" aria-labelledby={id+'-label'} onKeyDown={keyboard}>
      {options.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} tabIndex={index === active ? 0 : -1}
        ref={element => { refs.current[index] = element; }} onFocus={() => setActive(index)} onClick={() => { onChange(option.value); close(); }}>
        <span>{option.label}</span>{option.value === value && <Icon name="check" size="s" />}
      </button>)}
    </div>}
  </div>;
}
