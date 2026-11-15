import json,pathlib,math,hashlib,re,urllib.request,concurrent.futures
R=pathlib.Path(__file__).parent
guides=json.loads((R/'guides.json').read_text());specs=json.loads((R/'topics.json').read_text());evidence=json.loads((R/'evidence/retrieval.json').read_text())
assert len(guides)==20 and len(specs)==10
assert len({s['id'] for s in specs})==10
sources={r['url'] for r in evidence if r.get('status')==200}
urls={('https://econoflux.com/en/academy/guides/' if g['lang']=='en' else 'https://econoflux.com/es/academia/guias/')+g['slug']+'/' for g in guides}
assert len(urls)==20
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
# Independently recompute worked examples from primitive inputs.
assert math.isclose((3.325-1.7625)/3.325*100,46.992481203,rel_tol=1e-9)
assert math.isclose(3*24*1.1*.1,7.92)
assert math.isclose(12*.98-7.92-3,.84)
assert math.isclose(300/(100/10+100/5+100/20),8.571428571,rel_tol=1e-9)
assert math.isclose((100+2*101+103)/4,101.25)
assert math.isclose(100-1000000/11000,9.09090909,rel_tol=1e-9)
assert math.isclose((2*math.sqrt(2)/3-1)*100,-5.71909584,rel_tol=1e-8)
assert math.isclose(10000*.8/5000,1.6) and math.isclose(3000/(2*.8),1875)
assert math.isclose((1+.12/12)**12-1,.1268250301,rel_tol=1e-8)
existing=json.load(open('/tmp/academy-before.json'))[0]['results']
oldids={r['translation_id'] for r in existing};assert not oldids & {s['id'] for s in specs}
oldpaths={(r['lang'],r['slug']) for r in existing};assert not oldpaths & {(g['lang'],g['slug']) for g in guides}
links=sorted({'https://econoflux.com'+l['href'] for g in guides for s in g['sections'] for l in s.get('links',[]) }-urls)
def checklink(u):
 r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20);assert r.status==200;return {'url':u,'status':r.status}
res=list(concurrent.futures.ThreadPoolExecutor(5).map(checklink,links))
report={'pages':checks,'sourceDocuments':len(sources),'existingInternalLinks':res,'newRoutes':sorted(urls),'mathematicalChecks':'passed','duplicateRouteChecks':'passed','review':'Author factual and bilingual review completed against official sources; no separate human reviewer claimed.'}
(R/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS:',len(guides),'pages;',min(g['wordCountAudit'] for g in guides),'-',max(g['wordCountAudit'] for g in guides),'words;',len(sources),'official documents;',len(res),'existing internal destinations')
