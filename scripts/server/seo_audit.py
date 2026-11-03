"""Read-only, provider-free SEO audit of the published site and its crawl graph."""
import argparse
from collections import Counter, deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
NS = {'s':'http://www.sitemaps.org/schemas/sitemap/0.9','x':'http://www.w3.org/1999/xhtml','n':'http://www.google.com/schemas/sitemap-news/0.9'}

def get(url):
    try:
        with urlopen(Request(url, headers={'User-Agent':UA}), timeout=30) as r:
            return r.status, r.url, dict(r.headers), r.read(3000000).decode('utf8','replace')
    except HTTPError as e:
        return e.code, e.url, dict(e.headers), e.read(100000).decode('utf8','replace')

class HTML(HTMLParser):
    def __init__(self):
        super().__init__();self.meta={};self.links=[];self.anchors=[];self.schema=[];self.h1=[];self.in_h1=False;self.ld=False;self.ld_text='';self.ads=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='meta': self.meta[a.get('name',a.get('property',''))]=a.get('content','')
        if tag=='link': self.links.append(a)
        if tag=='a' and a.get('href'): self.anchors.append(a['href'])
        if tag=='h1': self.in_h1=True;self.h1.append('')
        if tag=='script':
            if a.get('type')=='application/ld+json': self.ld=True;self.ld_text=''
            if a.get('src','').startswith('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1382859681401211'):self.ads+=1
    def handle_endtag(self,tag):
        if tag=='h1': self.in_h1=False
        if tag=='script' and self.ld:
            try:self.schema.append(json.loads(self.ld_text))
            except ValueError:self.schema.append({'error':'Invalid JSON-LD'})
            self.ld=False
    def handle_data(self,data):
        if self.in_h1:self.h1[-1]+=data
        if self.ld:self.ld_text+=data

