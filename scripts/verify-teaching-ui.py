"""Actual teacher -> learner -> reviewer journey on isolated local Worker/D1.

Run after npm run build. Requires Python Playwright and installed Google Chrome.
Fixture sessions are inserted directly into disposable D1; OAuth is not bypassed
by any production endpoint. The regular local DB and cloud resources are unused.
"""
import hashlib
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import time
import urllib.request
import uuid
from datetime import datetime
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8789'
WRANGLER = ['node', str(ROOT / 'node_modules/wrangler/bin/wrangler.js')]
checks = 0


def check(name, condition):
    global checks
    assert condition, name
    checks += 1
    print('PASS: ' + name, flush=True)


def cleanup_fixture(folder):
    target = Path(folder).resolve()
    assert target.parent == Path(tempfile.gettempdir()).resolve() and target.name.startswith('hm-teaching-e2e-')
    for retry in range(30):
        try:
            shutil.rmtree(target)
            break
        except PermissionError:
            if retry == 29:
                raise
            time.sleep(0.5)


with tempfile.TemporaryDirectory(prefix='hm-teaching-e2e-') as folder:
    subprocess.run(WRANGLER + ['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', folder],
                   cwd=ROOT, input='y\n', encoding='utf-8', check=True, capture_output=True)
    now = int(time.time() * 1000)
    sql = []
    accounts = {}
    for key, role in [('teacher', 'teacher'), ('student', 'student'), ('other', 'teacher')]:
        user_id, token = str(uuid.uuid4()), secrets.token_hex(32)
        csrf = hashlib.sha256(('hm-csrf:' + token).encode()).hexdigest()
        accounts[key] = {'id': user_id, 'token': token, 'csrf': csrf}
        sql += [f"INSERT INTO users(id,display_name,email,role,created_at,updated_at) VALUES('{user_id}','Synthetic {key}','{key}@example.test','{role}',{now},{now});",
                f"INSERT INTO sessions(token_hash,user_id,csrf_hash,created_at,expires_at) VALUES('{hashlib.sha256(token.encode()).hexdigest()}','{user_id}','{hashlib.sha256(csrf.encode()).hexdigest()}',{now},{now+3600000});"]
    group_id = str(uuid.uuid4())
    sql += [f"INSERT INTO groups VALUES('{group_id}','Synthetic class','{accounts['teacher']['id']}',{now});",
            f"INSERT INTO group_teachers VALUES('{group_id}','{accounts['teacher']['id']}',{now});",
            f"INSERT INTO group_memberships VALUES('{group_id}','{accounts['student']['id']}','{accounts['teacher']['id']}',{now});"]
    file = Path(folder) / 'fixture.sql'
    file.write_text('\n'.join(sql), encoding='utf-8')
    subprocess.run(WRANGLER + ['d1', 'execute', 'DB', '--local', '--persist-to', folder, '--file', str(file)], cwd=ROOT, check=True, capture_output=True)
    with open(Path(folder) / 'worker.log', 'w', encoding='utf-8') as log:
        server = subprocess.Popen(WRANGLER + ['dev', '--local', '--port', '8789', '--persist-to', folder, '--var', 'APP_ORIGIN:' + BASE],
                                  cwd=ROOT, stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        try:
            for _ in range(120):
                try:
                    with urllib.request.urlopen(BASE + '/api/v1/ready', timeout=1) as response:
                        if response.status == 200:
                            break
                except Exception:
                    time.sleep(0.5)
            else:
                raise RuntimeError('Worker startup failed: ' + (Path(folder) / 'worker.log').read_text(encoding='utf-8'))
            with sync_playwright() as p:
                browser = p.chromium.launch(channel='chrome', headless=True)
                contexts, pages, errors = {}, {}, []
                for key, account in accounts.items():
                    context = browser.new_context(viewport={'width': 1366, 'height': 1000}, timezone_id='America/New_York')
                    context.add_cookies([{'name': 'hm_session', 'value': account['token'], 'url': BASE, 'httpOnly': True, 'sameSite': 'Lax'}])
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('dialog', lambda dialog: dialog.accept())
                    contexts[key], pages[key] = context, page
                teacher, student = pages['teacher'], pages['student']
                teacher.goto(BASE + '/admin/editor')
                teacher.get_by_role('radio', name='Yozma', exact=True).click()
                teacher.locator('#md').fill('Synthetic written question for the teacher workflow')
                teacher.locator('#explanation').fill('STAFF_RUNTIME_PRIVATE_EXPLANATION_9527')
                with teacher.expect_response(lambda response: response.url.endswith('/api/v1/staff/questions') and response.request.method == 'POST') as response:
                    teacher.get_by_test_id('save-draft').click()
                draft = response.value.json()
                expect(teacher.get_by_text('Draft serverda saqlandi.', exact=True)).to_be_visible()
                check('teacher saves a real question draft', response.value.status == 201)
                with teacher.expect_response(lambda response: response.url.endswith('/publish')) as response:
                    teacher.get_by_test_id('publish-draft').click()
                question_version = response.value.json()['versionId']
                check('teacher publishes an immutable question version', bool(question_version))
                teacher.goto(BASE + '/admin/editor/' + draft['id'])
                expect(teacher.locator('#explanation')).to_have_value('STAFF_RUNTIME_PRIVATE_EXPLANATION_9527')
                check('private authoring data reloads from the server', True)
                check('another teacher cannot read the private draft', contexts['other'].request.get(BASE + '/api/v1/staff/questions/' + draft['id']).status == 404)
                teacher.goto(BASE + '/admin/builder')
                teacher.locator('#tn').fill('Synthetic staff exam')
                teacher.locator('#duration').fill('60')
                expect(teacher.locator('.authoring-picks [role="checkbox"]')).to_have_count(1)
                teacher.locator('.authoring-picks [role="checkbox"]').click()
                with teacher.expect_response(lambda response: response.url.endswith('/api/v1/staff/tests') and response.request.method == 'POST') as response:
                    teacher.get_by_test_id('save-draft').click()
                test_draft = response.value.json()
                expect(teacher.get_by_text('Draft serverda saqlandi.', exact=True)).to_be_visible()
                teacher.get_by_test_id('publish-draft').click()
                expect(teacher.get_by_text('E’lon qilindi. Oldingi urinishlar o‘z versiyasida qoladi.', exact=True)).to_be_visible()
                check('builder saves and publishes a real test', response.value.status == 201)
                teacher.locator('#assign-group').select_option(group_id)
                opens_value = teacher.locator('#opens').input_value()
                with teacher.expect_response(lambda response: response.url.endswith('/api/v1/staff/assignments')) as response:
                    teacher.get_by_test_id('assign-test').click()
                assignment_id = response.value.json()['id']
                expect(teacher.get_by_text('Test guruhga biriktirildi.', exact=True)).to_be_visible()
                teacher.goto(BASE + '/admin')
                expect(teacher.get_by_text(re.compile('Synthetic class.*Asia/Tashkent'))).to_be_visible()
                check('assignment overview also labels the official Tashkent time zone', True)
                lobby = contexts['student'].request.get(BASE + '/api/v1/exams/a_' + assignment_id).json()
                check('Tashkent schedule is independent of the browser New York zone', lobby['opensAt'] == int(datetime.fromisoformat(opens_value + '+05:00').timestamp() * 1000))
                student.goto(BASE + '/tests/a_' + assignment_id)
                student.get_by_role('button', name='Boshlash yoki davom etish', exact=True).click()
                expect(student).to_have_url(re.compile('/exam/[a-f0-9-]+$'))
                attempt_id = student.url.rsplit('/', 1)[-1]
                expect(student.locator('textarea')).to_be_visible()
                check('learner receives safe question data without the private explanation', 'STAFF_RUNTIME_PRIVATE_EXPLANATION' not in student.locator('main').inner_text())
                student.locator('textarea').fill('Synthetic learner response')
                student.get_by_role('button', name='Testni yakunlash', exact=True).click()
                student.locator('[role="alertdialog"] .btn-primary').click()
                expect(student.get_by_text('Tekshiruvda: 1', exact=False)).to_be_visible()
                check('submitted written answer becomes a real provisional result', contexts['student'].request.get(BASE + '/api/v1/attempts/' + attempt_id).json()['result']['pending'] == 1)
                # Publishing a later model must not change the pinned attempt's manual model.
                teacher.goto(BASE + '/admin/editor/' + draft['id'])
                teacher.locator('#accepted').fill('Synthetic learner response')
                teacher.get_by_test_id('save-draft').click()
                expect(teacher.get_by_text('Draft serverda saqlandi.', exact=True)).to_be_visible()
                teacher.get_by_test_id('publish-draft').click()
                expect(teacher.get_by_text('E’lon qilindi. Oldingi urinishlar o‘z versiyasida qoladi.', exact=True)).to_be_visible()
                check('publishing a new question model leaves the old result provisional', contexts['student'].request.get(BASE + '/api/v1/attempts/' + attempt_id).json()['result']['pending'] == 1)
                teacher.goto(BASE + '/admin/grading?attempt=' + attempt_id)
                expect(teacher.get_by_role('radio', name='0.5', exact=True)).to_be_visible()
                teacher.get_by_role('radio', name='0.5', exact=True).click()
                teacher.locator('#review-note').fill('Core idea is partially present.')
                teacher.get_by_test_id('apply-review').click()
                expect(teacher.get_by_text('Baho saqlandi. O‘quvchi natijasi yangilandi.', exact=True)).to_be_visible()
                result = contexts['student'].request.get(BASE + '/api/v1/attempts/' + attempt_id).json()
                check('half-point review updates the learner result', result['result']['units'] == 1 and result['result']['final'])
                check('group answer keys remain hidden before assignment close', result['feedback'] == {})
                teacher.get_by_role('radio', name='1', exact=True).click()
                teacher.locator('#review-note').fill('Reviewed correction to full credit.')
                with teacher.expect_response(lambda response: response.url.endswith('/api/v1/staff/reviews/' + attempt_id) and response.request.method == 'POST') as response:
                    teacher.get_by_test_id('apply-review').click()
                corrected = response.value.json()
                check('deliberate regrade increments the review revision', corrected['revision'] == 2 and corrected['result']['units'] == 2)
                check('unrelated teachers cannot inspect submitted answers', contexts['other'].request.get(BASE + '/api/v1/staff/reviews/' + attempt_id).status == 404)
                check('students cannot call staff grading endpoints', contexts['student'].request.get(BASE + '/api/v1/staff/reviews/' + attempt_id).status == 403)
                student.reload()
                expect(student.get_by_text('1 / 1', exact=True)).to_be_visible()
                check('learner reload displays the corrected final result', True)
                check('teacher/student browser flow has no uncaught exceptions', not errors)
                browser.close()
        finally:
            if os.name == 'nt':
                subprocess.run(['taskkill', '/PID', str(server.pid), '/T', '/F'], capture_output=True)
            else:
                server.terminate()
            try:
                server.wait(timeout=15)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=10)
            log.close()
            cleanup_fixture(folder)
print(f'{checks} teacher/learner Worker/D1 browser checks passed. Temporary data removed.')
