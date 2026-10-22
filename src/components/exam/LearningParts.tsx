import { Button } from '@/components/ui/basic';
import { useText } from '@/i18n/LanguageProvider';
import type { Question } from '@/data/types';

export function LearningUnavailable({ summary = false, to = '/progress' }: { summary?: boolean; to?: string }) {
  const t = useText();
  return <main id="main-content" tabIndex={-1} className="s-main learning-page" data-no-translate><h1 className="lt">{t(summary ? 'Sample result summary' : 'Unavailable content')}</h1><p className="body l2">{t(summary ? 'This sample history has no saved answers to review.' : 'This saved item or its question content is unavailable. Your stored records have not been changed.')}</p><Button to={to}>{t(to.startsWith('/results/') ? 'Back to results' : 'Back to progress')}</Button></main>;
}

export function Explanation({ q }: { q: Question }) {
  const t = useText();
  return <section className="learning-explanation"><h2 className="hl">{t('Explanation')}</h2>{q.kind === 'single' && q.explanation?.length ? <ol className="ql body" lang="kaa">{q.explanation.map((line, i) => <li key={i}>{line.k && <span className="k">{line.k}</span>}<span>{line.t}</span></li>)}</ol> : <p className="body l2">{t('No explanation is available for this sample question.')}</p>}{q.legal && <p><a className="btn btn-secondary" href={q.legal.url} target="_blank" rel="noreferrer" aria-label={t('Reference: {label} (opens in a new tab)', { label: q.legal.label })}>{t('Reference')} · <span lang="kaa">{q.legal.label}</span><span className="sr-only">{t('Opens in a new tab')}</span></a></p>}</section>;
}
