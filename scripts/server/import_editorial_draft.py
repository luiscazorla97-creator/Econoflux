"""Import the reviewed private draft into D1; never into public site content."""
import argparse
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--remote', action='store_true', help='Explicitly execute the prepared D1 import on Cloudflare')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
folder = root / '.local/editorial/automation'
data = json.loads((folder / 'bitcoin-core-32-1-draft.json').read_text())
assert re.fullmatch('[a-f0-9]{24}', data['id'])
assert data['state'] == 'draft' and data['publicationEnabled'] is False
assert {x['lang'] for x in data['translations']} == {'en', 'es'}
assert all(x['status'] == 'draft' and x['demo'] is False for x in data['translations'])
def sql(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"
identity = data['id']
v = data['verification']
statements = ["INSERT INTO events(id,fingerprint,title,url,detected_at,event_at,state,selection_reason,canonical_event,verified_at,verification,category,prepared_at) VALUES(" + ','.join(map(sql, [identity, identity, data['translations'][0]['title'], data['translations'][0]['sources'][0]['url'], data['createdAt'], data['eventDate'], 'draft', 'Accessible official release and GitHub timestamp; routine event, no urgency', v['canonicalEvent'], data['createdAt'], json.dumps(v), 'bitcoin', data['createdAt']])) + ') ON CONFLICT DO NOTHING;']
for index, source in enumerate(data['translations'][0]['sources']):
    statements.append('INSERT INTO sources(id,event_id,url,publisher,published_at,fetched_at,accessible,primary_source,independence_group,excerpt,facts) VALUES(' + ','.join(map(sql, [v['sourceIds'][index], identity, source['url'], source['label'], data['eventDate'], data['createdAt']])) + ",1,1,'bitcoin-core-project'," + sql(' '.join(v['essentialFacts'])) + ',' + sql(json.dumps(v['essentialFacts'])) + ') ON CONFLICT DO NOTHING;')
for a in data['translations']:
    statements.append('INSERT INTO drafts(event_id,lang,revision,value,valid,updated_at) VALUES(' + ','.join(map(sql, [identity, a['lang'], 1, json.dumps(a)])) + ',1,' + sql(data['createdAt']) + ') ON CONFLICT DO NOTHING;')
statements.append('INSERT INTO history(event_id,at,actor,action,detail) VALUES(' + ','.join(map(sql, [identity, data['createdAt'], 'editorial-import', 'draft_import', 'Verified primary-source bilingual draft imported privately, not approved or published'])) + ');')
path = folder / 'import-private-draft.sql'
path.write_text('\n'.join(statements) + '\n')
path.chmod(0o600)
if args.remote:
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'econoflux-editorial', '--remote', '--config', str(root/'automation/wrangler.jsonc'), '--file', str(path)], cwd=root, check=True)
else:
    print('Private SQL prepared; nothing uploaded: ' + str(path))
