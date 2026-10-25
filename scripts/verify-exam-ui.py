"""Real local Worker/D1 exam checks, using an isolated temporary database.

Run after npm run build. Requires Python Playwright and installed Chrome.
No Google/network provider, production DB, test-auth HTTP route or deployment.
The fixture session is inserted directly into the disposable local database.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import tempfile
import time
import urllib.request
import uuid
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8788'
WRANGLER = ['node', str(ROOT / 'node_modules/wrangler/bin/wrangler.js')]
checks = 0


def check(name, value):
    global checks
    assert value, name
    checks += 1
    print('PASS: ' + name, flush=True)


def sql_execute(sql, folder):
    path = Path(folder) / 'fixture.sql'
    path.write_text(sql, encoding='utf-8')
    subprocess.run(WRANGLER + ['d1', 'execute', 'DB', '--local', '--persist-to', folder,
                              '--file', str(path)], cwd=ROOT, check=True, capture_output=True)


with tempfile.TemporaryDirectory(prefix='hm-exam-e2e-') as folder:
    subprocess.run(WRANGLER + ['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', folder],
                   cwd=ROOT, input='y\n', text=True, encoding='utf-8', check=True, capture_output=True)
    user_id = str(uuid.uuid4())
    token = secrets.token_hex(32)
    csrf = hashlib.sha256(('hm-csrf:' + token).encode()).hexdigest()
    now = int(time.time() * 1000)
    admin_id, admin_token = str(uuid.uuid4()), secrets.token_hex(32)
    admin_csrf = hashlib.sha256(('hm-csrf:' + admin_token).encode()).hexdigest()
    language_collection, uz_version, kaa_version = (str(uuid.uuid4()) for _ in range(3))
    uz_draft, kaa_draft = str(uuid.uuid4()), str(uuid.uuid4())
    sql_execute((ROOT / 'server/fixtures/local-exam.sql').read_text(encoding='utf-8') + f"""
      INSERT INTO users(id,display_name,email,created_at,updated_at) VALUES('{user_id}','Exam Learner','exam@example.test',{now},{now});
      UPDATE users SET first_name='Exam',last_name='Learner',patronymic='Fixture',birth_date='2000-01-01',profile_completed_at={now} WHERE id='{user_id}';
      INSERT INTO sessions(token_hash,user_id,csrf_hash,created_at,expires_at) VALUES(
        '{hashlib.sha256(token.encode()).hexdigest()}','{user_id}','{hashlib.sha256(csrf.encode()).hexdigest()}',{now},{now+3600000});
      INSERT INTO users(id,display_name,email,role,created_at,updated_at,first_name,last_name,patronymic,birth_date,profile_completed_at)
        VALUES('{admin_id}','Language Admin','language-admin@example.test','admin',{now},{now},'Language','Admin','Fixture','2000-01-01',{now});
      INSERT INTO sessions(token_hash,user_id,csrf_hash,created_at,expires_at) VALUES(
        '{hashlib.sha256(admin_token.encode()).hexdigest()}','{admin_id}','{hashlib.sha256(admin_csrf.encode()).hexdigest()}',{now},{now+3600000});
      INSERT INTO question_versions VALUES('language-uz-q','{{"question":{{"id":"language-uz-q","kind":"written","topic":"theory","stem":"O‘zbekcha fixture savoli"}},"accepted":["salom"],"explanation":"Synthetic"}}',{now});
      INSERT INTO question_versions VALUES('language-kaa-q','{{"question":{{"id":"language-kaa-q","kind":"written","topic":"theory","stem":"Qaraqalpaqsha fixture sorawı"}},"accepted":["sálem"],"explanation":"Synthetic"}}',{now});
      INSERT INTO test_versions VALUES('{uz_version}','Bilingual fixture','mock',86400,'["language-uz-q"]',0,{now});
      INSERT INTO test_versions VALUES('{kaa_version}','Bilingual fixture','mock',86400,'["language-kaa-q"]',0,{now});
      INSERT INTO test_drafts(id,owner_id,content,created_at,updated_at) VALUES('{uz_draft}','{admin_id}','{{}}',{now},{now});
      INSERT INTO test_drafts(id,owner_id,content,created_at,updated_at) VALUES('{kaa_draft}','{admin_id}','{{}}',{now},{now});
      INSERT INTO test_publications(test_id,draft_revision,version_id,created_at) VALUES('{kaa_draft}',0,'{kaa_version}',{now});
      INSERT INTO test_collections(id,test_id,test_version_id,owner_id,created_at) VALUES('{language_collection}','{uz_draft}','{uz_version}','{admin_id}',{now});
    """, folder)
    with open(Path(folder) / 'worker.log', 'w', encoding='utf-8') as log:
        server = subprocess.Popen(WRANGLER + ['dev', '--local', '--port', '8788', '--persist-to', folder,
                                             '--var', 'APP_ORIGIN:' + BASE], cwd=ROOT, stdout=log, stderr=log,
                                  creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        try:
            for _ in range(120):
                try:
                    with urllib.request.urlopen(BASE + '/api/v1/ready', timeout=1) as response:
                        if response.status == 200:
                            break
                except Exception:
                    time.sleep(0.5)
            else:
                raise RuntimeError('Local Worker failed to start. ' + (Path(folder) / 'worker.log').read_text(encoding='utf-8'))
            with sync_playwright() as p:
                browser = p.chromium.launch(channel='chrome', headless=True)
                context = browser.new_context(viewport={'width': 1366, 'height': 900})
                context.add_cookies([{'name': 'hm_session', 'value': token, 'url': BASE, 'httpOnly': True, 'sameSite': 'Lax'}])
                errors = []
                context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
                page = context.new_page()
                page.goto(BASE + '/tests')
                page.wait_for_load_state('networkidle')
                page.locator('a[href="/tests/p_local-controls-v1"]').click()
                page.get_by_role('button', name='Boshlash yoki davom etish', exact=True).click()
                expect(page).to_have_url(__import__('re').compile('/exam/[a-f0-9-]+$'))
                attempt_id = page.url.rsplit('/', 1)[-1]
                check('real D1 attempt uses server-generated UUID', str(uuid.UUID(attempt_id)) == attempt_id)
                api = context.request
                data = api.get(BASE + '/api/v1/attempts/' + attempt_id).json()
                check('active API response hides keys and explanations', data['feedback'] == {} and 'LOCAL_ONLY_EXPLANATION' not in json.dumps(data))
                choice_index = next(i for i, q in enumerate(data['questions']) if q['kind'] == 'single')
                written_index = next(i for i, q in enumerate(data['questions']) if q['kind'] == 'written')

                def go_question(index):
                    page.locator('button[aria-label^="Savol "]').nth(index).click()

                go_question(choice_index)
                page.get_by_role('radio').filter(has_text='SERVER').click()
                with page.expect_response(lambda response: response.url.endswith('/save-changes')) as acknowledgement:
                    page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                ack = acknowledgement.value
                check('browser autosave uses a compact acknowledgement', ack.status == 200 and len(ack.body()) < 250 and 'questions' not in ack.json())
                expect(page.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                saved = api.get(BASE + '/api/v1/attempts/' + attempt_id).json()
                check('manual sync persists answer in real D1', saved['snapshot']['answers']['local-choice-v1'] == 'server-option')
                page.reload()
                expect(page.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                go_question(choice_index)
                expect(page.get_by_role('radio').filter(has_text='SERVER')).to_have_attribute('aria-checked', 'true')
                check('acknowledged answer survives browser reload', True)
                page.get_by_role('button', name='Javobni tekshirish', exact=True).click()
                expect(page.get_by_text('LOCAL_ONLY_EXPLANATION_7319', exact=False)).to_be_visible()
                expect(page.get_by_role('radio').first).to_be_disabled()
                check('server practice check reveals feedback and locks the answer', True)
                go_question(written_index)
                context.set_offline(True)
                page.locator('textarea').fill('saqlandi')
                expect(page.get_by_text('O‘zgarishlar serverga yuborilishni kutmoqda.', exact=True)).to_be_visible()
                page.wait_for_timeout(500)
                check('offline edits do not claim a server save', not page.get_by_text('Serverda saqlandi', exact=True).count())
                context.set_offline(False)
                expect(page.get_by_text('Serverda saqlandi', exact=True)).to_be_visible(timeout=20000)
                check('reconnection flushes the IndexedDB draft', api.get(BASE + '/api/v1/attempts/' + attempt_id).json()['snapshot']['answers']['local-written-v1'] == 'saqlandi')
                # Drop the acknowledgement after D1 has committed: replay must use the same operation.
                dropped = {'once': False}

                def drop_ack(route):
                    if not dropped['once']:
                        dropped['once'] = True
                        route.fetch()
                        route.abort()
                    else:
                        route.continue_()

                pattern = '**/api/v1/attempts/' + attempt_id + '/save-changes'
                context.route(pattern, drop_ack)
                page.locator('textarea').fill('uncertain saved draft')
                page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(page.get_by_text('Serverga saqlab bo‘lmadi. Mahalliy draft yuborilishni kutmoqda.', exact=True)).to_be_visible()
                committed_revision = api.get(BASE + '/api/v1/attempts/' + attempt_id).json()['revision']
                page.reload()
                expect(page.locator('textarea')).to_have_value('uncertain saved draft')
                page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(page.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                check('lost acknowledgement replays from IndexedDB after reload without a second revision', api.get(BASE + '/api/v1/attempts/' + attempt_id).json()['revision'] == committed_revision)
                dropped['once'] = False
                page.locator('textarea').fill('another uncertain save')
                page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(page.get_by_text('Serverga saqlab bo‘lmadi. Mahalliy draft yuborilishni kutmoqda.', exact=True)).to_be_visible()
                page.locator('textarea').fill('extra unsynced local edits')
                other_device = api.get(BASE + '/api/v1/attempts/' + attempt_id).json()
                other_snapshot = other_device['snapshot']
                other_snapshot['answers']['local-written-v1'] = 'other device saved'
                response = api.post(BASE + '/api/v1/attempts/' + attempt_id + '/save',
                                    headers={'Origin': BASE, 'X-CSRF-Token': csrf},
                                    data={**other_snapshot, 'revision': other_device['revision'], 'operationId': str(uuid.uuid4())})
                assert response.status == 200
                page.wait_for_timeout(200)
                page.reload()
                expect(page.locator('textarea')).to_have_value('extra unsynced local edits')
                page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(page.get_by_text('Boshqa tab ushbu urinishni o‘zgartirdi.', exact=True)).to_be_visible()
                check('uncertain retry never rebases extra local edits over a newer device revision', api.get(BASE + '/api/v1/attempts/' + attempt_id).json()['snapshot']['answers']['local-written-v1'] == 'other device saved')
                page.get_by_role('button', name='Serverdagi nusxani olish', exact=True).click()
                expect(page.locator('textarea')).to_have_value('other device saved')
                context.unroute(pattern, drop_ack)
                page.locator('textarea').fill('saqlandi')
                page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(page.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                # Two real tabs read one revision; the loser must require an explicit choice.
                second = context.new_page()
                second.goto(BASE + '/exam/' + attempt_id)
                expect(second.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                go_question(written_index)
                page.locator('textarea').fill('changed first tab')
                page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(page.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                second.locator('textarea').fill('other tab draft')
                second.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(second.get_by_text('Boshqa tab ushbu urinishni o‘zgartirdi.', exact=True)).to_be_visible()
                check('stale tab cannot silently overwrite server answers', api.get(BASE + '/api/v1/attempts/' + attempt_id).json()['snapshot']['answers']['local-written-v1'] == 'changed first tab')
                second.get_by_role('button', name='Serverdagi nusxani olish', exact=True).click()
                expect(second.locator('textarea')).to_have_value('changed first tab')
                second.locator('textarea').fill('saqlandi')
                second.get_by_role('button', name='Hozir saqlash', exact=True).click()
                expect(second.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                page.close(run_before_unload=False)
                second.get_by_role('button', name='Testni yakunlash', exact=True).click()
                second.locator('[role="alertdialog"] .btn-primary').click()
                expect(second.get_by_text('2 / 2', exact=True)).to_be_visible()
                result = api.get(BASE + '/api/v1/attempts/' + attempt_id).json()
                check('server grades both questions and freezes submitted answers', result['state'] == 'final' and result['result']['units'] == 4)
                second.goto(BASE + '/progress')
                expect(second.locator('article')).to_contain_text('2 / 2')
                check('history reads the actual submitted result', True)
                check('browser exam flow has no uncaught errors', not errors)
                admin_context = browser.new_context(viewport={'width': 1366, 'height': 900})
                admin_context.add_cookies([{'name': 'hm_session', 'value': admin_token, 'url': BASE, 'httpOnly': True, 'sameSite': 'Lax'}])
                attached = admin_context.request.post(BASE + '/api/v1/staff/collections/' + language_collection + '/languages',
                    headers={'Origin': BASE, 'X-CSRF-Token': admin_csrf}, data={'language': 'kaa', 'testVersionId': kaa_version})
                check('staff attaches a translation to the same collection', attached.status == 200)
                language_page = context.new_page()
                language_attempts = {}
                for code, label, answer, stem in [('kaa', 'Qaraqalpaqsha', 'sálem', 'Qaraqalpaqsha fixture sorawı'), ('uz', 'O‘zbekcha', 'salom', 'O‘zbekcha fixture savoli')]:
                    language_page.goto(BASE + '/tests/c_' + language_collection)
                    language_page.wait_for_load_state('networkidle')
                    start_button = language_page.get_by_role('button', name='Boshlash yoki davom etish', exact=True)
                    expect(start_button).to_be_disabled()
                    language_page.get_by_role('radio', name=label, exact=True).check()
                    start_button.click()
                    expect(language_page).to_have_url(__import__('re').compile('/exam/[a-f0-9-]+$'))
                    attempt = language_page.url.rsplit('/', 1)[-1]
                    language_attempts[code] = attempt
                    expect(language_page.locator('p.body')).to_have_text(stem)
                    expect(language_page.locator('p.body')).to_have_attribute('lang', code)
                    if code == 'kaa':
                        language_page.evaluate("localStorage.setItem('hm.language','ru')")
                        language_page.reload()
                        expect(language_page.locator('p.body')).to_have_text(stem)
                        language_page.evaluate("localStorage.setItem('hm.language','uz')")
                        language_page.reload()
                        expect(language_page.locator('textarea')).to_be_visible()
                        language_page.goto(BASE + '/tests/c_' + language_collection)
                        expect(language_page.get_by_role('radio', name='Qaraqalpaqsha', exact=True)).to_be_checked()
                        expect(language_page.get_by_role('radio', name='O‘zbekcha', exact=True)).to_be_disabled()
                        language_page.get_by_role('button', name='Boshlash yoki davom etish', exact=True).click()
                        expect(language_page).to_have_url(BASE + '/exam/' + attempt)
                        check('resume pins question language independently of interface language', True)
                    language_page.locator('textarea').fill(answer)
                    language_page.get_by_role('button', name='Hozir saqlash', exact=True).click()
                    expect(language_page.get_by_text('Serverda saqlandi', exact=True)).to_be_visible()
                    data = api.get(BASE + '/api/v1/attempts/' + attempt).json()
                    check(code + ' questions and saved attempt retain selected language', data['language'] == code and data['questions'][0]['stem'] == stem)
                    submitted = api.post(BASE + '/api/v1/attempts/' + attempt + '/submit', headers={'Origin': BASE, 'X-CSRF-Token': csrf},
                        data={**data['snapshot'], 'revision': data['revision'], 'operationId': str(uuid.uuid4())})
                    check(code + ' grades with its own language answer key', submitted.status == 200 and submitted.json()['result']['units'] == 2)
                admin_page = admin_context.new_page()
                admin_page.goto(BASE + '/admin/results?collection=' + language_collection)
                expect(admin_page.get_by_role('columnheader', name='Test tili', exact=True)).to_be_visible()
                expect(admin_page.locator('tbody tr')).to_have_count(2)
                expect(admin_page.locator('tbody')).to_contain_text('Qaraqalpaqsha')
                expect(admin_page.locator('tbody')).to_contain_text('O‘zbekcha')
                check('admin sees language for both attempts in one collection', True)
                admin_page.goto(BASE + '/admin/results?attempt=' + language_attempts['kaa'])
                expect(admin_page.get_by_text('Test tili: Qaraqalpaqsha', exact=True)).to_be_visible()
                check('admin grading view also identifies question language', True)
                check('bilingual browser flow has no uncaught errors', not errors)
                # Exercise authoring through the real UI, not only the variant-attachment API.
                headers = {'Origin': BASE, 'X-CSRF-Token': admin_csrf}
                for code in ['uz', 'kaa']:
                    metadata = {'operationId': str(uuid.uuid4()), 'filename': code + '-authoring.csv', 'bytes': 100,
                        'totalRows': 2, 'fileHash': hashlib.sha256(('authoring-' + code).encode()).hexdigest(), 'duplicatePolicy': 'keep', 'language': code}
                    created = admin_context.request.post(BASE + '/api/v1/staff/imports', headers=headers, data=metadata)
                    check(code + ' import accepts explicit language', created.status == 201)
                    job_id = created.json()['id']
                    rows = [{'rowNumber': i + 2, 'content': {'kind': 'written', 'topic': 'theory', 'stem': code + ' authoring ' + str(i),
                        'options': [{'id': key, 'text': ''} for key in ['a','b','c','d']], 'correctOptionId': None,
                        'accepted': ['fixture'], 'explanation': ''}} for i in range(2)]
                    for suffix, body in [('rows', {'rows': rows}), ('validate', {'cursor': 1}), ('commit', {'cursor': 1})]:
                        r = admin_context.request.post(BASE + '/api/v1/staff/imports/' + job_id + '/' + suffix, headers=headers, data=body)
                        assert r.status == 200, r.text()
                admin_page.goto(BASE + '/admin/builder')
                uz_picker = admin_page.get_by_role('region', name='O‘zbekcha savollar', exact=True)
                kaa_picker = admin_page.get_by_role('region', name='Qoraqalpoqcha savollar', exact=True)
                expect(uz_picker.get_by_role('checkbox')).to_have_count(2)
                expect(kaa_picker.get_by_role('checkbox')).to_have_count(2)
                uz_picker.get_by_role('button', name='Barchasini tanlash (2)', exact=True).click()
                kaa_picker.get_by_role('checkbox').first.click()
                admin_page.get_by_label('To‘plam nomi', exact=True).fill('UI bilingual publication')
                publish_button = admin_page.get_by_role('button', name='To‘plamni e’lon qilish', exact=True)
                expect(publish_button).to_be_disabled()
                check('authoring blocks unequal language counts', True)
                kaa_picker.get_by_role('checkbox').last.click()
                with admin_page.expect_response(lambda r: r.url.endswith('/api/v1/staff/collections') and r.request.method == 'POST') as publication:
                    publish_button.click()
                response = publication.value
                check('admin UI publishes both language groups as one collection', response.status == 201)
                published_id = response.json()['id']
                detail = api.get(BASE + '/api/v1/exams/c_' + published_id).json()
                check('published catalog reports two questions instead of four', detail['questionCount'] == 2)
                language_page.goto(BASE + '/tests/c_' + published_id)
                expect(language_page.get_by_role('radio', name='O‘zbekcha', exact=True)).to_be_visible()
                expect(language_page.get_by_role('radio', name='Qaraqalpaqsha', exact=True)).to_be_visible()
                check('UI-authored bilingual collection offers learner language choice', True)
                catalog = admin_context.request.get(BASE + '/api/v1/staff/collections').json()['items']
                authored_draft = next(item['draftId'] for item in catalog if item['id'] == published_id)
                admin_page.goto(BASE + '/admin/builder?draft=' + authored_draft)
                expect(kaa_picker.get_by_role('checkbox').last).to_be_checked()
                kaa_picker.get_by_role('checkbox').last.uncheck()
                with admin_page.expect_response(lambda r: r.url.endswith('/staff/tests/' + authored_draft) and r.request.method == 'PATCH') as saved_translation:
                    admin_page.locator('.collection-save button').first.click()
                check('changing only translated selection persists a new draft revision', saved_translation.value.status == 200 and len(saved_translation.value.json()['content']['translations']['kaa']['questionDraftIds']) == 1)
                admin_page.reload()
                expect(kaa_picker.get_by_role('checkbox').first).to_be_checked()
                expect(kaa_picker.get_by_role('checkbox').last).not_to_be_checked()
                check('reopening draft retains independent language selections', True)
                admin_page.goto(BASE + '/admin/import')
                expect(admin_page.locator('select')).to_be_visible()
                admin_page.locator('select').select_option('kaa')
                check('import UI exposes an explicit question-language choice', admin_page.locator('select').input_value() == 'kaa')
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
    # workerd/Windows can release SQLite handles shortly after process exit.
    target = Path(folder).resolve()
    assert target.parent == Path(tempfile.gettempdir()).resolve() and target.name.startswith('hm-exam-e2e-')
    for retry in range(30):
        try:
            shutil.rmtree(target)
            break
        except PermissionError:
            if retry == 29:
                raise
            time.sleep(0.5)
print(f'{checks} real Worker/D1 browser checks passed. Temporary data removed.')
