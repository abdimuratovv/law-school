import { useRef,useState } from 'react';
import { Button } from '@/components/ui/basic';
import { useText } from '@/i18n/LanguageProvider';
import { useAuth } from '@/state/AuthState';
import { teachingRequest,tashkentInput,tashkentTimestamp } from '@/lib/teachingApi';

export function ReopenAssignment({id,onReopened}:{id:string;onReopened:()=>void}){
  const t=useText(),{csrfToken}=useAuth();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [opens,setOpens]=useState(()=>tashkentInput()),[closes,setCloses]=useState(()=>tashkentInput(Date.now()+7200000));
  const operation=useRef<{body:string;id:string}>();
  async function reopen(){
    setBusy(true);setMessage('');
    const body={opensAt:tashkentTimestamp(opens),closesAt:tashkentTimestamp(closes),timeZone:'Asia/Tashkent'};
    const serialized=JSON.stringify(body);
    if(operation.current?.body!==serialized)operation.current={body:serialized,id:crypto.randomUUID()};
    try{
      await teachingRequest('/staff/assignments/'+id+'/reopen',csrfToken,{...body,operationId:operation.current.id});
      setOpen(false);setMessage('Test reopened. Students can start a new attempt in the new window.');onReopened();
    }catch{setMessage('Could not reopen. The previous window must be closed and the new deadline must be in the future.');}
    finally{setBusy(false);}
  }
  return <div className="reopen-assignment">
    {!open&&<Button size="sm" variant="secondary" icon="clock" onClick={()=>setOpen(true)}>{t('Reopen test')}</Button>}
    {open&&<form onSubmit={event=>{event.preventDefault();void reopen();}}><fieldset disabled={busy}><legend>{t('Reopen test')}</legend>
      <p>{t('Choose a new window in Asia/Tashkent. Previous attempts and results are kept; students get a new attempt.')}</p>
      <div className="authoring-grid"><label>{t('Available from')}<input type="datetime-local" required value={opens} onChange={e=>setOpens(e.target.value)}/></label><label>{t('Available until')}<input type="datetime-local" required min={opens} value={closes} onChange={e=>setCloses(e.target.value)} onInput={e=>e.currentTarget.setCustomValidity('')}/></label></div>
      <div className="authoring-actions"><Button type="submit" disabled={busy||!opens||!closes||closes<=opens}>{t('Reopen for this window')}</Button><Button variant="plain" disabled={busy} onClick={()=>setOpen(false)}>{t('Cancel')}</Button></div>
    </fieldset></form>}
    {message&&<p role="status">{t(message)}</p>}
  </div>;
}
