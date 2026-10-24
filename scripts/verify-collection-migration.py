"""Run the real migration over synthetic legacy SQLite data; no cloud writes."""
import json
import sqlite3
from pathlib import Path

db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
for path in sorted(Path('migrations').glob('*.sql')):
    if path.name.startswith('0009_'):break
    db.executescript(path.read_text(encoding='utf-8'))
db.execute("INSERT INTO users(id,display_name,email,role,created_at,updated_at) VALUES('author','Synthetic Author','author@example.test','admin',1,1)")
db.execute("INSERT INTO users(id,display_name,email,role,created_at,updated_at) VALUES('learner','Synthetic Learner','learner@example.test','student',1,1)")
db.execute("INSERT INTO groups(id,name,created_by,created_at) VALUES('group','Synthetic Group','author',1)")
q={'kind':'written','topic':'theory','stem':'Synthetic question','options':[{'id':str(i),'text':str(i)} for i in range(4)],'correctOptionId':None,'accepted':['Synthetic answer'],'explanation':''}
db.execute("INSERT INTO question_drafts(id,owner_id,content,created_at,updated_at) VALUES('question','author',?,1,1)",(json.dumps(q),))
db.execute("INSERT INTO question_versions(id,payload,created_at) VALUES('q-version',?,1)",(json.dumps({'question':{'id':'q-version','kind':'written','topic':'theory','stem':'Synthetic question'},'accepted':['Synthetic answer'],'explanation':''}),))
db.execute("INSERT INTO question_publications VALUES('question',0,'q-version',1)")
db.execute("INSERT INTO test_drafts(id,owner_id,content,created_at,updated_at) VALUES('test','author','{}',1,1)")
db.execute("INSERT INTO test_versions VALUES('version','Synthetic legacy test','mock',86400,'[\"q-version\"]',0,1)")
db.execute("INSERT INTO test_publications(test_id,draft_revision,version_id,created_at) VALUES('test',0,'version',1)")
db.execute("INSERT INTO assignments VALUES('older-window','version','group',1,1000)")
db.execute("INSERT INTO assignments VALUES('latest-window','version','group',1001,5000)")
result=json.dumps({'units':2,'maxUnits':2,'pending':0,'final':True,'algorithm':'fixture'})
snapshot=json.dumps({'answers':{'q-version':'Synthetic answer'},'flags':[]})
for id,window,ends in [('old-attempt','older-window',1000),('latest-attempt','latest-window',5000)]:
    db.execute("INSERT INTO attempts(id,user_id,exam_id,test_version_id,assignment_id,start_operation,started_at,ends_at,state,snapshot,question_order,saved_at,result) VALUES(?,'learner',?,'version',?,?,1,?,'final',?,'[{\"id\":\"q-version\"}]',1,?)",(id,'a_'+window,window,id,ends,snapshot,result))
db.commit()
db.executescript(Path('migrations/0009_public_test_collections.sql').read_text(encoding='utf-8'))
assert db.execute('SELECT opens_at,closes_at FROM test_collections').fetchone()==(1001,5000)
assert db.execute("SELECT exam_id,collection_id FROM attempts WHERE id='latest-attempt'").fetchone()==('c_version','version')
assert db.execute("SELECT exam_id,collection_id FROM attempts WHERE id='old-attempt'").fetchone()==('a_older-window',None)
assert db.execute("SELECT snapshot,result FROM attempts WHERE id='latest-attempt'").fetchone()==(snapshot,result)
assert db.execute('SELECT count(*) FROM attempts').fetchone()[0]==2
assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
print('6 migration checks passed: latest window, adopted attempt, old history, answers/results, row count, foreign keys')
