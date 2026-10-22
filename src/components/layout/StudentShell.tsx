import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { IconName } from '@/components/ui/Icon';
import { cx } from '@/components/ui/basic';
import { WorkspaceNavigation } from './WorkspaceNavigation';
import { initials } from '@/lib/format';
import { useApp } from '@/state/AppState';
import { useText } from '@/i18n/LanguageProvider';

const NAV: { to: string; label: string; icon: IconName; tab: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', tab: true },
  { to: '/tests', label: 'Tests', icon: 'tests', tab: true },
  { to: '/progress', label: 'Progress', icon: 'progress', tab: true },
  { to: '/mistakes', label: 'My mistakes', icon: 'bookmark', tab: true },
  { to: '/profile', label: 'Profile', icon: 'profile', tab: true }
];

/** Mesh background + content layer. Every screen sits on this. */
export function Screen({ calm, children, className }: { calm?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cx('app-root', className)}>
      <div className={cx('mesh app-mesh', calm && 'calm')} />
      {children}
    </div>
  );
}

/** Persistent learning navigation; focused assessment routes live outside this shell. */
export function StudentShell() {
  const { user, mistakes } = useApp();
  const t = useText();
  const { pathname } = useLocation();
  const active = pathname === '/getting-started' ? '/' : pathname.startsWith('/results/') ? '/progress' : pathname;
  return <Screen calm className="workspace workspace-student">
    <WorkspaceNavigation active={active} items={NAV.map(item => ({ ...item, count: item.to === '/mistakes' ? mistakes.length : undefined, countLabel: '{count} saved practice questions' }))} identity={user && <div className="workspace-identity"><span className="avatar" aria-hidden="true">{user.name ? initials(user.name) : 'T'}</span><div><strong>{user.name || t('Student')}</strong>{user.group && <p className="fn l2">{t('Group')} {user.group}</p>}</div></div>} />
    <div className="learning-content"><Outlet /></div>
  </Screen>;
}
