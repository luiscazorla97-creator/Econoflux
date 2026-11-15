"""Explicit one-off owner-authorized Academy batch. Never writes news tables.
Stage inserts only new IDs with visible=0; publish activates the exact 20 rows
in one UPDATE. Refuses duplicate IDs/slugs. Credentials remain in environment.
"""
import json,pathlib,os,urllib.request,sys,datetime,hashlib
R=pathlib.Path(__file__).parent
API='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/d1/database/70a247b6-ec51-46dc-a644-a8f9c40c1204/query'
def query(sql,params=[]):
 req=urllib.request.Request(API,data=json.dumps({'sql':sql,'params':params}).encode(),headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'],'Content-Type':'application/json'})
 data=json.load(urllib.request.urlopen(req,timeout=60))
 if not data.get('success'):raise RuntimeError(json.dumps(data.get('errors')))
 return data['result'][0]
def q(x):return "'"+str(x).replace("'","''")+"'"
guides=json.loads((R/'guides.json').read_text());specs=json.loads((R/'topics.json').read_text());ids=[s['id'] for s in specs];marks=','.join('?' for _ in ids)
mode=sys.argv[1]
if mode=='stage':
 assert len(guides)==20 and len(ids)==10
 assert not query('SELECT id FROM academy_topics WHERE id IN ('+marks+')',ids)['results'],'Existing topic; refusing overwrite'
 existing=query('SELECT lang,slug FROM public_guides')['results'];assert not {(x['lang'],x['slug']) for x in existing}&{(g['lang'],g['slug']) for g in guides}
 now=datetime.datetime.now(datetime.timezone.utc);date=now.isoformat(timespec='milliseconds').replace('+00:00','Z');review=(now+datetime.timedelta(days=90)).isoformat(timespec='milliseconds').replace('+00:00','Z')
 for g in guides:g['publishedAt']=date
 (R/'guides.json').write_text(json.dumps(guides,ensure_ascii=False,indent=2)+'\n')
 for s in specs:
  spec={'id':s['id'],'intent':s['id'],'category':s['category'],'cluster':s['cluster'],'role':'supporting','level':'beginner','en':s['en']['title'],'es':s['es']['title'],'slugEn':s['en']['slug'],'slugEs':s['es']['slug'],'scope':s['scope'],'sources':s['sources'],'terms':s['en']['keywords']+s['es']['keywords']}
  query('INSERT INTO academy_topics(id,intent_key,category,cluster,spec,status,revision,last_checked_at,next_review_at) VALUES(?,?,?,?,?,\'manual-staged\',1,?,?)',[s['id'],s['id'],s['category'],s['cluster'],json.dumps(spec,ensure_ascii=False),date,review])
  pair=[g for g in guides if g['translationId']==s['id']]
  values=[];params=[]
  for g in pair:
   values.append('(?,?,?,1,?,0,?)');params.extend([g['translationId'],g['lang'],g['slug'],json.dumps(g,ensure_ascii=False),date])
  query('INSERT INTO public_guides(translation_id,lang,slug,revision,value,visible,published_at) VALUES '+','.join(values),params)
  payload={'manualBatch':'2026-11-15','authorization':'Owner requested ten new bilingual articles directly in this chat','reviewType':'Author factual and bilingual review; deterministic math and technical validation','contentSha256':hashlib.sha256(json.dumps(pair,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),'sources':s['sources'],'validationFile':'editorial/academy-2026-11-15/validation.json','aiServiceCalls':0}
  query('INSERT INTO academy_jobs(id,topic_id,kind,revision,state,phase,payload,next_attempt,created_at,completed_at) VALUES(?,?,\'new\',1,\'done\',\'manual-reviewed\',?,?,?,?)',['manual-2026-11-15-'+s['id'],s['id'],json.dumps(payload,ensure_ascii=False),date,date,date])
  print('Staged bilingual pair:',s['id'])
elif mode=='publish':
 rows=query('SELECT translation_id,lang,slug,visible,value FROM public_guides WHERE translation_id IN ('+marks+')',ids)['results'];assert len(rows)==20
 expected={(g['translationId'],g['lang']):g for g in guides}
 for row in rows:assert row['visible']==0 and json.loads(row['value'])==expected[(row['translation_id'],row['lang'])]
 for g in guides:
  for key in ['src','socialSrc']:
   r=urllib.request.urlopen(urllib.request.Request('https://econoflux.com'+g['image'][key],headers={'User-Agent':'Mozilla/5.0'}),timeout=20);assert r.status==200
 query('UPDATE academy_topics SET status=\'published\',published_at=? WHERE status=\'manual-staged\' AND id IN ('+marks+')',[guides[0]['publishedAt']]+ids)
 # One atomic statement exposes both languages of every reviewed pair together.
 r=query('UPDATE public_guides SET visible=1 WHERE visible=0 AND translation_id IN ('+marks+')',ids)
 assert r['meta']['changes']==20,r
 print('Published 20 pages atomically; news tables and controls untouched')
else:raise SystemExit('Use stage or publish')
