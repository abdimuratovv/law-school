"""Stage 2 browser checks. Run against a built local Worker; uses disposable contexts.

Requires Python Playwright and installed Google Chrome. Provider UI states use HTTP
fixtures; this is not a live Google OAuth acceptance test.
"""
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:8787'
checks = 0


def check(name, condition):
    global checks
    assert condition, name
    checks += 1
    print('PASS: ' + name, flush=True)


def user(number, name, role='student'):
    return {'id': f'00000000-0000-4000-8000-{number:012d}', 'name': name,
            'email': f'fixture{number}@example.test', 'role': role, 'revision': 0}


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    errors = []
    context = browser.new_context(viewport={'width': 1366, 'height': 768})
    context.add_init_script("localStorage.setItem('hm.user', JSON.stringify({role:'admin',phone:'901234567'}));")
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    google_enabled = context.request.get(BASE + '/api/v1/auth/config').json()['googleEnabled']
    for language in ['uz', 'kaa', 'ru']:
        page.goto(BASE + '/sign-in')
        page.evaluate('(language)=>localStorage.setItem("hm.language",language)', language)
        page.goto(BASE + '/admin')
        expect(page).to_have_url(BASE + '/sign-in')
        if google_enabled:
            expect(page.locator('#google-signin')).to_be_enabled()
        else:
            expect(page.locator('#google-signin')).to_be_disabled()
        check(language + ': forged local identity cannot enter teacher routes', page.locator('.teacher-main').count() == 0)
        check(language + ': phone/OTP bypass is absent', page.locator('#phone,.otp').count() == 0)
    context.close()

    identity = {'user': user(1, 'A Learner')}
    csrf = 'a' * 64
    context = browser.new_context(viewport={'width': 1366, 'height': 768})
    context.add_init_script("""if(!sessionStorage.authSeed){
      localStorage.setItem('hm.user',JSON.stringify({role:'admin'}));
      localStorage.setItem('hm.attempts','[{"id":"legacy-demo"}]');
      localStorage.setItem('hm.theme','"dark"');
      sessionStorage.authSeed='1';
    }""")
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))

    def route_auth(route):
        path = urlparse(route.request.url).path
        if path.endswith('/config'):
            route.fulfill(json={'googleEnabled': True})
        elif path.endswith('/me'):
            route.fulfill(status=200 if identity['user'] else 401,
                          json={'user': identity['user'], 'csrfToken': csrf} if identity['user'] else {'error': {'code': 'UNAUTHENTICATED'}})
        elif path.endswith('/logout'):
            check('logout includes the session CSRF header', route.request.headers.get('x-csrf-token') == csrf)
            identity['user'] = None
            route.fulfill(json={'ok': True})
        elif path.endswith('/google/start'):
            check('Google button preserves the protected return destination', parse_qs(urlparse(route.request.url).query).get('returnTo') == ['/tests'])
            route.fulfill(body='Fixture navigation; Google is not contacted.', content_type='text/html')
        else:
            route.continue_()

    context.route('**/api/v1/auth/**', route_auth)
    page.goto(BASE + '/tests/practice-1')
    page.locator('.prep-actions .btn-primary').click()
    expect(page.locator('button.opt').first).to_be_visible()
    page.locator('button.opt').first.click()
    key = 'hm.account.' + identity['user']['id'] + '.demo.sessions'
    check('new answers use an account-specific cache', page.evaluate('(key)=>!!JSON.parse(localStorage.getItem(key))["practice-1"].answers["Q-0051"]', key))
    check('legacy results are preserved rather than imported', page.evaluate('localStorage.getItem("hm.attempts")') == '[{"id":"legacy-demo"}]')
    page.goto(BASE + '/profile')
    expect(page.locator('.learning-identity')).to_contain_text('fixture1@example.test')
    check('logout explains cache clearing in the selected language', 'Chiqish bu sessiyani bekor qiladi' in page.locator('main').inner_text())
    page.locator('#profile-signout').click()
    page.locator('.learning-dialog .learning-actions button').last.click()
    expect(page).to_have_url(BASE + '/sign-in')
    check('logout clears the account preview cache', page.evaluate('(key)=>localStorage.getItem(key)', key) is None)
    check('logout preserves appearance preferences', page.evaluate('localStorage.getItem("hm.theme")') == '"dark"')
    identity['user'] = user(2, 'B Learner')
    page.goto(BASE + '/admin')
    expect(page.locator('main h1')).to_have_text('Bu sahifa faqat o‘qituvchilar uchun.')
    check('a real student session cannot enter the teacher UI', page.locator('.teacher-main').count() == 0)
    identity['user'] = user(3, 'Teacher A', 'teacher')
    page.goto(BASE + '/admin/builder')
    page.locator('#tn').fill('Private teacher draft A')
    authoring_key = 'hm.account.' + identity['user']['id'] + '.demo.authoringDrafts.v1'
    page.wait_for_function('(key)=>!!localStorage.getItem(key)', arg=authoring_key)
    check('teacher drafts use their account namespace', 'Private teacher draft A' in page.evaluate('(key)=>localStorage.getItem(key)', authoring_key))
    identity['user'] = user(4, 'Teacher B', 'teacher')
    page.goto(BASE + '/admin/builder')
    expect(page.locator('#tn')).to_have_value('')
    check('account changes clear the previous teacher draft', page.evaluate('(key)=>localStorage.getItem(key)', authoring_key) is None)
    identity['user'] = None
    page.goto(BASE + '/tests')
    expect(page).to_have_url(BASE + '/sign-in')
    expect(page.locator('#google-signin')).to_be_enabled()
    page.locator('#google-signin').click()
    expect(page).to_have_url(__import__('re').compile('/api/v1/auth/google/start'))
    check('browser journeys have no uncaught exceptions', not errors)
    context.close()
    browser.close()
print(f'{checks} browser checks passed. Google-provider screens were not contacted.')
