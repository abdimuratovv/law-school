import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useLanguage, useText, type Language } from '@/i18n/LanguageProvider';
import { Icon } from '@/components/ui/Icon';

const languages: { value: Language; name: string; code: string }[] = [
  { value: 'uz', name: 'O‘zbekcha', code: 'UZ' },
  { value: 'kaa', name: 'Qaraqalpaqsha', code: 'QQ' },
  { value: 'ru', name: 'Русский', code: 'RU' },
];

export function ProfileLanguage() {
  const { language, setLanguage } = useLanguage(); const t = useText();
  const [open, setOpen] = useState(false); const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]); const id = useId();
  const selected = languages.findIndex(item => item.value === language);
  const current = languages[selected]!;
  useEffect(() => {
    if (!open) return;
    options.current[active]?.focus();
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const show = () => { setActive(selected); setOpen(true); };
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? languages.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + languages.length) % languages.length);
    }
  };
  return <div className="profile-language" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" className="profile-language-trigger" ref={trigger} aria-label={t('Platform language')+': '+current.name} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { if (open) close(); else show(); }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } }}>
      <span className="profile-language-code" aria-hidden="true">{current.code}</span><span>{current.name}</span><Icon name="down" size="xs" />
    </button>
    {open && <div id={id} role="listbox" aria-label={t('Platform language')} className="profile-language-menu" onKeyDown={keyboard}>
      {languages.map((item, index) => <button key={item.value} type="button" role="option" aria-selected={language === item.value} tabIndex={index === active ? 0 : -1}
        ref={element => { options.current[index] = element; }} onFocus={() => setActive(index)} onClick={() => { setLanguage(item.value); close(); }}>
        <span className="profile-language-code" aria-hidden="true">{item.code}</span><span lang={item.value === 'kaa' ? 'kaa' : item.value}>{item.name}</span>{item.value === language && <Icon name="check" size="s" />}
      </button>)}
    </div>}
  </div>;
}
