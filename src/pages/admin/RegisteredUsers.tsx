import { useEffect,useState } from 'react';
import { useText,useFormatting } from '@/i18n/LanguageProvider';
import { teachingRequest } from '@/lib/teachingApi';
import { Button } from '@/components/ui/basic';

type User={id:string;name:string;email:string;role:string;createdAt:number;completed:number};
export default function RegisteredUsers(){
 const t=useText(),format=useFormatting();const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[items,setItems]=useState<User[]>([]),[next,setNext]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const timer=setTimeout(()=>setQuery(search),300);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{let active=true;setLoading(true);setError(false);void teachingRequest<{items:User[];next:string|null}>('/staff/users?search='+encodeURIComponent(query)).then(data=>{if(active){setItems(data.items);setNext(data.next);}}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[query,retry]);
 async function more(){setLoading(true);try{const data=await teachingRequest<{items:User[];next:string|null}>('/staff/users?after='+encodeURIComponent(next??'')+'&search='+encodeURIComponent(query));setItems(old=>[...old,...data.items]);setNext(data.next);}catch{setError(true);}finally{setLoading(false);}}
 return <section className="authoring-page" data-no-translate><header><div><h1>{t('Users')}</h1><p>{t('Registered users appear here automatically. No enrollment is required.')}</p></div></header><label>{t('Search by name or email')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>{loading&&<p role="status">{t('Loading')}</p>}{error&&<div role="alert"><p>{t('Could not load staff data.')}</p><Button onClick={()=>setRetry(v=>v+1)}>{t('Try again')}</Button></div>}
  <div className="authoring-table"><table><thead><tr><th>{t('Name')}</th><th>{t('Email')}</th><th>{t('Role')}</th><th>{t('Registered at')}</th><th>{t('Completed')}</th></tr></thead><tbody>{items.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{t(u.role==='admin'?'Admin':u.role==='teacher'?'Teacher':'Student')}</td><td>{format.date(u.createdAt,true)}</td><td>{u.completed}</td></tr>)}</tbody></table></div>{!loading&&!error&&!items.length&&<p>{t('No users found.')}</p>}{next&&<Button variant="secondary" disabled={loading} onClick={()=>{void more();}}>{t('Load more')}</Button>}
 </section>;
}
