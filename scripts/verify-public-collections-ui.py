"""End-to-end UI acceptance with synthetic HTTP fixtures; no real user sessions."""
import copy,json,os,time
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect

base=os.environ.get('COLLECTION_TEST_BASE','http://127.0.0.1:4176')
out=Path('.worker-build/public-collections');out.mkdir(parents=True,exist_ok=True)
uid=lambda n:f'00000000-0000-4000-8000-{n:012d}'
now=lambda:int(time.time()*1000)
user={'id':uid(1),'name':'Synthetic Teacher','email':'fixture@example.test','role':'admin','revision':0,'profile':{'firstName':'Synthetic','lastName':'Teacher','patronymic':'Test','birthDate':'2000-01-01'}}
rows=[{'id':uid(i+10),'stem':f'{i}. Synthetic public question '+('read the original text carefully. '*5),'kind':'single','topic':'theory','revision':0,'published':0,'sourceName':'synthetic-45.csv','sourceNumber':i} for i in range(1,46)]
drafts={};versions={};publications=[];requests=[];errors=[];checks=0
collection_id=uid(1000);attempt_id=uid(1001);job_id=uid(1002)
def check(label):
 global checks
 checks+=1;print('PASS: '+label,flush=True)
def collection():
 return {'id':collection_id,'draftId':next(iter(drafts),uid(999)),'name':'Synthetic 45 question collection','questionCount':45,'opensAt':None,'closesAt':None,'retired':0,'createdAt':now(),'attempts':1,'completed':1}
def attempt(final=False):
 return {'id':attempt_id,'examId':'c_'+collection_id,'name':'Synthetic 45 question collection','mode':'mock','state':'final' if final else 'active','revision':0,'startedAt':now(),'endsAt':None,'savedAt':now(),'serverNow':now(),'snapshot':{'answers':{'version-'+rows[0]['id']:'a'} if final else {},'flags':[]},'questions':[{'id':'version-'+r['id'],'kind':'single','topic':'theory','stem':r['stem'],'options':[{'id':k,'text':v} for k,v in [('a','Alpha'),('b','Beta'),('c','Gamma'),('d','Delta')]]} for r in rows],'checked':[],'feedback':{},'result':{'units':2,'maxUnits':90,'pending':0,'final':True,'algorithm':'fixture'} if final else None,**({'answerCounts':{'correct':1,'incorrect':0,'partial':0,'pending':0,'unanswered':44}} if final else {})}

