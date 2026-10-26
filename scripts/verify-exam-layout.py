"""Exercise the exam UI with synthetic API responses against a local preview."""
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('EXAM_UI_BASE', 'http://127.0.0.1:4176')
out = Path('.worker-build/exam-layout')
out.mkdir(parents=True, exist_ok=True)
attempt_id = '00000000-0000-4000-8000-000000000002'
user = {'id': '00000000-0000-4000-8000-000000000001', 'name': 'Synthetic Student',
        'email': 'fixture@example.test', 'role': 'student', 'revision': 0,
        'profile': {'firstName': 'Synthetic', 'lastName': 'Student', 'patronymic': 'Test', 'birthDate': '2000-01-01'}}
now = int(time.time() * 1000)
attempt = {'id': attempt_id, 'examId': 'c_fixture', 'name': 'Huquq mock test 1', 'mode': 'mock',
           'language': 'uz', 'state': 'active', 'revision': 0, 'startedAt': now, 'endsAt': None,
           'savedAt': now, 'serverNow': now, 'snapshot': {'answers': {}, 'flags': []},
           'checked': [], 'feedback': {}, 'result': None,
           'questions': [{'id': f'q{n}', 'kind': 'single', 'topic': 'theory',
                          'stem': f'{n}. Davlat hokimiyatining bo‘linishi prinsipi qanday tarmoqlarni o‘z ichiga oladi?',
                          'options': [{'id': k, 'text': v} for k, v in [('a', 'Qonun chiqaruvchi, ijro etuvchi va sud hokimiyati'),
                                                                    ('b', 'Faqat ijro etuvchi hokimiyat'),
                                                                    ('c', 'Faqat qonun chiqaruvchi hokimiyat'),
                                                                    ('d', 'Mahalliy boshqaruv organlari')]]} for n in range(1, 46)]}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, color_scheme='dark')
    errors = []
    fail_save = False
    def api(route):
        path = urlparse(route.request.url).path.removeprefix('/api/v1')
        if path == '/auth/me':
            route.fulfill(json={'user': user, 'csrfToken': 'a' * 64})
        elif path == '/auth/config':
            route.fulfill(json={'googleEnabled': True})
        elif path.endswith('/save-changes'):
            if fail_save:
                route.fulfill(status=503, json={'error': {'code': 'SERVICE_UNAVAILABLE', 'message': 'Synthetic offline save'}})
            else:
                body = route.request.post_data_json
                attempt['snapshot']['answers'].update(body['answers'])
                attempt['snapshot']['flags'] = body['flags']
                attempt['revision'] += 1
                route.fulfill(json=attempt)
        elif path.startswith('/attempts/'):
            route.fulfill(json=attempt)
        else:
            route.fulfill(json={'items': [], 'next': None})
    context.route('**/api/v1/**', api)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base + '/exam/' + attempt_id)
    page.wait_for_load_state('networkidle')
    expect(page.locator('.exam-question-number')).to_have_count(45)
    expect(page.locator('html')).to_have_class('t-light')
    assert page.evaluate("matchMedia('(prefers-color-scheme: dark)').matches")
    main = page.locator('.exam-content').bounding_box()
    side = page.locator('.exam-navigator').bounding_box()
    assert side['x'] >= main['x'] + main['width'], (main, side)
    assert side['width'] <= 260
    for label in ['Savolni belgilash', 'Oldingi', 'Keyingi']:
        expect(page.get_by_role('button', name=label, exact=True)).to_have_count(0)
    expect(page.get_by_text('Serverda saqlandi', exact=True)).to_have_count(0)
    expect(page.get_by_text('Serverdagi oxirgi saqlash', exact=False)).to_have_count(0)
    page.locator('.exam-question-number').nth(33).click()
    expect(page.locator('.exam-question-title')).to_have_text('Savol 34 / 45')
    expect(page.locator('.exam-question-number').nth(33)).to_have_attribute('aria-current', 'step')
    page.locator('.opt').first.click()
    expect(page.locator('.exam-question-number').nth(33)).to_have_class('exam-question-number is-answered')
    page.screenshot(path=str(out / 'desktop-light.png'), full_page=True)
    # Removing ordinary save messages must not hide an actual failed save.
    fail_save = True
    page.get_by_role('button', name='Hozir saqlash', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Serverga saqlab bo‘lmadi')
    fail_save = False
    page.get_by_role('button', name='Hozir saqlash', exact=True).click()
    expect(page.get_by_role('alert')).to_have_count(0)
    for width in [390, 320]:
        page.set_viewport_size({'width': width, 'height': 844})
        expect(page.locator('.exam-question-grid')).not_to_be_visible()
        toggle = page.locator('.exam-navigator-toggle')
        toggle.click()
        expect(toggle).to_have_attribute('aria-expanded', 'true')
        page.locator('.exam-question-number').last.click()
        expect(page.locator('.exam-question-title')).to_have_text('Savol 45 / 45')
        expect(toggle).to_have_attribute('aria-expanded', 'false')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(out / f'mobile-{width}-light.png'), full_page=True)
    page.evaluate("localStorage.setItem('hm.theme', JSON.stringify('dark'))")
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('html')).to_have_class('t-dark')
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.screenshot(path=str(out / 'desktop-dark.png'), full_page=True)
    assert not errors, errors
    browser.close()
print('PASS: compact sidebar, 45-question navigation, mobile collapse, save failures, light default and saved dark preference')
