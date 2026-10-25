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
    sql_execute((ROOT / 'server/fixtures/local-exam.sql').read_text(encoding='utf-8') + f"""
      INSERT INTO users(id,display_name,email,created_at,updated_at) VALUES('{user_id}','Exam Learner','exam@example.test',{now},{now});
      UPDATE users SET first_name='Exam',last_name='Learner',patronymic='Fixture',birth_date='2000-01-01',profile_completed_at={now} WHERE id='{user_id}';
      INSERT INTO sessions(token_hash,user_id,csrf_hash,created_at,expires_at) VALUES(
        '{hashlib.sha256(token.encode()).hexdigest()}','{user_id}','{hashlib.sha256(csrf.encode()).hexdigest()}',{now},{now+3600000});
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
