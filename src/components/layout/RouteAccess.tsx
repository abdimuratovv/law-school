import { Component, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { useText } from '@/i18n/LanguageProvider';
import { Button } from '@/components/ui/basic';
import { LoadingState } from '@/components/ui/patterns';

export function SkipNavigation() {
  const t = useText();
  return <a className="skip-navigation" href="#main-content" data-no-translate onClick={event => {
    const main = [...document.querySelectorAll<HTMLElement>('main')].find(element => element.getClientRects().length > 0);
    if (main) { event.preventDefault(); main.focus(); }
  }}>{t('Skip to main content')}</a>;
}

const LABELS: [RegExp, string][] = [
  [/^\/admin\/bank$/, 'Question bank'], [/^\/admin\/editor/, 'Question bank'],
  [/^\/admin\/import$/, 'Import'], [/^\/admin\/builder$/, 'Test builder'],
  [/^\/admin\/grading$/, 'Grading'], [/^\/admin\/students$/, 'Students'],
  [/^\/admin\/analytics$/, 'Analytics'], [/^\/admin$/, 'Overview'],
  [/^\/results\/[^/]+\/q\//, 'Review workspace'], [/^\/results\//, 'Results'],
  [/^\/exam\//, 'Exam workspace'], [/^\/tests/, 'Tests'],
  [/^\/progress$/, 'Progress'], [/^\/mistakes$/, 'My mistakes'], [/^\/profile$/, 'Profile'],
  [/^\/getting-started$/, 'Try a sample'], [/^\/sign-in$/, 'Welcome'], [/^\/design$/, 'Design reference'], [/^\/$/, 'Home'],
];

/** Query/filter and language changes do not steal focus from the current task. */
export function RouteAccess() {
  const { pathname } = useLocation();
  const action = useNavigationType();
  const t = useText();
  const title = t(LABELS.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Page not found');
  useEffect(() => { document.title = `${title} · Huqıq Mektebi`; }, [title]);
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    let interacted = false;
    const keepUserFocus = () => { interacted = true; cancelAnimationFrame(frame); };
    document.addEventListener('keydown', keepUserFocus, true);
    document.addEventListener('pointerdown', keepUserFocus, true);
    const focus = () => {
      if (interacted) return;
      const main = document.getElementById('main-content');
      const target = main?.querySelector<HTMLElement>('h1:not(.sr-only)') ?? main;
      if (document.querySelector('dialog[open][aria-modal="true"]') || !target?.getClientRects().length) {
        if (tries++ < 30) frame = requestAnimationFrame(focus);
        return;
      }
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      if (action !== 'POP') { window.scrollTo(0, 0); main?.scrollTo(0, 0); }
    };
    frame = requestAnimationFrame(focus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keepUserFocus, true);
      document.removeEventListener('pointerdown', keepUserFocus, true);
    };
    // Focus is scoped to path transitions, not query/filter or language updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

export function RouteLoading() {
  const { pathname } = useLocation();
  const t = useText();
  const label = t(pathname === '/design' ? 'Loading design reference' : 'Loading workspace');
  return <main id="route-loading" tabIndex={-1} className="route-state" aria-busy="true" data-no-translate><h1 className="t1">{label}</h1><LoadingState label={label} /><Link className="link" to="/">{t('Back home')}</Link></main>;
}

export function RouteUnavailable({ teacher = false, embedded = false }: { teacher?: boolean; embedded?: boolean }) {
  const t = useText();
  const content = <div className="route-state" data-no-translate><h1 className="t1">{t('Page not found')}</h1><p className="body l2">{t('Choose a destination from the navigation or use the return link.')}</p><Button to={teacher ? '/admin' : '/'}>{t(teacher ? 'Back to overview' : 'Back home')}</Button></div>;
  return embedded ? content : <main id="main-content" tabIndex={-1}>{content}</main>;
}

function RouteError() {
  const t = useText();
  const { pathname } = useLocation();
  useEffect(() => { document.querySelector<HTMLElement>('.route-error h1')?.focus(); }, []);
  return <main id="main-content" tabIndex={-1} className="route-state route-error" data-no-translate><h1 tabIndex={-1} className="t1">{t('Workspace unavailable')}</h1><p className="body l2">{t('Reload this page or return to a working destination.')}</p><Button onClick={() => window.location.reload()}>{t('Reload page')}</Button><Link className="link" to={pathname.startsWith('/admin/') ? '/admin' : '/'}>{t(pathname.startsWith('/admin/') ? 'Back to overview' : 'Back home')}</Link></main>;
}

export class RouteErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() { return this.state.failed ? <RouteError /> : this.props.children; }
}
