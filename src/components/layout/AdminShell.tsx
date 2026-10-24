import { Outlet, useLocation } from 'react-router-dom';
import { WorkspaceNavigation, type NavigationItem } from './WorkspaceNavigation';
import { useAuth } from '@/state/AuthState';
import { initials } from '@/lib/format';
import { useText } from '@/i18n/LanguageProvider';

const NAV: NavigationItem[] = [
  { to:'/admin',label:'Test collections',icon:'tests' },
  { to:'/admin/bank',label:'Question bank',icon:'builder' },
  { to:'/admin/results',label:'Results',icon:'bars' },
  { to:'/admin/students',label:'Users',icon:'users' },
];

export function AdminShell() { return <TeacherFrame />; }

function TeacherFrame() {
  const { user } = useAuth();
  const t = useText();
  const { pathname } = useLocation();
  const active = /^\/admin\/editor(?:\/|$)/.test(pathname) ? '/admin/bank' : ['/admin/builder','/admin/import'].includes(pathname)?'/admin':pathname;
  return <div className="admin app-admin workspace workspace-teacher">
    <div className="mesh app-mesh calm" aria-hidden="true" />
    <WorkspaceNavigation teacher active={active} items={NAV.filter(item=>!('to' in item)||item.to!=='/admin/students'||user?.role==='admin')} identity={<div className="workspace-identity"><span className="avatar" aria-hidden="true">{user?.name ? initials(user.name) : 'T'}</span><strong>{user?.name || t('Teacher')}</strong></div>} />
    <main id="main-content" tabIndex={-1} className="mainc teacher-main"><Outlet /></main>
  </div>;
}
