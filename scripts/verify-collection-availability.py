"""Admission UI checks with synthetic identities and intercepted API calls only."""
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('EXAM_UI_BASE', 'http://127.0.0.1:4176')
uid = '00000000-0000-4000-8000-000000000041'
cid = '00000000-0000-4000-8000-000000000042'
now = int(time.time()*1000)
user = {'id': uid, 'name': 'Synthetic Admin', 'email': 'fixture@example.test', 'role': 'admin', 'revision': 0,
        'profile': {'firstName': 'Synthetic', 'lastName': 'Admin', 'patronymic': 'Test', 'birthDate': '2000-01-01'}}
collection = {'id': cid, 'draftId': cid, 'name': 'Synthetic test', 'questionCount': 45, 'opensAt': None,
              'closesAt': None, 'retired': 0, 'startEnabled': 1, 'availabilityRevision': 0,
              'createdAt': now, 'attempts': 2, 'completed': 1}
attempt = None
fail = False
mutations = []

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    def api(route):
        path = urlparse(route.request.url).path.removeprefix('/api/v1')
        if path == '/auth/me': route.fulfill(json={'user': user, 'csrfToken': 'a'*64})
        elif path == '/auth/config': route.fulfill(json={'googleEnabled': True})
        elif path.endswith('/availability'):
            assert route.request.method == 'POST'
            assert route.request.headers['x-csrf-token'] == 'a'*64
            body = route.request.post_data_json
            mutations.append(body)
            if fail: route.fulfill(status=409, json={'error': {'code': 'CONFLICT'}})
            else:
                assert body['revision'] == collection['availabilityRevision']
                collection.update(startEnabled=body['enabled'], availabilityRevision=body['revision']+1)
                route.fulfill(json=collection)
        elif path == '/staff/collections': route.fulfill(json={'items': [collection], 'next': None})
        elif path == '/exams/c_'+cid:
            route.fulfill(json={'id': 'c_'+cid, 'name': collection['name'], 'mode': 'mock', 'questionCount': 45,
                                'durationSeconds': None, 'opensAt': None, 'closesAt': None, 'startEnabled': bool(collection['startEnabled']),
                                'languages': ['uz', 'kaa'], 'attemptLanguage': attempt['language'] if attempt else None, 'attempt': attempt})
        else:
            assert route.request.method == 'GET', 'Unexpected mutation'
            route.fulfill(json={'items': [], 'next': None})
    context.route('**/api/v1/**', api)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base+'/admin')
    pause = page.get_by_role('button', name='Pauzaga qo‘yish: Synthetic test', exact=True)
    expect(pause).to_have_attribute('aria-pressed', 'true')
    pause.click()
    enable = page.get_by_role('button', name='Testni yoqish: Synthetic test', exact=True)
    expect(enable).to_have_attribute('aria-pressed', 'false')
    expect(page.get_by_text('Yangi urinishlar pauzada', exact=True)).to_be_visible()
    enable.click()
    expect(pause).to_be_enabled()
    assert mutations == [{'enabled': False, 'revision': 0}, {'enabled': True, 'revision': 1}]
    fail = True
    pause.click()
    expect(page.get_by_text('Holatni o‘zgartirib bo‘lmadi. Joriy holat yangilandi, qayta urinib ko‘ring.')).to_be_visible()
    expect(pause).to_be_enabled()
    fail = False
    pause.click()
    expect(enable).to_be_enabled()
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    out = Path('.worker-build/collection-availability')
    out.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(out/'admin-mobile.png'), full_page=True)
    user['role'] = 'teacher'
    page.reload()
    expect(page.get_by_role('heading', name='Test to‘plamlari', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Testni yoqish: Synthetic test', exact=True)).to_have_count(0)
    user['role'] = 'student'
    page.goto(base+'/tests/c_'+cid)
    page.get_by_role('radio', name='O‘zbekcha').check()
    expect(page.get_by_role('button', name='Boshlash yoki davom etish', exact=True)).to_be_disabled()
    expect(page.get_by_text('Yangi urinishlar pauzada. Admin testni ochishini kuting.')).to_be_visible()
    attempt = {'id': uid, 'state': 'active', 'language': 'uz'}
    page.reload()
    expect(page.get_by_role('button', name='Boshlash yoki davom etish', exact=True)).to_be_enabled()
    expect(page.get_by_text('Yangi urinishlar pauzada. Boshlangan testlarni davom ettirish mumkin.')).to_be_visible()
    assert not errors, errors
    browser.close()
print('PASS: admin play/pause, revision/CSRF payloads, errors, mobile, teacher restrictions, paused admission and active resume')
