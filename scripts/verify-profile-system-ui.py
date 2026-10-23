"""System profile keyboard, persistence, storage failure and layout acceptance checks.
Run against local Vite at 127.0.0.1:4173. Uses HTTP fixtures only.
"""
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:4173'
count = 0
errors = []


def check(label):
    global count
    count += 1
    print('PASS: ' + label, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    for role in ['student', 'admin']:
        context = browser.new_context(viewport={'width': 1366, 'height': 1000})
        user = {'id': '00000000-0000-4000-8000-000000000001', 'name': 'Aziz Abdimuratov', 'email': 'fixture@example.test', 'role': role, 'revision': 0, 'profile': {'firstName': 'Aziz', 'lastName': 'Abdimuratov', 'patronymic': 'O‘ktam o‘g‘li', 'birthDate': '2003-05-10'}}

        def api(route):
            path = urlparse(route.request.url).path
            if path == '/api/v1/auth/me':
                route.fulfill(json={'user': user, 'csrfToken': 'a'*64})
            elif path == '/api/v1/auth/config':
                route.fulfill(json={'googleEnabled': True})
            else:
                route.fulfill(json={'items': [], 'next': None})

        context.route('**/api/v1/**', api)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + ('/admin/profile' if role == 'admin' else '/profile'))
        page.wait_for_load_state('networkidle')
        expect(page.locator('.profile-system select')).to_have_count(0)
        expect(page.locator('.profile-system [role=switch]')).to_have_count(0)
        expect(page.get_by_role('button', name='O‘zgarishlarni saqlash', exact=True)).to_be_disabled()
        assert page.locator('.profile-theme').bounding_box()['width'] < 370
        check(role + ': custom language, compact theme and unchanged save state')
        trigger = page.locator('.profile-language-trigger')
        trigger.focus()
        page.keyboard.press('ArrowDown')
        expect(page.get_by_role('option').first).to_be_focused()
        page.keyboard.press('ArrowDown')
        expect(page.get_by_role('option').nth(1)).to_be_focused()
        page.keyboard.press('Enter')
        expect(trigger).to_contain_text('Qaraqalpaqsha')
        expect(trigger).to_be_focused()
        expect(page.get_by_role('listbox')).to_have_count(0)
        check(role + ': keyboard chooses language and returns focus')
        trigger.click()
        page.keyboard.press('End')
        expect(page.get_by_role('option').last).to_be_focused()
        page.keyboard.press('Home')
        expect(page.get_by_role('option').first).to_be_focused()
        page.keyboard.press('Escape')
        expect(trigger).to_be_focused()
        trigger.click()
        page.locator('h1').click()
        expect(page.get_by_role('listbox')).to_have_count(0)
        trigger.click()
        page.keyboard.press('Tab')
        expect(page.get_by_role('listbox')).to_have_count(0)
        check(role + ': Home/End, Escape, outside click and Tab dismissal')
        trigger.click()
        page.get_by_role('option').first.click()
        page.locator('.profile-theme label').last.click()
        expect(page.locator('html')).to_have_class(__import__('re').compile(r't-dark'))
        page.reload()
        expect(page.locator('.profile-theme input[value=dark]')).to_be_checked()
        page.locator('.profile-theme input[value=dark]').focus()
        page.keyboard.press('ArrowLeft')
        expect(page.locator('.profile-theme input[value=light]')).to_be_checked()
        check(role + ': theme persists and supports native radio keyboard navigation')
        page.locator('.profile-theme label').first.click()
        page.emulate_media(color_scheme='dark')
        expect(page.locator('html')).to_have_class(__import__('re').compile(r't-dark'))
        page.emulate_media(color_scheme='light')
        expect(page.locator('html')).to_have_class(__import__('re').compile(r't-light'))
        check(role + ': automatic theme follows device appearance')
        page.evaluate("""() => { window.realSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k==='hm.theme'||k==='hm.language') throw new DOMException('fixture blocked','SecurityError'); return window.realSetItem.call(this,k,v); }; }""")
        page.locator('.profile-theme label').last.click()
        expect(page.locator('.profile-preference-error')).to_have_count(1)
        expect(page.locator('.profile-theme input[value=system]')).to_be_checked()
        trigger.click()
        page.get_by_role('option').last.click()
        expect(page.locator('.profile-preference-error')).to_have_count(2)
        expect(trigger).to_contain_text('Русский')
        check(role + ': blocked preference storage reports errors without false saved states')
        page.evaluate('() => { Storage.prototype.setItem = window.realSetItem; }')
        page.locator('.profile-preference-error button').last.click()
        page.locator('.profile-preference-error button').first.click()
        expect(page.locator('.profile-preference-error')).to_have_count(0)
        trigger.click()
        page.get_by_role('option').first.click()
        page.locator('.profile-theme label').nth(1).click()
        check(role + ': preference storage can be retried')
        page.locator('[name=firstName]').fill('Changed')
        expect(page.get_by_role('button', name='O‘zgarishlarni saqlash', exact=True)).to_be_enabled()
        page.locator('#profile-signout').click()
        expect(page.get_by_role('alertdialog')).to_be_visible()
        expect(page.locator('#profile-stay')).to_be_focused()
        expect(page.get_by_role('alertdialog')).to_contain_text('saqlanmagan')
        page.locator('#profile-stay').click()
        expect(page.locator('#profile-signout')).to_be_focused()
        page.locator('[name=firstName]').fill('Aziz')
        check(role + ': unsaved edits are visible and modal cancellation restores focus')
        Path('.worker-build/profile-system').mkdir(parents=True, exist_ok=True)
        assert page.locator('.profile-edit-form .input').first.bounding_box()['height'] <= 50
        page.evaluate("() => {document.activeElement?.blur();window.scrollTo(0,0);document.querySelectorAll('*').forEach(e=>{if(e.scrollTop)e.scrollTop=0;});}")
        page.screenshot(path=f'.worker-build/profile-system/{role}-desktop.png', full_page=True)
        trigger.click()
        page.screenshot(path=f'.worker-build/profile-system/{role}-language.png', full_page=True)
        page.keyboard.press('Escape')
        for width in [320, 390, 768]:
            page.set_viewport_size({'width': width, 'height': 900})
            page.screenshot(path=f'.worker-build/profile-system/{role}-{width}.png',full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), str(page.evaluate("[...document.querySelectorAll('.profile-system *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,c:e.className,width:e.getBoundingClientRect().width})).slice(0,15)"))
            trigger.click()
            box = page.get_by_role('listbox').bounding_box()
            assert box['x'] >= 0 and box['x'] + box['width'] <= width
            page.keyboard.press('Escape')
        check(role + ': profile and open language picker fit 320/390/768px')
        page.set_viewport_size({'width':390,'height':844})
        page.evaluate("() => {document.activeElement?.blur();window.scrollTo(0,0);document.querySelectorAll('*').forEach(e=>{if(e.scrollTop)e.scrollTop=0;});}")
        page.screenshot(path=f'.worker-build/profile-system/{role}-mobile.png', full_page=True)
        context.close()
    browser.close()
assert not errors, errors
print(f'{count} System profile checks passed')
