import { useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Screen } from '@/components/layout/StudentShell';
import { Brand, Button, Tag } from '@/components/ui/basic';
import { Notice } from '@/components/ui/patterns';
import { useAuth } from '@/state/AuthState';
import { LanguageSwitcher, useText } from '@/i18n/LanguageProvider';
import { safeAppReturn } from '../../../shared/contracts/navigation';

export default function SignIn() {
  const { user, status, googleEnabled, refresh } = useAuth();
  const t = useText(); const location = useLocation(); const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const from = safeAppReturn((location.state as { from?: unknown } | null)?.from);
  if (user) return <Navigate to={user.role === 'student' && from.startsWith('/admin') ? '/' : from} replace />;
  const failure = params.get('auth');
  const unavailable = status === 'error' || status === 'ready' && !googleEnabled;
  return <Screen calm><main id="main-content" tabIndex={-1} className="entry-page" data-no-translate>
    <header className="entry-top"><Brand /><LanguageSwitcher compact /></header>
    <div className="entry-layout">
      <section className="entry-intro"><p className="eyebrow">Huqıq Mektebi</p><h1 className="lt">{t('Welcome to Huqıq Mektebi')}</h1><p className="entry-lead">{t('Learn the format. Build your confidence.')}</p><div className="entry-points"><p>{t('Practice at your own pace')}</p><p>{t('Question material is in Karakalpak.')}</p></div></section>
      <section className="card entry-form"><Tag tone="acc">{t('Google sign-in')}</Tag><h2 className="t2">{t('Sign in to continue')}</h2><p className="callout l2">{t('Use your Google account to sign in or register.')}</p>
        <div className="col">
          {failure === 'cancelled' && <Notice title={t('Sign-in was cancelled. You can try again.')} />}
          {failure === 'failed' && <Notice tone="error" title={t('Sign-in could not be completed. Please try again.')} />}
          {unavailable && <Notice tone="error" title={t('Sign-in is temporarily unavailable.')} />}
          <Button id="google-signin" block disabled={status !== 'ready' || !googleEnabled || busy} onClick={() => {
            setBusy(true); window.location.assign('/api/v1/auth/google/start?returnTo=' + encodeURIComponent(from));
          }}>{t(busy ? 'Opening Google...' : 'Continue with Google')}</Button>
          {unavailable && <Button variant="secondary" onClick={() => { void refresh(); }}>{t('Try again')}</Button>}
        </div>
      </section>
    </div>
    <p className="fn l2 entry-local">{t('Open practice is available to registered users. Teachers assign group tests.')}</p>
  </main></Screen>;
}