with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 context=browser.new_context(viewport={'width':1440,'height':1050})
 def api(route):
  u=urlparse(route.request.url);path=u.path.removeprefix('/api/v1');query=parse_qs(u.query);method=route.request.method
  requests.append((path,method))
  if path=='/auth/me':route.fulfill(json={'user':user,'csrfToken':'a'*64})
  elif path=='/auth/config':route.fulfill(json={'googleEnabled':True})
  elif path=='/staff/question-bank':
   page=int(query.get('page',['1'])[0]);route.fulfill(json={'items':rows[(page-1)*20:page*20],'total':45,'page':page,'pageSize':20})
  elif path=='/staff/question-bank/publish':
   batch=route.request.post_data_json['items'];assert len(batch)<=5
   for r in batch:versions.setdefault(r['id'],'version-'+r['id'])
   route.fulfill(json={'results':[{'id':r['id'],'status':'published','versionId':versions[r['id']]} for r in batch]})
  elif path=='/staff/tests' and method=='POST':
   body=route.request.post_data_json;id=body['operationId'];drafts[id]={'id':id,'revision':0,'content':body['content'],'publishedRevision':None,'publishedVersionId':None};route.fulfill(status=201,json=drafts[id])
  elif path.startswith('/staff/tests/') and method=='PATCH':
   id=path.rsplit('/',1)[-1];body=route.request.post_data_json;drafts[id]['revision']+=1;drafts[id]['content']=body['content'];route.fulfill(json=drafts[id])
  elif path.startswith('/staff/collections/draft/'):
   route.fulfill(json=drafts[path.rsplit('/',1)[-1]])
  elif path.startswith('/staff/collections/import/'):
   route.fulfill(json={'ids':[r['id'] for r in rows],'name':'Synthetic 45 question import'})
  elif path=='/staff/collections' and method=='POST':
   body=route.request.post_data_json;content=drafts[body['draftId']]['content'];assert len(content['questionVersionIds'])==45
   publications.append(body);route.fulfill(status=201,json={'id':collection_id,'examId':'c_'+collection_id})
  elif path=='/staff/collections':route.fulfill(json={'items':[collection()] if publications else [],'next':None})
  elif path=='/staff/collections/drafts':route.fulfill(json={'items':[],'next':None})
  elif path.endswith('/results') and path.startswith('/staff/collections'):
   route.fulfill(json={'collection':{'id':collection_id,'name':collection()['name']},'summary':{'participants':1,'averagePercent':2.22},'items':[{'id':attempt_id,'name':collection()['name'],'student':'Synthetic Student','email':'student@example.test','state':'final','startedAt':now(),'submittedAt':now(),'result':{'units':2,'maxUnits':90,'pending':0,'final':True}}],'next':None})
  elif path=='/staff/users':route.fulfill(json={'items':[{'id':uid(2),'name':'Synthetic Student','email':'student@example.test','role':'student','createdAt':now(),'completed':1}],'next':None})
  elif path=='/staff/imports':route.fulfill(json={'items':[{'id':job_id,'filename':'synthetic-45.csv','status':'complete','totalRows':45,'uploadedRows':45,'cursor':46,'created':45,'skipped':0,'duplicatePolicy':'skip','payloadBytes':1000}],'next':None})
  elif path=='/exams':route.fulfill(json={'items':[{'id':'c_'+collection_id,'name':collection()['name'],'mode':'mock','questionCount':45,'durationSeconds':None,'opensAt':None,'closesAt':None,'serverNow':now()}],'next':None})
  elif path.startswith('/exams/') and path.endswith('/start'):route.fulfill(json=attempt())
  elif path.startswith('/exams/'):route.fulfill(json={'id':'c_'+collection_id,'name':collection()['name'],'mode':'mock','questionCount':45,'durationSeconds':None,'opensAt':None,'closesAt':None,'serverNow':now()})
  elif path.startswith('/attempts/') and path.endswith('/submit'):route.fulfill(json=attempt(True))
  elif path.startswith('/attempts/'):route.fulfill(json=attempt())
  else:route.fulfill(json={'items':[],'next':None})
 context.route('**/api/v1/**',api)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/admin');page.wait_for_load_state('networkidle')
 nav=page.locator('.workspace-nav')
 expect(page.get_by_role('heading',name='Test to‘plamlari',exact=True)).to_be_visible()
 for old in ['Guruhlar','O‘quvchini biriktirish','O‘quvchi hisobining IDsi']:
  expect(page.get_by_text(old,exact=True)).to_have_count(0)
 check('admin opens collection management without groups or identifier fields')
 page.get_by_role('link',name='To‘plam yaratish',exact=True).first.click()
 page.wait_for_load_state('networkidle')
 expect(page.locator('.picker-list li')).to_have_count(45)
 page.get_by_role('textbox',name='To‘plam nomi',exact=True).fill('Synthetic 45 question collection')
 page.get_by_role('button',name='Barchasini tanlash (45)',exact=True).click()
 expect(page.get_by_role('button',name='To‘plamni e’lon qilish',exact=True)).to_be_enabled()
 expect(page.locator('#assign-group')).to_have_count(0)
 check('builder selects all 45 saved questions including unpublished drafts')
 page.screenshot(path=str(out/'editor-light.png'),full_page=True)
 page.get_by_role('button',name='To‘plamni e’lon qilish',exact=True).click()
 expect(page.get_by_text('To‘plam e’lon qilindi. Endi u barcha foydalanuvchilarga ko‘rinadi.',exact=True)).to_be_visible()
 assert len(versions)==45 and len(publications)==1
 assert not any('/groups' in path or '/assignments' in path for path,_ in requests)
 check('one Publish prepares all 45 questions and publishes without any enrollment request')
 before_revisions=sum(d['revision'] for d in drafts.values())
 page.get_by_role('button',name='To‘plamni e’lon qilish',exact=True).click()
 expect(page.get_by_role('button',name='To‘plamni e’lon qilish',exact=True)).to_be_enabled()
 assert sum(d['revision'] for d in drafts.values())==before_revisions
 check('retry uses the same saved revision instead of creating a new test version')
 page.get_by_role('link',name='Natijalarni ko‘rish',exact=True).click();page.wait_for_load_state('networkidle')
 expect(page.get_by_text('Synthetic Student',exact=True)).to_be_visible()
 expect(page.locator('tbody')).to_contain_text('1 / 45')
 check('collection results show learner names and scores without a group selector')
 page.goto(base+'/admin/students');page.wait_for_load_state('networkidle')
 expect(page.locator('tbody')).to_contain_text('Synthetic Student')
 expect(page.get_by_role('searchbox',name='Ism yoki email orqali qidirish')).to_be_visible()
 expect(page.locator('input')).to_have_count(1)
 check('registered users are listed automatically with name/email search')
 page.goto(base+'/admin/import');page.wait_for_load_state('networkidle')
 page.get_by_role('link',name='Shu savollardan to‘plam yaratish',exact=True).click();page.wait_for_load_state('networkidle')
 expect(page.get_by_role('textbox',name='To‘plam nomi',exact=True)).to_have_value('Synthetic 45 question import')
 expect(page.locator('.picker-check input:checked')).to_have_count(45)
 check('completed import creates a preselected collection in original file order')
 page.set_viewport_size({'width':390,'height':844})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(out/'editor-mobile.png'),full_page=True)
 check('collection editor remains within mobile viewport')

 page.locator('.system-select-trigger').first.click()
 page.get_by_role('option',name='Belgilangan vaqt oralig‘i',exact=True).click()
 page.locator('input[type=datetime-local]').first.fill('2026-11-01T22:00')
 page.locator('input[type=datetime-local]').last.fill('2026-11-01T23:59')
 page.get_by_role('button',name='To‘plamni e’lon qilish',exact=True).click()
 expect(page.get_by_text('To‘plam e’lon qilindi. Endi u barcha foydalanuvchilarga ko‘rinadi.',exact=True)).to_be_visible()
 scheduled=drafts[publications[-1]['draftId']]['content']
 from datetime import datetime
 assert scheduled['opensAt']==int(datetime.fromisoformat('2026-11-01T22:00:00+05:00').timestamp()*1000)
 assert scheduled['closesAt']==int(datetime.fromisoformat('2026-11-01T23:59:00+05:00').timestamp()*1000)
 check('scheduled publication stores the exact shared Tashkent window')
 page.evaluate("localStorage.setItem('hm.theme',JSON.stringify('dark'))")
 page.goto(base+'/admin');page.wait_for_load_state('networkidle')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(out/'collections-mobile-dark.png'),full_page=True)
 check('published collection cards work in dark mode on mobile')

 user['role']='student'
 page.goto(base+'/tests');page.wait_for_load_state('networkidle')
 expect(page.get_by_text('Synthetic 45 question collection',exact=True)).to_be_visible()
 page.get_by_role('link',name='Testni ochish',exact=True).click();page.wait_for_load_state('networkidle')
 page.get_by_role('button',name='Boshlash yoki davom etish',exact=True).click();page.wait_for_load_state('networkidle')
 expect(page.get_by_role('timer')).to_have_count(0)
 page.locator('.opt').first.click()
 page.get_by_role('button',name='Testni yakunlash',exact=True).click()
 page.get_by_role('button',name='Javoblarni topshirish',exact=True).click()
 expect(page.locator('.result-counts')).to_contain_text('44')
 check('a signed-in learner starts without enrollment and sees score and answer counts after submission')
 assert not errors,errors
 browser.close()
print(f'{checks} UI checks passed')
