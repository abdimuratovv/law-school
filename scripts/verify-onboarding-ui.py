"""Local frontend onboarding acceptance tests with HTTP fixtures; no Google credentials."""
import json
from urllib.parse import urlparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:4173'
Path('.worker-build/onboarding-ui').mkdir(parents=True, exist_ok=True)
errors = []
checks = 0


def check(message):
    global checks
    checks += 1
    print('PASS: ' + message, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    for role in ['student', 'admin']:
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        user = {'id': '00000000-0000-4000-8000-000000000001', 'name': 'Google Name', 'email': 'fixture@example.test', 'role': role, 'revision': 0, 'profile': None}
        state = {'fail': True, 'saves': 0}

        def api(route):
            path = urlparse(route.request.url).path
            if path == '/api/v1/auth/me':
                route.fulfill(json={'user': user, 'csrfToken': 'a'*64})
            elif path == '/api/v1/auth/config':
                route.fulfill(json={'googleEnabled': True})
            elif path == '/api/v1/auth/profile':
                state['saves'] += 1
                body = json.loads(route.request.post_data)
                assert route.request.method == 'PUT'
                assert route.request.headers['x-csrf-token'] == 'a'*64
                if state['fail']:
                    route.fulfill(status=503, json={'error': {'code': 'SERVICE_UNAVAILABLE'}})
                else:
                    assert body.pop('revision') == user['revision']
                    user.update(profile=body, revision=user['revision']+1, name=body['firstName']+' '+body['lastName'])
                    route.fulfill(json={'user': user})
            else:
                route.fulfill(json={'items': [], 'next': None})

        context.route('**/api/v1/**', api)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        target = '/admin/profile' if role == 'admin' else '/profile'
        page.goto(BASE + target)
        page.wait_for_load_state('networkidle')
        expect(page.locator('h1')).to_have_text('Profilingizni to‘ldiring')
        expect(page.locator('[name=birthDate]')).to_have_count(0)
        check(role + ': incomplete Google account sees step one before workspace')
        page.screenshot(path='.worker-build/onboarding-ui/'+role+'-step-1.png', full_page=True)
        page.get_by_role('button', name='Keyingi', exact=True).click()
        expect(page.locator('[name=firstName]')).to_be_visible()
        check(role + ': required fields prevent empty next step')
        for name, text in [('firstName', 'Aziz'), ('lastName', 'Abdimuratov'), ('patronymic', 'O‘ktam o‘g‘li')]:
            page.locator('[name='+name+']').fill(text)
        page.get_by_role('button', name='Keyingi', exact=True).click()
        expect(page.locator('[name=birthDate]')).to_be_visible()
        expect(page.locator('h2')).to_be_focused()
        check(role + ': second step asks date with keyboard focus')
        page.screenshot(path='.worker-build/onboarding-ui/'+role+'-step-2.png', full_page=True)
        page.locator('form button.btn-secondary').click()
        expect(page.locator('[name=firstName]')).to_have_value('Aziz')
        page.get_by_role('button', name='Keyingi', exact=True).click()
        page.locator('[name=birthDate]').fill('2003-05-10')
        page.get_by_role('button', name='Saqlash va davom etish', exact=True).click()
        expect(page.get_by_role('alert')).to_be_visible()
        expect(page.locator('[name=birthDate]')).to_have_value('2003-05-10')
        check(role + ': previous retains names and failed save retains questionnaire')
        state['fail'] = False
        page.get_by_role('button', name='Saqlash va davom etish', exact=True).click()
        expect(page.locator('.profile-onboarding')).to_have_count(0)
        expect(page).to_have_url(BASE + target)
        expect(page.locator('[name=patronymic]')).to_have_value('O‘ktam o‘g‘li')
        check(role + ': save continues to original destination and shows saved profile fields')
        page.reload()
        expect(page.locator('.profile-onboarding')).to_have_count(0)
        expect(page.locator('[name=birthDate]')).to_have_value('2003-05-10')
        check(role + ': completed questionnaire does not recur after reload')
        page.locator('[name=firstName]').fill('Alisher')
        page.get_by_role('button', name='O‘zgarishlarni saqlash', exact=True).click()
        expect(page.get_by_role('status').filter(has_text='Profil saqlandi.')).to_be_visible()
        page.reload()
        expect(page.locator('[name=firstName]')).to_have_value('Alisher')
        check(role + ': profile edits persist across reload')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        check(role + ': form fits 390px mobile viewport')
        for language, label in [('ru', 'Личные данные'), ('kaa', 'Jeke maǵlıwmatlar'), ('uz', 'Shaxsiy ma’lumotlar')]:
            page.locator('.language-field select').select_option(language)
            expect(page.locator('#personal-profile-title')).to_have_text(label)
        check(role + ': all three languages translate profile form')
        page.screenshot(path='.worker-build/onboarding-ui/'+role+'.png', full_page=True)
        context.close()
    assert not errors, errors
    browser.close()
    check('no uncaught browser exceptions')
print(str(checks) + ' checks passed')
