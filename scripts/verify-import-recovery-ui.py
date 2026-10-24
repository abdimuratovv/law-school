"""Real CSV worker + HTTP fixtures for interrupted imports; no production sessions."""
import csv
import hashlib
import io
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:4173'
root=Path('.worker-build/import-recovery');root.mkdir(parents=True,exist_ok=True)
headers=['kind','topic','stem','A','B','C','D','correct','accepted','explanation','terms','defs','legal_label','legal_url']
stream=io.StringIO(newline='');writer=csv.writer(stream);writer.writerow(headers)
for n in range(45):writer.writerow(['single' if n<35 else 'written','theory','Synthetic recovery question '+str(n+1),'First','Second','Third','Fourth','B' if n<35 else '','' if n<35 else 'example|alternative','','','','',''])
source=stream.getvalue().encode('utf-8-sig');file=root/'recovery.csv';file.write_bytes(source)
digest=hashlib.sha256(source).hexdigest();errors=[];checks=0


def check(message):
    global checks
    checks+=1
    print('PASS: '+message,flush=True)


with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for scenario in ['recover','interrupted','authorization']:
        context=browser.new_context(viewport={'width':1366,'height':1000})
        user={'id':'00000000-0000-4000-8000-000000000001','name':'Synthetic Teacher','email':'fixture@example.test','role':'admin','revision':0,'profile':{'firstName':'Synthetic','lastName':'Teacher','patronymic':'Fixture','birthDate':'2000-01-01'}}
        job={'id':'00000000-0000-4000-8000-000000000002','filename':'recovery.csv','fileHash':digest,'status':'uploading','uploadedRows':25,'totalRows':45,'payloadBytes':1000,'cursor':1,'created':0,'skipped':0,'duplicatePolicy':'skip'}
        saved=set(range(2,27));sent=[];state={'online':scenario=='recover','uploadLost':False,'commitLost':False,'posts':0}

        def api(route):
            path=urlparse(route.request.url).path
            method=route.request.method
            if path=='/api/v1/auth/me':route.fulfill(json={'user':user,'csrfToken':'a'*64})
            elif path=='/api/v1/auth/config':route.fulfill(json={'googleEnabled':True})
            elif path=='/api/v1/staff/imports' and method=='GET':route.fulfill(json={'items':[job],'next':None})
            elif path=='/api/v1/staff/imports' and method=='POST':route.fulfill(status=201,json=job)
            elif path.endswith('/rows') and method=='GET':route.fulfill(json={'rowNumbers':sorted(saved)})
            elif path.endswith('/rows') and method=='POST':
                state['posts']+=1
                body=json.loads(route.request.post_data);numbers=[r['rowNumber'] for r in body['rows']];sent.append(numbers)
                assert len(numbers)<=10
                if scenario=='authorization' and not state['online']:
                    route.fulfill(status=401,headers={'X-Request-Id':'fixture-401'},json={'error':{'code':'UNAUTHENTICATED'}});return
                saved.update(numbers);job['uploadedRows']=len(saved)
                if not state['online'] or not state['uploadLost']:
                    state['uploadLost']=True
                    route.fulfill(status=503,headers={'X-Request-Id':'fixture-503'},body='Temporary edge failure');return
                route.fulfill(json=job)
            elif path.endswith('/validate'):
                assert len(saved)==45
                job['status']='ready';route.fulfill(json=job)
            elif path.endswith('/commit'):
                cursor=json.loads(route.request.post_data)['cursor']
                if cursor==job['cursor'] and job['status']!='complete':
                    remaining=45-job['created'];size=min(25,remaining);job['created']+=size;job['cursor']+=size;job['status']='complete' if job['created']==45 else 'committing'
                if not state['commitLost']:
                    state['commitLost']=True
                    route.fulfill(status=503,headers={'X-Request-Id':'fixture-commit'},json={'error':{'code':'SERVICE_UNAVAILABLE'}});return
                route.fulfill(json=job)
            else:route.fulfill(json={'items':[],'next':None})

        context.route('**/api/v1/**',api)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'/admin/import');page.wait_for_load_state('networkidle')
        expect(page.locator('.import-history-item progress')).to_have_attribute('value','25')
        expect(page.get_by_role('button',name='Yuklashni davom ettirish')).to_be_visible()
        check(scenario+': persisted 25/45 upload has an explicit recovery action')
        if scenario=='recover':
            with page.expect_file_chooser() as wrong:page.get_by_role('button',name='Yuklashni davom ettirish').click()
            wrong.value.set_files({'name':'different.csv','mimeType':'text/csv','buffer':source+b'\r\n'})
            expect(page.locator('.import-error')).to_contain_text('Dastlabki faylni tanlang',timeout=20000)
            assert state['posts']==0
            check('a different file cannot be attached to a saved import')
        with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Yuklashni davom ettirish').click()
        chooser.value.set_files(str(file.resolve()))
        expect(page.locator('.import-resume-notice')).to_contain_text('Faqat qolgan qatorlar',timeout=20000)
        check(scenario+': actual CSV worker recognizes the exact saved import')
        if scenario=='recover':
            expect(page.locator('.import-preview')).not_to_have_attribute('open','')
            page.locator('.import-preview summary').click()
            expect(page.locator('.import-preview tbody tr')).to_have_count(10)
            assert 'theory' not in page.locator('.import-preview tbody').inner_text()
            page.locator('.import-preview summary').click()
        page.get_by_role('button',name='Importni davom ettirish',exact=True).click()
        if scenario!='recover':
            expect(page.locator('.import-error')).to_be_visible(timeout=15000)
            expect(page.get_by_role('button',name='Importni qayta urinish')).to_be_visible()
            if scenario=='authorization':
                assert state['posts']==1
                expect(page.locator('.import-error')).to_contain_text('HTTP 401')
                check('authorization failures are not retried automatically')
            else:
                assert state['posts']==3
                expect(page.locator('.import-error')).to_contain_text('HTTP 503')
                expect(page.locator('.import-error')).to_contain_text('fixture-503')
                check('persistent failures stop after three attempts and show HTTP/request ID')
            state['online']=True
            page.get_by_role('button',name='Importni qayta urinish').click()
        expect(page.locator('.import-complete')).to_be_visible(timeout=15000)
        assert job['created']==45 and len(saved)==45
        assert all(n>=27 for chunk in sent for n in chunk)
        expect(page.get_by_role('button',name='Importni davom ettirish',exact=True)).to_be_disabled()
        check(scenario+': only missing rows upload; lost responses create 45 drafts exactly once')
        if scenario=='recover':
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.locator('.import-history-item').scroll_into_view_if_needed()
            page.screenshot(path=str(root/'completed-mobile.png'),full_page=True)
            check('import progress and completed history fit mobile width')
        context.close()
    browser.close()
assert not errors,errors
print(str(checks)+' import recovery browser checks passed')
