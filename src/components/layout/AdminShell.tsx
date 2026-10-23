import { Outlet, useLocation } from 'react-router-dom';
import { WorkspaceNavigation, type NavigationItem } from './WorkspaceNavigation';
import { useAuth } from '@/state/AuthState';

const NAV: NavigationItem[] = [
  { to: '/admin', label: 'Overview', icon: 'gauge' },
  { section: 'Content' },
  { to: '/admin/bank', label: 'Question bank', icon: 'tests' },
  { to: '/admin/import', label: 'Import', icon: 'download' },
  { to: '/admin/builder', label: 'Test builder', icon: 'builder' },
  { section: 'Students' },
  { to: '/admin/grading', label: 'Grading', icon: 'pencil', countLabel: '{count} responses awaiting review' },
  { to: '/admin/students', label: 'Students', icon: 'users' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'bars' },
];

export function AdminShell() { return <TeacherFrame />; }

function TeacherFrame() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const active = /^\/admin\/editor(?:\/|$)/.test(pathname) ? '/admin/bank' : pathname;
  return <div className="admin app-admin workspace workspace-teacher">
    <div className="mesh app-mesh calm" aria-hidden="true" />
    <WorkspaceNavigation teacher active={active} items={NAV} identity={<span className="workspace-demo">{user?.name}</span>} />
    <main id="main-content" tabIndex={-1} className="mainc teacher-main"><Outlet /></main>
  </div>;
}
