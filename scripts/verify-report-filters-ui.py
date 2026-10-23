"""Report filter acceptance checks with HTTP fixtures; no cloud data or Google login."""
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:4173'
errors = []
checks = 0
out = Path('.worker-build/report-filters')
out.mkdir(parents=True, exist_ok=True)


def check(label):
    global checks
    checks += 1
    print('PASS: '+label, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    for role in ['student', 'admin']:
        context = browser.new_context(viewport={'width':1366, 'height':1000})
        user = {'id':'00000000-0000-4000-8000-000000000001','name':'Aziz Abdimuratov','email':'fixture@example.test','role':role,'revision':0,'profile':{'firstName':'Aziz','lastName':'Abdimuratov','patronymic':'Test','birthDate':'2003-05-10'}}
        summary = {'completed':0,'final':0,'provisional':0,'averagePercent':None,'topics':{}}
        requests = []

        def api(route):
            u = urlparse(route.request.url)
            if u.path == '/api/v1/auth/me': route.fulfill(json={'user':user,'csrfToken':'a'*64})
            elif u.path == '/api/v1/auth/config': route.fulfill(json={'googleEnabled':True})
            elif u.path == '/api/v1/staff/assignments': route.fulfill(json={'items':[{'id':'fixture-assignment','name':'Test','groupName':'A'}],'next':None})
            elif u.path in ['/api/v1/progress','/api/v1/staff/analytics']:
                requests.append(parse_qs(u.query))
                route.fulfill(json={'summary':summary,'items':[],'window':100,'backfillPending':False})
            else: route.fulfill(json={'items':[],'next':None})

        context.route('**/api/v1/**', api)
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE + ('/progress' if role=='student' else '/admin/analytics'))
        page.wait_for_load_state('networkidle')
        if role=='admin':
            page.locator('main select').first.select_option('fixture-assignment')
            page.wait_for_load_state('networkidle')
        filters = page.locator('.report-filters')
        expect(filters.locator('select')).to_have_count(0)
        for field in filters.locator('.system-date').all():
            assert 44 <= field.bounding_box()['height'] <= 50
        check(role+': dates and custom selects use compact System controls')
        types = filters.locator('.system-select-trigger').first
        types.focus()
        page.keyboard.press('ArrowDown')
        page.keyboard.press('End')
        expect(page.get_by_role('listbox').get_by_role('option').last).to_be_focused()
        page.keyboard.press('Enter')
        expect(types).to_be_focused()
        assert not requests[-1].get('mode')
        check(role+': keyboard changes draft selection without applying early')
        topic = filters.locator('.system-select-trigger').last
        topic.click()
        page.keyboard.press('End')
        expect(page.get_by_role('listbox').get_by_role('option').last).to_be_focused()
        page.keyboard.press('Escape')
        expect(topic).to_be_focused()
        topic.click()
        page.get_by_role('listbox').get_by_role('option').nth(1).click()
        filters.locator('input[type=date]').first.fill('2026-10-01')
        filters.locator('input[type=date]').last.fill('2026-10-23')
        filters.get_by_role('button', name='Filtrlarni qo‘llash').click()
        page.wait_for_load_state('networkidle')
        assert requests[-1]['mode'] == ['mock'] and requests[-1]['topic'] == ['constitutional']
        assert requests[-1]['from'] == [str(int(datetime.fromisoformat('2026-10-01T00:00:00+05:00').timestamp()*1000))]
        assert requests[-1]['until'] == [str(int(datetime.fromisoformat('2026-10-24T00:00:00+05:00').timestamp()*1000))]
        check(role+': applied query keeps topic/mode and inclusive Tashkent date range')
        before = len(requests)
        filters.locator('input[type=date]').first.fill('2026-10-25')
        filters.get_by_role('button', name='Filtrlarni qo‘llash').click()
        assert not filters.locator('input[type=date]').first.evaluate('(e)=>e.validity.valid')
        assert len(requests) == before
        filters.locator('input[type=date]').first.fill('2026-10-01')
        check(role+': reversed date range cannot submit')
        for select in [types, topic]:
            select.click()
            page.get_by_role('listbox').get_by_role('option').first.click()
        for date in filters.locator('input[type=date]').all(): date.fill('')
        filters.get_by_role('button', name='Filtrlarni qo‘llash').click()
        page.wait_for_load_state('networkidle')
        assert not any(key in requests[-1] for key in ['from','until','topic','mode'])
        check(role+': All and empty dates restore an unfiltered report')
        page.evaluate('document.activeElement?.blur()')
        page.screenshot(path=str(out/(role+'-light.png')), full_page=True)
        page.evaluate("localStorage.setItem('hm.theme',JSON.stringify('dark'))")
        page.reload()
        page.wait_for_load_state('networkidle')
        types = page.locator('.system-select-trigger').first
        topic = page.locator('.system-select-trigger').last
        topic.click()
        page.screenshot(path=str(out/(role+'-dark-menu.png')), full_page=True)
        page.keyboard.press('Escape')
        for width in [320,390,768]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (role,width)
            topic.click()
            box = page.get_by_role('listbox').bounding_box()
            assert box['x'] >= 0 and box['x']+box['width'] <= width
            page.keyboard.press('Tab')
            expect(page.get_by_role('listbox')).to_have_count(0)
        check(role+': dark theme and menus fit 320/390/768px; Tab closes menu')
        context.close()
    # Translations are resolved in the same report component.
    for language in ['kaa','ru']:
        context = browser.new_context()
        context.add_init_script('localStorage.setItem("hm.language",'+json.dumps(language)+')')
        context.route('**/api/v1/**', api)
        page = context.new_page()
        page.goto(BASE+'/progress')
        page.wait_for_load_state('networkidle')
        expect(page.locator('.system-select-trigger')).to_have_count(2)
        assert 'Test type' not in page.locator('.report-filters').inner_text()
        check(language+': filter labels and options are translated')
        context.close()
    browser.close()
assert not errors, errors
print(f'{checks} report filter checks passed')
