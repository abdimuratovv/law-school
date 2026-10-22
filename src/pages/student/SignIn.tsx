import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/StudentShell';
import { Brand, Button, Tag } from '@/components/ui/basic';
import { OtpInput, PhoneInput } from '@/components/ui/form';
import { Notice } from '@/components/ui/patterns';
import { formatPhone } from '@/lib/format';
import { useApp } from '@/state/AppState';
import { LanguageSwitcher, useText } from '@/i18n/LanguageProvider';
import { safeStudentReturn } from '@/lib/navigation';

export default function SignIn() {
  const { signIn } = useApp();
  const t = useText();
  const nav = useNavigate();
  const from = safeStudentReturn((useLocation().state as { from?: unknown } | null)?.from);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [code, setCode] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step === 'phone') {
      if (phone.length !== 9) { setError('Enter all 9 digits'); document.getElementById('phone')?.focus(); return; }
      setError(''); setCode(''); setStep('otp');
    } else {
      if (code.length !== 6) { setError('Enter all six digits to continue.'); document.querySelector<HTMLInputElement>('.otp input')?.focus(); return; }
      if (!signIn(phone)) { setSaveError(true); return; }
      nav(from, { replace: true });
    }
  };
  const changeNumber = () => { setError(''); setSaveError(false); setStep('phone'); requestAnimationFrame(() => document.getElementById('phone')?.focus()); };
  return <Screen calm><main id="main-content" tabIndex={-1} className="entry-page" data-no-translate>
    <header className="entry-top"><Brand /><LanguageSwitcher compact /></header>
    <div className="entry-layout">
      <section className="entry-intro"><p className="eyebrow">Huqıq Mektebi</p><h1 className="lt">{t('Welcome to Huqıq Mektebi')}</h1><p className="entry-lead">{t('Learn the format. Build your confidence.')}</p><div className="entry-points"><p>{t('Practice at your own pace')}</p><p>{t('Learn the controls in three simple steps. No timer and no score.')}</p><p>{t('Question material is in Karakalpak.')}</p></div></section>
      <section className="card entry-form"><Tag tone="acc">{t('Local preview')}</Tag><h2 className="t2">{t(step === 'phone' ? 'Explore the interface' : 'Enter the code')}</h2><p className="callout l2">{t('No SMS is sent. Any six digits open this local preview.')}</p>
        <form className="col" onSubmit={submit} noValidate>
          {step === 'phone' ? <><PhoneInput id="phone" describedBy="phone-guide" value={phone} onChange={v => { setPhone(v); setError(''); }} error={error} /><p className="fn l2" id="phone-guide">{t('Enter nine digits after +998. Example: 90 123 45 67.')}</p></> : <>
            <div className="entry-number"><span className="fn num">+998 {formatPhone(phone)}</span><Button variant="plain" onClick={changeNumber}>{t('Change number')}</Button></div>
            <fieldset className="entry-code"><legend className="flab">{t('6-digit code')}</legend><p className="fn l2" id="code-guide">{t('Enter six digits, then choose Continue. You can paste the whole code.')}</p><OtpInput value={code} onChange={v => { setCode(v); setError(''); }} describedBy="code-guide" errorId={error ? 'code-error' : undefined} />{error && <p id="code-error" className="fn badc" role="alert">{t(error)}</p>}</fieldset>
          </>}
          {saveError && <Notice tone="error" title={t('Sign-in could not be saved. Allow browser storage, then try again.')} />}
          <Button type="submit" block>{t('Continue')}</Button>
          {step === 'otp' && <Button variant="plain" onClick={() => { setCode('000000'); setError(''); }}>{t('Use sample code')}</Button>}
        </form>
      </section>
    </div>
    <p className="fn l2 entry-local">{t('Saving is local to this browser. Keep its data to return to your answers; there is no online account sync.')}</p>
  </main></Screen>;
}
