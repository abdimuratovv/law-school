import { useEffect,useState } from 'react';
import { Button } from '@/components/ui/basic';
import { useText } from '@/i18n/LanguageProvider';
import { teachingRequest } from '@/lib/teachingApi';
import { LearningStats,ReportFilters } from '@/pages/student/ServerLearning';
import type { LearningSummary } from '../../../shared/contracts/learning';
export default function ServerAnalytics(){
 const t=useText();const [assignments,setAssignments]=useState<{id:string;name:string;groupName:string}[]>([]);const [next,setNext]=useState<string|null>(null);const [selected,setSelected]=useState('');const [query,setQuery]=useState('');const [summary,setSummary]=useState<LearningSummary>();const [error,setError]=useState(false);const [busy,setBusy]=useState(false);const [generation,setGeneration]=useState(0);
 const load=async(after='')=>{setBusy(true);setError(false);try{const d=await teachingRequest<{items:typeof assignments;next:string|null}>('/staff/assignments?after='+encodeURIComponent(after));setAssignments(old=>after?[...old,...d.items]:d.items);setNext(d.next);}catch{setError(true);}finally{setBusy(false);}};
 useEffect(()=>{void load();},[]);
 useEffect(()=>{let live=true;setSummary(undefined);if(selected){setBusy(true);setError(false);void teachingRequest<{summary:LearningSummary}>('/staff/analytics?assignmentId='+encodeURIComponent(selected)+'&'+query).then(d=>{if(live)setSummary(d.summary);}).catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setBusy(false);});}return()=>{live=false;};},[selected,query,generation]);
 return <section className="authoring-page learning-page" data-no-translate><h1>{t('Analytics')}</h1><p>{t('Reports cover the latest 200 completed attempts for the selected assignment.')}</p><label className="field"><span>{t('Assignment')}</span><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t('Choose an assignment')}</option>{assignments.map(a=><option key={a.id} value={a.id}>{a.name} · {a.groupName} · {a.id.slice(0,8)}</option>)}</select></label>{next&&<Button disabled={busy} onClick={()=>{void load(next);}}>{t('Load more')}</Button>}<ReportFilters onChange={setQuery} />{busy&&<p role="status">{t('Loading')}</p>}{error&&<p role="alert">{t('The request could not be completed.')} <Button onClick={()=>{if(selected)setGeneration(g=>g+1);else void load();}}>{t('Try again')}</Button></p>}{!busy&&!assignments.length&&!error&&<p>{t('No assignments yet.')}</p>}{summary&&<LearningStats summary={summary} />}</section>;
}
