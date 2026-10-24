"""Synthetic fixtures for shared deadlines and admin reopening."""
import os
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright, expect

base=os.environ.get('DEADLINE_TEST_BASE','http://127.0.0.1:4173')
out=Path('.worker-build/shared-deadline');out.mkdir(parents=True,exist_ok=True)
now=lambda:int(time.time()*1000)
user={'id':'00000000-0000-4000-8000-000000000001','name':'Synthetic User','email':'fixture@example.test','role':'student','revision':0,'profile':{'firstName':'Synthetic','lastName':'User','patronymic':'Test','birthDate':'2000-01-01'}}
assignment='00000000-0000-4000-8000-000000000002'
attempt_id='00000000-0000-4000-8000-000000000003'
closing=now()+7200000
calls=[];errors=[];expire=False;checks=0
def check(label):
    global checks
    checks+=1;print('PASS: '+label,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    context=browser.new_context(viewport={'width':1366,'height':1000},timezone_id='America/New_York')
    def exam(kind):
        return {'id':kind,'name':'Synthetic scheduled test','mode':'mock','questionCount':45,'durationSeconds':None,'opensAt':now()+3600000 if kind=='future' else now()-3600000,'closesAt':now()-10000 if kind=='closed' else closing,'serverNow':now()}
    def attempt(final=False):
        return {'id':attempt_id,'examId':'a_'+assignment,'name':'Synthetic scheduled test','mode':'mock','state':'final' if final else 'active','revision':0,'startedAt':now()-60000,'endsAt':now()+1400 if expire else closing,'savedAt':now(),'serverNow':now(),'snapshot':{'answers':{},'flags':[]},'questions':[{'id':'synthetic-q','kind':'written','topic':'theory','stem':'Synthetic written question'}],'checked':[],'feedback':{},'result':{'units':0,'maxUnits':2,'pending':0,'final':True,'algorithm':'fixture'} if final else None}
    def api(route):
        path=route.request.url.split('/api/v1')[-1].split('?')[0]
        if path=='/auth/me':route.fulfill(json={'user':user,'csrfToken':'a'*64})
        elif path=='/auth/config':route.fulfill(json={'googleEnabled':True})
        elif path=='/exams':route.fulfill(json={'items':[exam('current'),exam('future'),exam('closed')],'next':None})
        elif path.startswith('/exams/'):route.fulfill(json=exam(path.split('/')[-1]))
        elif path.endswith('/submit'):
            calls.append('submit');route.fulfill(json=attempt(True))
        elif path.startswith('/attempts/'):route.fulfill(json=attempt())
        elif path.endswith('/reopen'):
            calls.append(route.request.post_data_json);route.fulfill(status=201,json={'id':'new-window'})
        elif path=='/staff/assignments':route.fulfill(json={'items':[{'id':assignment,'name':'Synthetic closed test','groupName':'Synthetic group','opensAt':now()-7200000,'closesAt':now()-3600000}],'next':None})
        elif path=='/groups':route.fulfill(json={'groups':[],'nextCursor':None})
        else:route.fulfill(json={'items':[],'next':None})
    context.route('**/api/v1/**',api)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/tests');page.wait_for_load_state('networkidle')
    expect(page.locator('.test-card')).to_have_count(2)
    check('catalog hides closed windows and displays upcoming/current schedules')
    page.goto(base+'/tests/future');page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button',name='Boshlash yoki davom etish')).to_be_disabled()
    check('future window cannot be started in the lobby')
    page.goto(base+'/tests/closed');page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button',name='Boshlash yoki davom etish')).to_be_disabled()
    check('closed window cannot be started in the lobby')
    page.goto(base+'/tests/current');page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button',name='Boshlash yoki davom etish')).to_be_enabled()
    expected=datetime.fromtimestamp(closing/1000,timezone(timedelta(hours=5))).strftime('%H:%M')
    expect(page.locator('.test-schedule')).to_contain_text(expected)
    check('deadline uses Tashkent time even in a New York browser')
    page.goto(base+'/exam/'+attempt_id);page.wait_for_load_state('networkidle')
    expect(page.get_by_role('timer')).to_have_count(0)
    expect(page.locator('.test-schedule')).to_contain_text(expected)
    expect(page.locator('textarea')).to_be_editable()
    check('active exam shows a fixed deadline with no countdown')
    page.screenshot(path=str(out/'student-deadline.png'),full_page=True)
    expire=True
    page.reload();page.wait_for_load_state('networkidle')
    expect(page.locator('textarea')).not_to_be_editable(timeout=5000)
    assert 'submit' in calls
    check('expiry locks editing and asks the server to finalize saved answers')
    user['role']='admin'
    page.goto(base+'/admin/builder');page.wait_for_load_state('networkidle')
    expect(page.locator('#duration')).to_have_count(0)
    expect(page.get_by_text('Test uchun umumiy ochilish va tugash vaqti belgilanadi. Shaxsiy taymer yo‘q.').first).to_be_visible()
    check('test builder has no personal-duration field')
    page.goto(base+'/admin');page.wait_for_load_state('networkidle')
    page.get_by_role('button',name='Testni qayta ochish',exact=True).click()
    form=page.locator('.reopen-assignment form')
    form.locator('input').first.fill('2026-11-01T22:00')
    form.locator('input').last.fill('2026-11-01T23:59')
    form.get_by_role('button',name='Shu vaqt oralig‘ida qayta ochish').click()
    expect(page.get_by_text('Test qayta ochildi.',exact=False)).to_be_visible()
    payload=calls[-1]
    assert payload['opensAt']=='2026-11-01T22:00:00+05:00' and payload['closesAt']=='2026-11-01T23:59:00+05:00' and payload['timeZone']=='Asia/Tashkent'
    check('admin reopening sends the exact chosen Tashkent schedule')
    user['role']='teacher'
    page.reload();page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button',name='Testni qayta ochish',exact=True)).to_have_count(0)
    check('reopening control is restricted to admins')
    assert not errors,errors
    browser.close()
print(f'{checks} checks passed')
