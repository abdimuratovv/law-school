import { useText } from '@/i18n/LanguageProvider';

export function Schedule({opensAt,closesAt}:{opensAt?:number|null;closesAt:number|null}){
  const t=useText();
  const format=(value:number)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value);
  if(closesAt===null)return null;
  return <div className="test-schedule">{opensAt!=null&&<span>{t('Available from')}: <time dateTime={new Date(opensAt).toISOString()}>{format(opensAt)}</time></span>}<span><strong>{t('Deadline')}: </strong><time dateTime={new Date(closesAt).toISOString()}>{format(closesAt)}</time></span><small>{t('Tashkent time (UTC+05:00)')}</small></div>;
}
