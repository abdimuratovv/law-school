import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthState';
import { useApp, type ThemePref } from '@/state/AppState';
import { useLanguage, useText } from '@/i18n/LanguageProvider';
import { initials } from '@/lib/format';
import { Button } from '@/components/ui/basic';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Overlay } from '@/components/ui/overlay';
import { PersonalProfileForm } from './PersonalProfileForm';
import { ProfileLanguage } from './ProfileLanguage';

const modes: { value: ThemePref; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Auto', icon: 'monitor' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

export function ServerProfile({ embedded = false }: { embedded?: boolean }) {
  const { user, signOut } = useAuth(); const { theme, setTheme } = useApp();
  const { language, setLanguage, languageSaved } = useLanguage(); const t = useText(); const nav = useNavigate();
  const [confirm, setConfirm] = useState(false); const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(false); const [themeError, setThemeError] = useState<ThemePref | null>(null);
  const [dirty, setDirty] = useState(false);
  const changeTheme = (value: ThemePref) => setThemeError(setTheme(value) ? null : value);
  const leave = async () => {
    setLeaving(true); setError(false);
    if (await signOut()) nav('/sign-in'); else { setError(true); setLeaving(false); }
  };
  const content = <div className="profile-system">
    <header className="profile-heading"><h1 className="lt">{t('Profile')}</h1><p>{t('Your personal details and platform preferences.')}</p></header>
    <section className="profile-card profile-identity" aria-label={t('Identity')}>
      <div className="profile-identity-person"><span className="profile-avatar" aria-hidden="true">{initials(user?.name ?? '')}</span><div><h2>{user?.name}</h2><p>{user?.email}</p></div></div>
      <span className="profile-google"><span className="profile-google-mark" aria-hidden="true">G</span>{t('Signed in with Google')}<Icon name="checkCircle" size="s" /></span>
    </section>
    <section className="profile-card profile-details"><PersonalProfileForm onDirtyChange={setDirty} /></section>
    <section className="profile-card profile-preferences" aria-labelledby="profile-preferences-title">
      <h2 id="profile-preferences-title">{t('Language and appearance')}</h2>
      <div className="profile-preference-row"><div className="profile-preference-label"><span className="profile-setting-icon"><Icon name="globe" size="s" /></span><div><h3>{t('Platform language')}</h3><p>{t('Language for menus and buttons.')}</p></div></div><ProfileLanguage /></div>
      {languageSaved === false && <p className="profile-preference-error" role="alert">{t('Language changed in this tab only. Retry saving before closing.')} <Button variant="plain" onClick={() => setLanguage(language)}>{t('Retry saving')}</Button></p>}
      <div className="profile-preference-row"><div className="profile-preference-label"><span className="profile-setting-icon"><Icon name="sun" size="s" /></span><div><h3>{t('Interface theme')}</h3><p>{t('Auto follows your device appearance.')}</p></div></div>
        <fieldset className="profile-theme"><legend className="sr-only">{t('Interface theme')}</legend>{modes.map(mode => <label key={mode.value}>
          <input type="radio" name="profile-theme" value={mode.value} checked={theme === mode.value} onChange={() => changeTheme(mode.value)} /><span><Icon name={mode.icon} size="s" />{t(mode.label)}</span>
        </label>)}</fieldset>
      </div>
      {themeError && <p className="profile-preference-error" role="alert">{t('Could not save this preference. The previous setting is unchanged.')} <Button variant="plain" onClick={() => changeTheme(themeError)}>{t('Retry saving')}</Button></p>}
    </section>
    <footer className="profile-account"><div><h2>{t('Sign out')}</h2><p>{t('Save your test answers before signing out.')}</p></div><Button id="profile-signout" variant="secondary" icon="logout" onClick={() => { setError(false); setConfirm(true); }}>{t('Sign out')}</Button></footer>
    <Overlay open={confirm} onClose={() => { if (!leaving) setConfirm(false); }} variant="dialog" labelledBy="profile-signout-title" alert initialFocus="#profile-stay" className="profile-signout-dialog">
      <h2 id="profile-signout-title">{t('Sign out with active work?')}</h2><p>{t(dirty ? 'Your profile has unsaved changes. Stay signed in to save them.' : 'Signing out clears local drafts. Sync unfinished work before signing out.')}</p>
      {error && <p role="alert">{t('Could not sign out. Check your connection and try again.')}</p>}
      <div className="profile-dialog-actions"><Button id="profile-stay" variant="secondary" disabled={leaving} onClick={() => setConfirm(false)}>{t('Stay signed in')}</Button><Button variant="danger" loading={leaving} onClick={() => { void leave(); }}>{t('Confirm sign out')}</Button></div>
    </Overlay>
  </div>;
  return embedded ? <section className="profile-page" data-no-translate>{content}</section> : <main id="main-content" tabIndex={-1} className="s-main profile-page" data-no-translate>{content}</main>;
}