def run(origin):
    checked=datetime.now(timezone.utc)
    observations=[]
    def read(url,kind):
        status,final,headers,body=get(url)
        observations.append({'url':url,'kind':kind,'status':status,'final_url':final,'checked_at':datetime.now(timezone.utc).isoformat(),'error':None})
        return status,final,{k.lower():v for k,v in headers.items()},body
    def xml_read(url):
        code,final,headers,body=read(url,'sitemap')
        assert code==200 and final==url,(url,code,final)
        assert 'xml' in headers.get('content-type',''),url
        assert headers.get('cache-control')=='no-store',url
        return ET.fromstring(body),headers
    general,_=xml_read(origin+'/sitemap.xml')
    locations=[];parts=[]
    queue=deque([general])
    while queue:
        root=queue.popleft()
        if root.tag.endswith('sitemapindex'):
            for e in root.findall('s:sitemap/s:loc',NS):
                assert e.text.startswith(origin+'/sitemaps/')
                sub,_=xml_read(e.text);parts.append(e.text);queue.append(sub)
        else:
            for node in root.findall('s:url',NS):
                url=node.find('s:loc',NS).text
                assert url.startswith(origin+'/') and url!=origin+'/'
                locations.append(url)
                modified=node.find('s:lastmod',NS)
                if modified is not None:assert datetime.fromisoformat(modified.text.replace('Z','+00:00'))<=checked+timedelta(seconds=30)
    assert len(locations)==len(set(locations)),'Duplicate general sitemap URLs'
    news,news_headers=xml_read(origin+'/news-sitemap.xml')
    news_urls=news.findall('s:url',NS)
    assert len(news_urls)<=1000
    news_info={}
    news_generated=datetime.fromisoformat(news_headers['x-sitemap-generated-at'].replace('Z','+00:00'))
    for entry in news_urls:
        url=entry.find('s:loc',NS).text
        assert url in locations and '/articles/' in url,url
        assert url not in news_info,'Duplicate news URL'
        publication=entry.find('n:news/n:publication',NS)
        assert publication.find('n:name',NS).text=='EconoFlux'
        lang=publication.find('n:language',NS).text
        assert lang in ['en','es'] and '/'+lang+'/' in url
        pub=entry.find('n:news/n:publication_date',NS).text
        assert news_generated-timedelta(hours=48)<=datetime.fromisoformat(pub.replace('Z','+00:00'))<=news_generated
        news_info[url]={'date':pub,'title':entry.find('n:news/n:title',NS).text}
    _,_,_,robots=read(origin+'/robots.txt','robots')
    assert 'Allow: /' in robots and 'Disallow: /\n' not in robots
    assert 'Sitemap: '+origin+'/sitemap.xml' in robots and 'Sitemap: '+origin+'/news-sitemap.xml' in robots
    def audit(url):
        try:
            code,final,headers,body=read(url,'archive' if '?page=' in url else 'page')
            parsed=HTML();parsed.feed(body)
            canonical=next((x.get('href') for x in parsed.links if x.get('rel')=='canonical'),None)
            alternates={x['hreflang']:x.get('href') for x in parsed.links if x.get('rel')=='alternate' and x.get('hreflang') in ['en','es','x-default']}
            errors=[]
            if code!=200:errors.append('HTTP '+str(code))
            if final!=url:errors.append('Unexpected redirect: '+final)
            if canonical!=url:errors.append('Canonical mismatch: '+str(canonical))
            if 'noindex' in (headers.get('x-robots-tag','')+parsed.meta.get('robots','')).lower():errors.append('Unexpected noindex')
            if not parsed.meta.get('description'):errors.append('Missing meta description')
            if len(parsed.h1)!=1:errors.append('Expected one H1')
            if parsed.ads!=1:errors.append('AdSense script missing or duplicated')
            content='/articles/' in url or '/guides/' in url or '/guias/' in url
            if content:
                node=next((n for n in parsed.schema if n.get('@type') in ['Article','NewsArticle']),None)
                if not node:errors.append('Missing article schema')
                else:
                    for key in ['headline','description','image','datePublished','dateModified','author','publisher','mainEntityOfPage','inLanguage','articleSection','isAccessibleForFree']:
                        if key not in node:errors.append('Missing schema '+key)
                    if '/articles/' in url and node['@type']!='NewsArticle':errors.append('Wrong news schema type')
                    if not node.get('isAccessibleForFree'):errors.append('Wrong free-access marker')
                    if not any(n.get('@type')=='BreadcrumbList' for n in parsed.schema):errors.append('Missing breadcrumb schema')
                    if url in news_info and (node.get('datePublished')!=news_info[url]['date'] or parsed.h1[0]!=news_info[url]['title']):errors.append('News feed title/date differs from article')
            links=[]
            for href in parsed.anchors:
                target=urlparse(urljoin(url,href));clean=target._replace(fragment='').geturl()
                if target.netloc==urlparse(origin).netloc and (not target.query or (target.query.startswith('page=') and target.query[5:].isdigit())):links.append(clean)
            return {'url':url,'status':code,'canonical':canonical,'alternates':alternates,'links':list(set(links)),'errors':errors,'schemaTypes':[n.get('@type') for n in parsed.schema]}
        except Exception as error:return {'url':url,'errors':[type(error).__name__+': '+str(error)[:180]],'links':[],'alternates':{}}
    with ThreadPoolExecutor(max_workers=6) as pool:pages=list(pool.map(audit,locations))
    known={r['url']:r for r in pages}
    # Follow HTML pagination as a crawler would; older pages must not depend on
    # the XML feed or on client-side buttons to expose their article links.
    while True:
        pending={u for p in known.values() for u in p['links'] if '?page=' in u and u not in known}
        if not pending:break
        with ThreadPoolExecutor(max_workers=4) as pool:
            for result in pool.map(audit,sorted(pending)):known[result['url']]=result
    for page in known.values():
        for lang,other in page['alternates'].items():
            if lang=='x-default':continue
            if other in known and page['url'] not in known[other]['alternates'].values():page['errors'].append('Non-reciprocal hreflang '+other)
    reached=set();stack=[origin+'/en/',origin+'/es/']
    while stack:
        url=stack.pop()
        if url in reached or url not in known:continue
        reached.add(url);stack.extend(known[url]['links'])
    orphan=[u for u in locations if any(p in u for p in ['/articles/','/guides/','/guias/']) and u not in reached]
    errors=[{'url':p['url'],'errors':p['errors']} for p in known.values() if p['errors']]
    return {'checkedAt':checked.isoformat(),'origin':origin,'summary':{'sitemapURLs':len(locations),'newsSitemapURLs':len(news_info),'generalSitemapParts':len(parts),'archivePages':sum('?page=' in u for u in known),'languages':dict(Counter(urlparse(u).path.split('/')[1] for u in locations)),'checkedHTML':len(known),'orphanContentURLs':orphan,'errors':errors},'pages':list(known.values()),'observations':observations}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--origin',default='https://econoflux.com');parser.add_argument('--output',default='.local/seo/audit.json');args=parser.parse_args()
    result=run(args.origin.rstrip('/'));out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result['summary'],ensure_ascii=False))
    raise SystemExit(bool(result['summary']['errors'] or result['summary']['orphanContentURLs']))
