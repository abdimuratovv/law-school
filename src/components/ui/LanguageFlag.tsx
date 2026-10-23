import { useLanguage, useText, type Language } from '@/i18n/LanguageProvider';

const languages: Language[] = ['uz', 'kaa', 'ru'];
const names: Record<Language, string> = { uz: 'O‘zbekcha', kaa: 'Qaraqalpaqsha', ru: 'Русский' };
const star = 'M0-2.5 .6-.8 2.4-.8 1 .3 1.5 2.2 0 1.1-1.5 2.2-1 .3-2.4-.8-.6-.8Z';

function Flag({ language }: { language: Language }) {
  if (language === 'ru') return <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><path fill="#fff" d="M0 0h60v14H0z" /><path fill="#1750aa" d="M0 14h60v13H0z" /><path fill="#d52b36" d="M0 27h60v13H0z" /></svg>;
  const blue = language === 'kaa' ? '#0098cf' : '#1aafd0';
  return <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <path fill={blue} d="M0 0h60v40H0z" />
    <path fill="#fff" d="M0 13h60v15H0z" />
    <path fill={language === 'kaa' ? '#f4d44e' : '#fff'} d="M0 15h60v10H0z" />
    <path fill="#cf3040" d="M0 14h60v1H0zM0 25h60v1H0z" />
    <path fill="#239b53" d="M0 27h60v13H0z" />
    <circle cx="17" cy="7" r="4.5" fill="#fff" /><circle cx="18.5" cy="6.2" r="4" fill={blue} />
    {(language === 'kaa' ? [[24,4],[29,4],[34,4],[26.5,9],[31.5,9]] : [[29,3],[34,3],[39,3],[24,7],[29,7],[34,7],[39,7],[19,11],[24,11],[29,11],[34,11],[39,11]]).map(([x,y], i) => <path key={i} d={star} transform={`translate(${x} ${y}) scale(.55)`} fill="#fff" />)}
  </svg>;
}

export function LanguageFlag() {
  const { language, setLanguage } = useLanguage();
  const t = useText();
  const next = languages[(languages.indexOf(language) + 1) % languages.length]!;
  const label = `${t('Language')}: ${names[language]} → ${names[next]}`;
  return <button type="button" className="language-flag" aria-label={label} title={label} data-language={language} onClick={() => setLanguage(next)}><Flag language={language} /></button>;
}
