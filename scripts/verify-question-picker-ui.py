"""Synthetic, scrambled publication pages verify the builder's ordered selection."""
import json
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect

user={'id':'00000000-0000-4000-8000-000000000001','name':'Synthetic Teacher','email':'fixture@example.test','role':'admin','revision':0,'profile':{'firstName':'Synthetic','lastName':'Teacher','patronymic':'Test','birthDate':'2000-01-01'}}
items=[{'id':f'q-{i:03}','questionId':f'draft-{i}','revision':0,'stem':f'{i}. Synthetic original question '+('long source content '*10),'kind':'single','sourceNumber':i,'sourceName':'synthetic-45.csv','sourceId':'source-one','sourceCreated':1000} for i in range(1,46)]
scrambled=items[::2][::-1]+items[1::2]
saved=[];calls=[];errors=[];checks=0
def check(label):
    global checks
    checks+=1;print('PASS: '+label,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    context=browser.new_context(viewport={'width':1366,'height':1000})
    def api(route):
        u=urlparse(route.request.url);query=parse_qs(u.query)
        if u.path.endswith('/auth/me'):route.fulfill(json={'user':user,'csrfToken':'a'*64})
        elif u.path.endswith('/auth/config'):route.fulfill(json={'googleEnabled':True})
        elif u.path.endswith('/staff/question-versions'):
            after=query.get('after',[''])[0];offset=int(after) if after else 0
            calls.append(after);route.fulfill(json={'items':scrambled[offset:offset+20],'next':str(offset+20) if offset+20<len(scrambled) else None})
        elif (u.path.endswith('/staff/tests') and route.request.method=='POST') or (u.path.startswith('/api/v1/staff/tests/') and route.request.method=='PATCH'):
            body=json.loads(route.request.post_data);saved.append(body['content'])
            route.fulfill(status=201,json={'id':body.get('operationId',u.path.split('/')[-1]),'revision':body.get('revision',-1)+1,'content':body['content'],'publishedVersionId':None,'publishedRevision':None})
        elif u.path=='/api/v1/groups':route.fulfill(json={'groups':[],'nextCursor':None})
        else:route.fulfill(json={'items':[],'next':None})
    context.route('**/api/v1/**',api)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/admin/builder');page.wait_for_load_state('networkidle')
    picker=page.locator('.question-picker')
    expect(picker.locator('.picker-list>li')).to_have_count(45)
    assert picker.locator('.bank-number').all_text_contents()==[str(i) for i in range(1,46)]
    assert len(calls)==3
    check('all publication pages are loaded and shown as questions 1–45')
    expect(page.locator('#duration')).to_have_count(0)
    check('builder has no personal duration control')
    picker.get_by_role('button',name='Barchasini tanlash (45)',exact=True).click()
    expect(picker.locator('input[type=checkbox]:checked')).to_have_count(45)
    page.locator('#tn').fill('Synthetic ordered test')
    page.get_by_test_id('save-draft').click()
    expect(page.get_by_text('Draft serverda saqlandi.',exact=False)).to_be_visible()
    assert saved[-1]['questionVersionIds']==[f'q-{i:03}' for i in range(1,46)]
    assert saved[-1]['durationSeconds'] is None
    check('one select-all action saves exactly the 45 IDs in numeric order')
    picker.get_by_role('button',name='Tanlovni bekor qilish',exact=True).click()
    expect(picker.locator('input[type=checkbox]:checked')).to_have_count(0)
    check('clear selection removes all selected questions')
    range_inputs=picker.locator('input[type=number]')
    range_inputs.nth(0).fill('10');range_inputs.nth(1).fill('20')
    expect(picker.locator('.picker-list>li')).to_have_count(11)
    picker.get_by_role('button',name='Barchasini tanlash (11)',exact=True).click()
    expect(picker.locator('input[type=checkbox]:checked')).to_have_count(11)
    page.get_by_test_id('save-draft').click();page.wait_for_load_state('networkidle')
    assert saved[-1]['questionVersionIds']==[f'q-{i:03}' for i in range(10,21)]
    check('inclusive range 10–20 selects and saves 11 questions in order')
    picker.locator('input[type=checkbox]').first.uncheck();picker.locator('input[type=checkbox]').first.check()
    page.get_by_test_id('save-draft').click();page.wait_for_load_state('networkidle')
    assert saved[-1]['questionVersionIds']==[f'q-{i:03}' for i in range(10,21)]
    check('deselecting and reselecting question 10 keeps numeric ordering')
    range_inputs.nth(0).fill('30');range_inputs.nth(1).fill('20')
    expect(picker.get_by_role('alert')).to_be_visible()
    check('reversed number ranges show validation instead of arbitrary results')
    picker.get_by_role('button',name='Filtrlarni tozalash').click()
    scrambled.extend([{'id':f'q-{i:03}','questionId':f'draft-{i}','revision':0,'stem':f'{i}. Synthetic extra question','kind':'written','sourceNumber':i,'sourceName':'synthetic-45.csv','sourceId':'source-one','sourceCreated':1000} for i in range(46,106)])
    page.reload();page.wait_for_load_state('networkidle')
    picker=page.locator('.question-picker')
    expect(picker.get_by_role('button',name='Barchasini tanlash (105)',exact=True)).to_be_disabled()
    range_inputs=picker.locator('input[type=number]');range_inputs.nth(0).fill('1');range_inputs.nth(1).fill('100')
    picker.get_by_role('button',name='Barchasini tanlash (100)',exact=True).click()
    expect(picker.locator('input[type=checkbox]:checked')).to_have_count(100)
    picker.get_by_role('button',name='Filtrlarni tozalash').click()
    expect(picker.locator('input[type=checkbox]').last).to_be_disabled()
    check('100-question limit prevents selecting 105 or adding a 101st question')
    out=Path('.worker-build/question-picker');out.mkdir(parents=True,exist_ok=True)
    page.screenshot(path=str(out/'desktop-light.png'),full_page=True)
    page.evaluate("localStorage.setItem('hm.theme',JSON.stringify('dark'))")
    page.reload();page.wait_for_load_state('networkidle')
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'mobile-dark.png'),full_page=True)
    check('compact picker works on mobile without horizontal overflow')
    assert not errors,errors
    browser.close()
print(f'{checks} checks passed')
