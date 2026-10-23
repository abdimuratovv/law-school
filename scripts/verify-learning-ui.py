"""Actual CSV/XLSX -> learner -> learning report journey on isolated local Worker/D1.

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
BASE = 'http://127.0.0.1:8790'
WRANGLER = ['node', str(ROOT / 'node_modules/wrangler/bin/wrangler.js')]
checks = 0


def check(name, condition):
    global checks
    assert condition, name
    checks += 1
    print('PASS: ' + name, flush=True)


def cleanup_fixture(folder):
    target = Path(folder).resolve()
    assert target.parent == Path(tempfile.gettempdir()).resolve() and target.name.startswith('hm-learning-e2e-')
    for retry in range(30):
        try:
            shutil.rmtree(target)
            break
        except PermissionError:
            if retry == 29:
                raise
            time.sleep(0.5)


with tempfile.TemporaryDirectory(prefix='hm-learning-e2e-') as folder:
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
        server = subprocess.Popen(WRANGLER + ['dev', '--local', '--port', '8790', '--persist-to', folder, '--var', 'APP_ORIGIN:' + BASE],
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
                def post(who, path, body):
                    response = contexts[who].request.post(BASE + '/api/v1' + path, data=body, headers={'Origin': BASE, 'X-CSRF-Token': accounts[who]['csrf']})
                    assert response.ok, (path, response.status, response.text())
                    return response.json()

                header = 'kind,topic,stem,A,B,C,D,correct,accepted,explanation,terms,defs,legal_label,legal_url'
                row = 'written,theory,Synthetic imported written question,,,,,,example,CSV_RUNTIME_PRIVATE_MODEL,,,,'
                csv = (header + '\n' + row + '\n' + row + '\n').encode()
                teacher.goto(BASE + '/admin/import')
                teacher.locator('input[type=file]').set_input_files({'name': 'questions.csv', 'mimeType': 'text/csv', 'buffer': csv})
                expect(teacher.locator('tbody tr')).to_have_count(2)
                check('CSV is parsed in the actual browser worker before any draft write', contexts['teacher'].request.get(BASE + '/api/v1/staff/questions').json()['items'] == [])
                teacher.get_by_role('button', name='Draft sifatida import qilish', exact=True).click()
                expect(teacher.locator('[role=status]').last).to_contain_text('Import yakunlandi')
                check('duplicate CSV rows create one real unpublished draft', len(contexts['teacher'].request.get(BASE + '/api/v1/staff/questions').json()['items']) == 1 and contexts['teacher'].request.get(BASE + '/api/v1/staff/question-versions').json()['items'] == [])
                teacher.reload()
                teacher.locator('input[type=file]').set_input_files({'name': 'questions.csv', 'mimeType': 'text/csv', 'buffer': csv})
                expect(teacher.locator('tbody tr')).to_have_count(2)
                teacher.get_by_role('button', name='Draft sifatida import qilish', exact=True).click()
                expect(teacher.locator('[role=status]').last).to_contain_text('Import yakunlandi')
                check('reselecting the same file resumes the completed job without duplication', len(contexts['teacher'].request.get(BASE + '/api/v1/staff/imports').json()['items']) == 1 and len(contexts['teacher'].request.get(BASE + '/api/v1/staff/questions').json()['items']) == 1)
                teacher.locator('input[type=file]').set_input_files({'name': 'invalid.csv', 'mimeType': 'text/csv', 'buffer': (header + '\n' + row.replace('written,theory', 'wrong,invalid')).encode()})
                expect(teacher.get_by_role('button', name='Draft sifatida import qilish', exact=True)).to_be_disabled()
                check('invalid row preview prevents import', teacher.locator('[role=alert]').count() == 1)
                xlsx_file = Path(folder) / 'fixture.xlsx'
                subprocess.run(['node', '--input-type=module', '-e', "import * as X from 'xlsx';import {writeFileSync} from 'node:fs';const b=X.utils.book_new();X.utils.book_append_sheet(b,X.utils.aoa_to_sheet([['kind','topic','stem','A','B','C','D','correct','accepted','explanation','terms','defs','legal_label','legal_url'],['single','theory','Synthetic imported choice','ALPHA','BETA','GAMMA','DELTA','A','','XLSX_RUNTIME_PRIVATE_MODEL','','','','']]),'Questions');writeFileSync(process.argv[1],X.write(b,{type:'buffer',bookType:'xlsx'}));", str(xlsx_file)], cwd=ROOT, check=True, capture_output=True)
                teacher.locator('input[type=file]').set_input_files(str(xlsx_file))
                expect(teacher.locator('tbody tr')).to_have_count(1)
                teacher.get_by_role('button', name='Draft sifatida import qilish', exact=True).click()
                expect(teacher.locator('[role=status]').last).to_contain_text('Import yakunlandi')
                drafts = contexts['teacher'].request.get(BASE + '/api/v1/staff/questions').json()['items']
                check('actual XLSX workbook creates a canonical choice draft', len(drafts) == 2 and any(d['content']['correctOptionId'] == 'o1' for d in drafts))
                versions = {d['content']['kind']: post('teacher', '/staff/questions/' + d['id'] + '/publish', {'revision': 0})['versionId'] for d in drafts}
                test_id = str(uuid.uuid4())
                post('teacher', '/staff/tests', {'operationId': test_id, 'content': {'name': 'Imported controls practice', 'mode': 'practice', 'durationSeconds': None, 'questionVersionIds': [versions['written'], versions['single']], 'isPublic': True}})
                version_id = post('teacher', '/staff/tests/' + test_id + '/publish', {'revision': 0})['versionId']
                student.goto(BASE + '/tests/p_' + version_id)
                student.get_by_role('button', name='Boshlash yoki davom etish', exact=True).click()
                expect(student).to_have_url(re.compile('/exam/[a-f0-9-]+$'))
                attempt_id = student.url.rsplit('/', 1)[-1]
                check('published imported content reaches learner without private models', 'PRIVATE_MODEL' not in student.locator('main').inner_text())
                # Use the ordinary authorized API to submit a deterministic pair of wrong answers.
                a = contexts['student'].request.get(BASE + '/api/v1/attempts/' + attempt_id).json()
                result = post('student', '/attempts/' + attempt_id + '/submit', {'operationId': str(uuid.uuid4()), 'revision': a['revision'], 'answers': {versions['written']: 'completely different response', versions['single']: 'o2'}, 'flags': []})
                check('imported answers are graded server-side into a real final report', result['result']['units'] == 0 and result['result']['final'])
                student.reload()
                expect(student.get_by_role('button', name='Savolni saqlash', exact=True)).to_be_visible()
                student.get_by_role('button', name='Savolni saqlash', exact=True).click()
                expect(student.get_by_role('button', name='Savol saqlandi', exact=True)).to_be_disabled()
                check('released question can be bookmarked from exam feedback', len(contexts['student'].request.get(BASE + '/api/v1/saved-questions').json()['items']) == 1)
                student.goto(BASE + '/mistakes')
                expect(student.locator('article')).to_have_count(2)
                check('mistakes show actual released imported questions', all('Synthetic imported' in x for x in student.locator('article h2').all_text_contents()))
                student.get_by_role('radio', name='Saqlangan savollar', exact=True).click()
                expect(student.locator('article')).to_have_count(1)
                student.reload()
                student.get_by_role('radio', name='Saqlangan savollar', exact=True).click()
                expect(student.locator('article')).to_have_count(1)
                check('bookmarks survive a real page reload', True)
                student.get_by_role('button', name='Saqlangan savolni o‘chirish', exact=True).click()
                expect(student.locator('article')).to_have_count(0)
                check('bookmark removal persists on the server', contexts['student'].request.get(BASE + '/api/v1/saved-questions').json()['items'] == [])
                student.goto(BASE + '/progress')
                expect(student.locator('article')).to_have_count(1)
                check('progress presents the actual completed attempt and score', contexts['student'].request.get(BASE + '/api/v1/progress').json()['summary']['averagePercent'] == 0)
                student.locator('form select').first.select_option('mock')
                student.get_by_role('button', name='Filtrlarni qo‘llash', exact=True).click()
                expect(student.locator('article')).to_have_count(0)
                check('progress filters are applied by the server', True)
                student.goto(BASE + '/history')
                expect(student.locator('article')).to_have_count(1)
                check('complete attempt history remains available separately', True)
                assignment_id = str(uuid.uuid4())
                def local_time(seconds):
                    return datetime.fromtimestamp(seconds + 5*3600, __import__('datetime').timezone.utc).strftime('%Y-%m-%dT%H:%M:00+05:00')
                post('teacher', '/staff/assignments', {'operationId': assignment_id, 'testVersionId': version_id, 'groupId': group_id, 'timeZone': 'Asia/Tashkent', 'opensAt': local_time(time.time()-120), 'closesAt': local_time(time.time()+3600)})
                a = post('student', '/exams/a_' + assignment_id + '/start', {'operationId': str(uuid.uuid4())})
                post('student', '/attempts/' + a['id'] + '/submit', {'operationId': str(uuid.uuid4()), 'revision': a['revision'], 'answers': {versions['written']: 'example', versions['single']: 'o2'}, 'flags': []})
                teacher.goto(BASE + '/admin/analytics')
                teacher.locator('main select').first.select_option(assignment_id)
                expect(teacher.get_by_text('50%', exact=True)).to_be_visible()
                check('staff analytics summarize the selected real assignment', True)
                check('unrelated teachers cannot read assignment analytics', contexts['other'].request.get(BASE + '/api/v1/staff/analytics?assignmentId=' + assignment_id).status == 404)
                check('group pre-close mistakes do not leak through reports', len(contexts['student'].request.get(BASE + '/api/v1/mistakes').json()['items']) == 2)
                check('all import/report browser flows finish without uncaught exceptions', not errors)
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
print(f'{checks} import/report Worker/D1 browser checks passed. Temporary data removed.')
