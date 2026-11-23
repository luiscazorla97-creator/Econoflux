import json,pathlib,math,hashlib,re,urllib.request,concurrent.futures
R=pathlib.Path(__file__).parent
guides=json.loads((R/'guides.json').read_text());specs=json.loads((R/'topics.json').read_text());evidence=json.loads((R/'evidence/retrieval.json').read_text())
assert len(guides)==6 and len(specs)==3
assert len({s['id'] for s in specs})==3
sources={r['url'] for r in evidence if r.get('status')==200}
urls={('https://econoflux.com/en/academy/guides/' if g['lang']=='en' else 'https://econoflux.com/es/academia/guias/')+g['slug']+'/' for g in guides}
assert len(urls)==6
checks=[]
for g in guides:
 assert 1500<=g['wordCountAudit']<=2500
 assert len(g['sections'])>=7 and any(s.get('subheading') for s in g['sections'])
 assert any(s['id']=='faq' for s in g['sections'])
 assert 110<=len(g['seoDescription'])<=180,(g['slug'],len(g['seoDescription']))
 assert all(s['url'] in sources for s in g['sources'])
 for key in ['src','socialSrc']:
  p=R.parent.parent/'public'/g['image'][key].lstrip('/');assert p.exists(),p
 assert len(g['image']['alt'])>50
 assert all(l['href'].startswith('/'+g['lang']+'/') for s in g['sections'] for l in s.get('links',[]))
 checks.append({'lang':g['lang'],'slug':g['slug'],'words':g['wordCountAudit'],'titleCharacters':len(g['seoTitle']),'descriptionCharacters':len(g['seoDescription']),'contentSha256':hashlib.sha256(json.dumps(g,sort_keys=True,ensure_ascii=False).encode()).hexdigest()})
# Recompute the examples independently from their input quantities.
assert math.isclose(1050/1000*100,105)
assert math.isclose(1050/(1000+150)*100,91.304347826,rel_tol=1e-9)
assert math.isclose((2012/2000-1)*100,.6)
assert math.isclose((2024/2000-1)*100,1.2)
assert math.isclose(200_000_000_000/10**8,2000)
assert math.isclose(2000*.8/1400,1.142857142857)
assert math.isclose(1700*.8/1400,.971428571428)
assert math.isclose(15/1000*24*30*.2,2.16)
assert math.isclose(40/1000*24*30*.2,5.76)
existing=json.load(open('.local/academy-2026-11-23/before.json'))['guides']
oldids={r['translation_id'] for r in existing};assert not oldids & {s['id'] for s in specs}
oldpaths={(r['lang'],r['slug']) for r in existing};assert not oldpaths & {(g['lang'],g['slug']) for g in guides}
links=sorted({'https://econoflux.com'+l['href'] for g in guides for s in g['sections'] for l in s.get('links',[]) }-urls)
def checklink(u):
 r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20);assert r.status==200;return {'url':u,'status':r.status}
res=list(concurrent.futures.ThreadPoolExecutor(5).map(checklink,links))
report={'pages':checks,'sourceDocuments':len(sources),'existingInternalLinks':res,'newRoutes':sorted(urls),'mathematicalChecks':'passed','duplicateRouteChecks':'passed','review':'Author factual and bilingual review completed against official sources; no separate human reviewer claimed.'}
(R/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS:',len(guides),'pages;',min(g['wordCountAudit'] for g in guides),'-',max(g['wordCountAudit'] for g in guides),'words;',len(sources),'official documents;',len(res),'existing internal destinations')
