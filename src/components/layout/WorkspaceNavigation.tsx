import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton, Mark, cx } from '@/components/ui/basic';
import { Overlay } from '@/components/ui/overlay';
import { LanguageSwitcher, useText } from '@/i18n/LanguageProvider';
import { localizedNumber } from '@/i18n/formatting';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useMediaQuery } from '@/lib/hooks';

export type NavigationItem = { section: string } | { to: string; label: string; icon: IconName; count?: number; countLabel?: string };

export function WorkspaceNavigation({ teacher = false, items, active, identity }: { teacher?: boolean; items: NavigationItem[]; active: string; identity?: ReactNode }) {
  const t = useText();
  const { language } = useLanguage();
  const location = useLocation();
  const wide = useMediaQuery(teacher ? '(min-width:1200px)' : '(min-width:900px)');
  const [open, setOpen] = useState(false);
  const restore = useRef(true);
  const previousPath = useRef(location.pathname);
  const name = t(teacher ? 'Teacher navigation' : 'Main navigation');
  const title = t(teacher ? 'Teacher workspace' : 'Learning workspace');
  const currentLabel = items.find(item => 'to' in item && item.to === active);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      restore.current = false;
      setOpen(false);
      previousPath.current = location.pathname;
    }
    if (wide && open) {
      restore.current = false;
      setOpen(false);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1,main')?.focus());
    }
  }, [wide, open, location.pathname]);

  const select = (event: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    restore.current = false;
    setOpen(false);
    if (to === location.pathname) requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1,main')?.focus());
  };
  const links = <nav className="workspace-links" aria-label={name} data-no-translate>
    {items.map((item, i) => 'section' in item ? <p key={`section-${i}`} className="workspace-section">{t(item.section)}</p> : <Link key={item.to} to={item.to} onClick={event => select(event, item.to)} className={cx('workspace-link', active === item.to && 'is-current')} aria-current={active === item.to ? 'page' : undefined} aria-label={item.count && item.countLabel ? `${t(item.label)}. ${t(item.countLabel, { count: item.count })}` : undefined}>
      <Icon name={item.icon} /><span>{t(item.label)}</span>{!!item.count && <span className="workspace-count" aria-hidden="true">{localizedNumber(item.count, language)}</span>}
    </Link>)}
    {teacher && <Link className="workspace-link workspace-student-return" to="/" onClick={event => select(event, '/')}><Icon name="back" /><span>{t('Student app')}</span></Link>}
  </nav>;
  const footer = <footer className="workspace-footer" data-no-translate>{identity}<span className="fn l2">{t('Local preferences')}</span><LanguageSwitcher /></footer>;
  const brand = <div className="workspace-brand"><Mark /><div><strong>Huqıq Mektebi</strong><p className="fn l2">{title}</p></div></div>;
  return <>
    {wide ? <aside className="workspace-sidebar glass" data-no-translate>{brand}{links}{footer}</aside> : <header className="workspace-topbar glass" data-no-translate>
      <button type="button" className="workspace-menu" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'workspace-drawer' : undefined} onClick={() => { restore.current = true; setOpen(true); }}><Icon name="menu" /><span>{t('Navigation')}</span><span className="sr-only">{t('Open navigation')}</span></button>
      <span className="workspace-current">{currentLabel && 'label' in currentLabel ? t(currentLabel.label) : title}</span>
    </header>}
    <Overlay open={open && !wide} onClose={() => setOpen(false)} variant="dialog" labelledBy="workspace-drawer-title" className="workspace-drawer" id="workspace-drawer" restoreFocus={restore.current} initialFocus='[aria-current="page"]'>
      <div className="workspace-drawer-heading"><h2 id="workspace-drawer-title" className="t2">{title}</h2><IconButton icon="close" label={t('Close navigation')} onClick={() => setOpen(false)} /></div>
      {links}{footer}
    </Overlay>
  </>;
}
