"""Synthetic question bank UI acceptance checks; never signs in to the live app."""
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

out=Path('.worker-build/question-bank')
out.mkdir(parents=True,exist_ok=True)
user={'id':'00000000-0000-4000-8000-000000000001','name':'Synthetic Teacher','email':'fixture@example.test','role':'admin','revision':0,'profile':{'firstName':'Synthetic','lastName':'Teacher','patronymic':'Test','birthDate':'2000-01-01'}}
items=[{'id':str(i),'stem':f'{i}. Synthetic question '+('with long original text ' * 18),'kind':'single' if i<=35 else 'written','topic':'theory','revision':0,'published':int(i==1),'sourceName':'synthetic-mock-45.csv','sourceNumber':i} for i in range(1,46)]
errors=[]
checks=0
def check(label):
    global checks
    checks+=1
    print('PASS: '+label,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1050})
    def api(route):
        u=urlparse(route.request.url);q=parse_qs(u.query)
        if u.path.endswith('/auth/me'):route.fulfill(json={'user':user,'csrfToken':'a'*64})
        elif u.path.endswith('/auth/config'):route.fulfill(json={'googleEnabled':True})
        elif u.path.endswith('/staff/question-bank'):
            rows=items
            for key in ['kind','topic']:
                if q.get(key):rows=[r for r in rows if r[key]==q[key][0]]
            if q.get('search'):rows=[r for r in rows if q['search'][0].lower() in r['stem'].lower()]
            if q.get('status'):rows=[r for r in rows if bool(r['published'])==(q['status'][0]=='published')]
            page=min(int(q.get('page',['1'])[0]),max(1,(len(rows)+19)//20))
            route.fulfill(json={'items':rows[(page-1)*20:page*20],'total':len(rows),'page':page,'pageSize':20})
        else:route.fulfill(json={'items':[],'next':None})
    context.route('**/api/v1/**',api)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/admin/bank');page.wait_for_load_state('networkidle')
    expect(page.locator('.bank-row')).to_have_count(20)
    assert page.locator('.bank-number').all_text_contents()==[str(i) for i in range(1,21)]
    assert page.locator('.bank-row').first.bounding_box()['height']<150
    check('20 compact rows in original source order')
    summary=page.locator('.bank-question summary').first
    summary.focus();page.keyboard.press('Enter')
    expect(page.locator('.bank-full-text').first).to_be_visible()
    page.keyboard.press('Enter');expect(page.locator('.bank-full-text').first).not_to_be_visible()
    check('keyboard disclosure reveals complete original question')
    page.get_by_role('button',name='Keyingi',exact=True).click();page.wait_for_load_state('networkidle')
    expect(page.locator('.bank-number').first).to_have_text('21')
    page.get_by_role('button',name='Keyingi',exact=True).click();page.wait_for_load_state('networkidle')
    expect(page.locator('.bank-row')).to_have_count(5)
    check('next pages include questions 21–45 without oversized cards')
    page.locator('.bank-search input').fill('45. Synthetic')
    expect(page.locator('.bank-row')).to_have_count(1)
    expect(page.locator('.bank-number')).to_have_text('45')
    check('search covers the full bank and resets pagination')
    page.locator('.bank-search input').fill('missing-question')
    expect(page.locator('.bank-row')).to_have_count(0)
    page.get_by_role('button',name='Filtrlarni tozalash').click()
    expect(page.locator('.bank-row')).to_have_count(20)
    check('empty search has a working reset')
    page.locator('.system-select-trigger').last.click()
    page.get_by_role('option').last.click()
    expect(page.locator('.bank-row')).to_have_count(1)
    expect(page.locator('.bank-number')).to_have_text('1')
    check('publication status filter applies to the whole bank')
    page.goto('http://127.0.0.1:4173/admin/bank');page.wait_for_load_state('networkidle')
    page.screenshot(path=str(out/'desktop-light.png'),full_page=True)
    page.evaluate("localStorage.setItem('hm.theme',JSON.stringify('dark'))")
    page.reload();page.wait_for_load_state('networkidle')
    page.screenshot(path=str(out/'desktop-dark.png'),full_page=True)
    check('light and dark System presentation captured')
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'mobile-dark.png'),full_page=True)
    check('mobile has no horizontal overflow')
    page.goto('http://127.0.0.1:4173/admin');page.wait_for_load_state('networkidle')
    expect(page.get_by_text('Guruhlarga hali test biriktirilmagan.')).to_be_visible()
    expect(page.locator('main').get_by_role('link',name='Savollar banki')).to_be_visible()
    check('empty overview explains assignments and links to the bank')
    assert not errors,errors
    browser.close()
print(f'{checks} checks passed')
