import { useEffect, useRef, useState, type FormEvent } from 'react';
import { personalProfileSchema, type PersonalProfile } from '../../../shared/contracts/auth';
import { useAuth } from '@/state/AuthState';
import { useText } from '@/i18n/LanguageProvider';
import { Button } from '@/components/ui/basic';
import { TextField } from '@/components/ui/patterns';
import { Icon } from '@/components/ui/Icon';

export function PersonalProfileForm({ onboarding = false, onDirtyChange }: { onboarding?: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const { user, saveProfile } = useAuth();
  const t = useText();
  const [value, setValue] = useState<PersonalProfile>(() => user?.profile ?? { firstName: '', lastName: '', patronymic: '', birthDate: '' });
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(() => JSON.stringify(value));
  const dirty = JSON.stringify(value) !== saved;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty || onboarding) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, onboarding]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (onboarding) heading.current?.focus(); }, [step, onboarding]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !onboarding && !dirty) return;
    setMessage('');
    if (onboarding && step === 1) {
      const names = personalProfileSchema.omit({ birthDate: true }).safeParse({ firstName: value.firstName, lastName: value.lastName, patronymic: value.patronymic });
      if (!names.success) { setMessage('Please complete all fields correctly.'); return; }
      setStep(2); return;
    }
    const parsed = personalProfileSchema.safeParse(value);
    if (!parsed.success) { setMessage('Please complete all fields correctly.'); return; }
    setBusy(true);
    try { await saveProfile(parsed.data); setValue(parsed.data); setSaved(JSON.stringify(parsed.data)); setMessage('Profile saved.'); }
    catch (error) { setMessage(error instanceof Error && error.message === 'Profile changed. Try saving again.' ? error.message : 'Could not save your profile. Check the fields and try again.'); }
    finally { setBusy(false); }
  };
  return <form className={'personal-profile-form'+(onboarding ? '' : ' profile-edit-form')} onSubmit={event => { void submit(event); }} aria-labelledby="personal-profile-title">
    {onboarding && <p className="eyebrow">{t('Step {step} of 2', { step })}</p>}
    <div className="profile-form-heading"><h2 id="personal-profile-title" className="t2" ref={heading} tabIndex={-1}>{t(onboarding ? step === 1 ? 'Tell us your name' : 'When were you born?' : 'Personal information')}</h2>{!onboarding && <p>{t('Update your account details here.')}</p>}</div>
    <fieldset disabled={busy} className="personal-profile-fields">
      {(!onboarding || step === 1) && <>{(['firstName', 'lastName', 'patronymic'] as const).map((key, index) => <TextField key={key}
        label={t(['First name', 'Last name', 'Patronymic'][index]!)} name={key} autoComplete={['given-name', 'family-name', 'additional-name'][index]} required maxLength={100} value={value[key]} onChange={event => { setValue(previous => ({ ...previous, [key]: event.target.value })); setMessage(''); }} />)}</>}
      {(!onboarding || step === 2) && <TextField label={t('Date of birth')}
        name="birthDate" type="date" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required value={value.birthDate} onChange={event => { setValue(previous => ({ ...previous, birthDate: event.target.value })); setMessage(''); }} />}
    </fieldset>
    {message && (onboarding || message !== 'Profile saved.') && <p role={message === 'Profile saved.' ? 'status' : 'alert'}>{t(message)}</p>}
    <div className={onboarding ? 'learning-actions' : 'profile-form-footer'}>
      {!onboarding && <p className="profile-save-status" role="status"><Icon name={dirty ? 'pencil' : 'check'} size="xs" /><span>{t(dirty ? 'Unsaved changes' : message === 'Profile saved.' ? 'Profile saved.' : 'All changes saved')}</span></p>}
      {onboarding && step === 2 && <Button variant="secondary" disabled={busy} onClick={() => { setMessage(''); setStep(1); }}>{t('Previous')}</Button>}
      <Button type="submit" loading={busy} disabled={!onboarding && !dirty}>{t(onboarding ? step === 1 ? 'Next' : 'Save & continue' : 'Save changes')}</Button>
    </div>
  </form>;
}

export function ProfileOnboarding() {
  const { user, signOut } = useAuth();
  const t = useText(); const [error, setError] = useState(false); const [leaving, setLeaving] = useState(false);
  return <main id="main-content" className="profile-onboarding" data-no-translate>
    <section className="card learning-card">
      <h1 className="lt">{t('Complete your profile')}</h1>
      <p>{t('Complete this form once. You can edit these details later in your profile.')}</p>
      <p className="fn l2">{user?.email}</p>
      <PersonalProfileForm onboarding />
      <Button variant="plain" disabled={leaving} onClick={() => { setLeaving(true); void signOut().then(ok => { setError(!ok); setLeaving(false); }); }}>{t('Sign out')}</Button>
      {error && <p role="alert">{t('Could not sign out. Check your connection and try again.')}</p>}
    </section>
  </main>;
}
