import { Outlet, useLocation } from 'react-router-dom';
import { WorkspaceNavigation, type NavigationItem } from './WorkspaceNavigation';
import { TeacherReviewProvider, useTeacherReview } from '@/state/TeacherReview';
import { useText } from '@/i18n/LanguageProvider';

const NAV: NavigationItem[] = [
  { to: '/admin', label: 'Overview', icon: 'gauge' },
  { section: 'Content' },
  { to: '/admin/bank', label: 'Question bank', icon: 'tests' },
  { to: '/admin/import', label: 'Import', icon: 'download' },
  { to: '/admin/builder', label: 'Test builder', icon: 'builder' },
  { section: 'Students' },
  { to: '/admin/grading', label: 'Grading', icon: 'pencil', countLabel: '{count} sample responses awaiting review' },
  { to: '/admin/students', label: 'Students', icon: 'users' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'bars' },
];

export function AdminShell() { return <TeacherReviewProvider><TeacherFrame /></TeacherReviewProvider>; }

function TeacherFrame() {
  const { items } = useTeacherReview();
  const navigation = NAV.map(item => 'to' in item && item.to === '/admin/grading' ? { ...item, count: items.filter(x => !x.grade).length } : item);
  const { pathname } = useLocation();
  const t = useText();
  const active = /^\/admin\/editor(?:\/|$)/.test(pathname) ? '/admin/bank' : pathname;
  return <div className="admin app-admin workspace workspace-teacher">
    <div className="mesh app-mesh calm" aria-hidden="true" />
    <WorkspaceNavigation teacher active={active} items={navigation} identity={<span className="workspace-demo">{t('Sample data')}</span>} />
    <main id="main-content" tabIndex={-1} className="mainc teacher-main"><Outlet /></main>
  </div>;
}
