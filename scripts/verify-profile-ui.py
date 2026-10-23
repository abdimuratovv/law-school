"""Profile navigation and language controls on a local frontend with HTTP auth fixtures.

Run after npm run build, with Vite preview on 127.0.0.1:4173.
No Google request or cloud database is used.
"""
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:4173'
checks = 0
errors = []


def check(name, condition=True):
    global checks
    assert condition, name
    checks += 1
    print('PASS: ' + name, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    for role in ['student', 'admin']:
        context = browser.new_context(viewport={'width': 1366, 'height': 900})
        identity = {'user': {'id': '00000000-0000-4000-8000-000000000001', 'name': 'Kira', 'email': 'fixture@example.test', 'role': role, 'revision': 0}}

        def api(route):
            path = __import__('urllib.parse', fromlist=['urlparse']).urlparse(route.request.url).path
            if path == '/api/v1/auth/me':
                route.fulfill(status=200 if identity['user'] else 401, json={'user': identity['user'], 'csrfToken': 'a'*64} if identity['user'] else {'error': {'code': 'UNAUTHENTICATED'}})
            elif path == '/api/v1/auth/config':
                route.fulfill(json={'googleEnabled': True})
            elif path == '/api/v1/auth/logout':
                identity['user'] = None
                route.fulfill(json={'ok': True})
            elif path == '/api/v1/progress':
                route.fulfill(json={'summary': {'completed': 0, 'final': 0, 'provisional': 0, 'averagePercent': None, 'topics': {}}, 'items': [], 'window': 100, 'backfillPending': False})
            else:
                route.fulfill(json={'items': [], 'next': None})

        context.route('**/api/v1/**', api)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        home = '/admin' if role == 'admin' else '/tests'
        profile = '/admin/profile' if role == 'admin' else '/profile'
        page.goto(BASE + home)
        page.wait_for_load_state('networkidle')
        expect(page.locator('.workspace-profile .avatar')).to_have_text('K')
        expect(page.locator('.workspace-links a[href="'+profile+'"]')).to_have_count(0)
        expect(page.locator('.workspace-footer select')).to_have_count(0)
        expect(page.locator('main .language-field')).to_have_count(0)
        check(role + ': profile row and footer language selector are removed; avatar is present')
        page.locator('.workspace-profile strong').click()
        expect(page).to_have_url(BASE + profile)
        expect(page.locator('main')).to_have_count(1)
        expect(page.locator('main h1')).to_have_text('Profil')
        expect(page.locator('.workspace-profile')).to_have_attribute('aria-current', 'page')
        check(role + ': name opens own profile inside the correct workspace')
        page.locator('main .language-field select').select_option('ru')
        expect(page.locator('main h1')).to_have_text('Профиль')
        page.reload()
        expect(page.locator('main .language-field select')).to_have_value('ru')
        check(role + ': profile language preference survives reload')
        page.locator('main .language-field select').select_option('uz')
        page.goto(BASE + home)
        page.locator('.workspace-profile').focus()
        page.keyboard.press('Enter')
        expect(page).to_have_url(BASE + profile)
        check(role + ': footer profile link works with keyboard')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(BASE + home)
        page.locator('.workspace-menu').click()
        expect(page.locator('#workspace-drawer')).to_be_visible()
        page.locator('#workspace-drawer .workspace-profile .avatar').click()
        expect(page).to_have_url(BASE + profile)
        expect(page.locator('#workspace-drawer')).to_have_count(0)
        expect(page.locator('main .language-field select')).to_be_visible()
        check(role + ': mobile avatar opens profile and closes navigation drawer')
        check(role + ': profile fits mobile width', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        if role == 'admin':
            page.locator('#profile-signout').click()
            page.get_by_role('button', name='Chiqishni tasdiqlash', exact=True).click()
            expect(page).to_have_url(BASE + '/sign-in')
            check('admin profile preserves the normal sign-out flow')
        context.close()

    context = browser.new_context(viewport={'width': 390, 'height': 844})
    context.route('**/api/v1/auth/me', lambda route: route.fulfill(status=401, json={'error': {'code': 'UNAUTHENTICATED'}}))
    context.route('**/api/v1/auth/config', lambda route: route.fulfill(json={'googleEnabled': True}))
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/sign-in')
    page.wait_for_load_state('networkidle')
    expect(page.locator('select')).to_have_count(0)
    flag = page.locator('.language-flag')
    expect(flag).to_have_attribute('data-language', 'uz')
    check('landing has one circular flag button and no language dropdown', flag.evaluate('(b)=>getComputedStyle(b).borderRadius') == '50%')
    for language in ['kaa', 'ru', 'uz']:
        flag.click()
        expect(flag).to_have_attribute('data-language', language)
        expect(page.locator('html')).to_have_attribute('lang', language)
    check('flag cycles Uzbek, Karakalpak, Russian and wraps to Uzbek')
    flag.focus()
    page.keyboard.press('Enter')
    expect(flag).to_have_attribute('data-language', 'kaa')
    page.reload()
    expect(page.locator('.language-flag')).to_have_attribute('data-language', 'kaa')
    check('flag supports keyboard and persists its language on reload')
    expect(page.get_by_role('listbox')).to_have_count(0)
    check('flag never opens a language list')
    check('all profile and language journeys have no uncaught exceptions', not errors)
    browser.close()
print(f'{checks} profile/navigation/language browser checks passed.')
