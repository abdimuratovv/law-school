"""Browser checks for the completed-test report, using only synthetic API data."""
import copy
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('EXAM_UI_BASE', 'http://127.0.0.1:4176')
out = Path('.worker-build/result-overview')
out.mkdir(parents=True, exist_ok=True)
uid = '00000000-0000-4000-8000-000000000041'
now = int(time.time() * 1000)
user = {'id': uid, 'name': 'Synthetic Student', 'email': 'fixture@example.test', 'role': 'student', 'revision': 0,
        'profile': {'firstName': 'Synthetic', 'lastName': 'Student', 'patronymic': 'Test', 'birthDate': '2000-01-01'}}
questions = [{'id': f'q{n}', 'kind': 'single', 'topic': 'constitutional',
              'stem': f'{n}. Konstitutsiyaga ko‘ra, davlat hokimiyatining bo‘linishi prinsipi qaysi tarmoqlarni o‘z ichiga oladi?',
              'options': [{'id': k, 'text': v} for k, v in [('a', 'Qonun chiqaruvchi, ijro etuvchi va sud hokimiyati'), ('b', 'Faqat ijro etuvchi hokimiyat'), ('c', 'Faqat sud hokimiyati'), ('d', 'Mahalliy hokimiyat')]]} for n in range(1, 46)]
baseline = {'id': uid, 'examId': 'c_fixture', 'name': 'Huquq mock test 1', 'mode': 'mock', 'language': 'uz',
            'state': 'final', 'revision': 1, 'startedAt': now, 'endsAt': None, 'savedAt': now, 'serverNow': now,
            'snapshot': {'answers': {f'q{n}': 'a' if n <= 9 else 'b' for n in range(1, 36)}, 'flags': []},
            'questions': questions, 'checked': [], 'feedback': {},
            'answerCounts': {'correct': 9, 'incorrect': 26, 'partial': 0, 'pending': 0, 'unanswered': 10},
            'result': {'units': 18, 'maxUnits': 90, 'pending': 0, 'final': True, 'algorithm': 'fixture'}}
for n in range(1, 46):
    verdict = 'correct' if n <= 9 else 'incorrect' if n <= 35 else 'unanswered'
    baseline['feedback'][f'q{n}'] = {'verdict': verdict, 'units': 2 if verdict == 'correct' else 0,
                                  'correctOptionId': 'a', 'accepted': [], 'explanation': 'Synthetic published explanation.'}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1100})
    current = copy.deepcopy(baseline)
    errors = []
    def api(route):
        path = urlparse(route.request.url).path.removeprefix('/api/v1')
        assert route.request.method == 'GET', 'Result browsing must not mutate an attempt'
        if path == '/auth/me':
            route.fulfill(json={'user': user, 'csrfToken': 'a' * 64})
        elif path == '/auth/config':
            route.fulfill(json={'googleEnabled': True})
        elif path.startswith('/attempts/'):
            route.fulfill(json=current)
        else:
            route.fulfill(json={'items': [], 'next': None})
    context.route('**/api/v1/**', api)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    def load():
        page.goto(base + '/results/' + uid)
        page.wait_for_load_state('networkidle')
        expect(page.locator('.result-report')).to_be_visible()
    def fits():
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
    load()
    expect(page.get_by_role('heading', name='Natijangiz tayyor')).to_be_visible()
    expect(page.locator('.result-score-numbers strong')).to_have_text('9')
    expect(page.locator('.result-ring-value strong')).to_have_text('20%')
    expect(page.locator('.result-question-map button')).to_have_count(45)
    expect(page.locator('.result-question-detail')).to_have_count(0)
    expect(page.get_by_role('textbox')).to_have_count(0)
    fits()
    page.screenshot(path=str(out / 'desktop-light.png'), full_page=True)
    incorrect = page.locator('.result-outcome.result-tone-incorrect')
    incorrect.focus()
    page.keyboard.press('Enter')
    expect(incorrect).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('.result-ring-value strong')).to_have_text('58%')
    expect(page.locator('.result-question-map button:visible')).to_have_count(26)
    page.locator('.result-question-map button:visible').first.click()
    expect(page.locator('.result-question-detail h3')).to_have_text('Savol 10 / 45')
    expect(page.locator('.result-correct-answer')).to_contain_text('Qonun chiqaruvchi')
    expect(page.locator('.result-feedback')).to_contain_text('Synthetic published explanation.')
    # Toggle off a chart category and check unanswered questions remain accessible.
    incorrect.click()
    page.locator('.result-outcome.result-tone-unanswered').click()
    expect(page.locator('.result-question-map button:visible')).to_have_count(10)
    page.locator('.result-question-map button:visible').first.click()
    expect(page.locator('.result-answer-detail').first).to_contain_text('Javob berilmagan')
    for width in [390, 320]:
        page.set_viewport_size({'width': width, 'height': 844})
        load()
        fits()
        page.screenshot(path=str(out / f'mobile-{width}-light.png'), full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 1100})
    page.evaluate("localStorage.setItem('hm.theme', JSON.stringify('dark'))")
    page.evaluate("localStorage.setItem('hm.language', 'kaa')")
    load()
    expect(page.get_by_role('heading', name='Nátiyjeńiz tayar')).to_be_visible()
    fits()
    page.screenshot(path=str(out / 'desktop-dark-kaa.png'), full_page=True)
    page.emulate_media(reduced_motion='reduce')
    load()
    assert page.locator('.result-seal-check').evaluate('(el)=>getComputedStyle(el).animationName') == 'none'
    page.evaluate("localStorage.setItem('hm.language', 'uz')")
    current = copy.deepcopy(baseline)
    current['feedback'] = {}
    current['result'].update({'units': 15, 'pending': 1, 'final': False})
    current['answerCounts'].update({'correct': 7, 'partial': 1, 'pending': 1})
    load()
    expect(page.get_by_role('heading', name='Dastlabki ball')).to_be_visible()
    expect(page.locator('.result-score-numbers strong')).to_have_text('7.5')
    expect(page.locator('.result-question.result-tone-correct')).to_have_count(0)
    page.locator('.result-outcome.result-tone-pending').click()
    expect(page.locator('.result-question-map button:visible')).to_have_count(45)
    page.locator('.result-question-map button').first.click()
    expect(page.locator('.result-correct-answer')).to_have_count(0)
    expect(page.locator('.result-feedback')).to_have_count(0)
    expect(page.locator('.result-answer-detail')).to_contain_text('Qonun chiqaruvchi')
    # Final aggregate grades may be known while detailed answers are still withheld.
    current = copy.deepcopy(baseline)
    current['feedback'] = {}
    load()
    page.locator('.result-outcome.result-tone-incorrect').click()
    expect(page.locator('.result-question-map button:visible')).to_have_count(45)
    expect(page.locator('.result-question.result-tone-incorrect')).to_have_count(0)
    current = copy.deepcopy(baseline)
    current['state'] = 'submitted'
    current['result'] = None
    current['feedback'] = {}
    del current['answerCounts']
    load()
    expect(page.locator('.result-score-numbers strong')).to_have_text('—')
    expect(page.locator('.result-report')).not_to_contain_text('NaN')
    current = copy.deepcopy(baseline)
    current['result']['units'] = 0
    load()
    expect(page.locator('.result-ring-value strong')).to_have_text('0%')
    current['result']['units'] = 90
    load()
    expect(page.locator('.result-ring-value strong')).to_have_text('100%')
    assert not errors, errors
    browser.close()
print('PASS: completed result, score, keyboard chart filtering, read-only review, mobile, dark/kaa, reduced motion, provisional/withheld grades, zero/full scores')
