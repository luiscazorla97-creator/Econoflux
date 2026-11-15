import json,re, pathlib, datetime
ROOT=pathlib.Path(__file__).parent

def sections(text):
 out=[]
 for part in text.strip().split('\n## ')[1:]:
  heading,body=part.split('\n',1)
  ident= 'faq' if ('frecuentes' in heading.lower() or 'frequently' in heading.lower()) else 'section-'+str(len(out)+1)
  item={'id':ident,'title':heading,'text':[]}
  for paragraph in body.strip().split('\n\n'):
   if paragraph.startswith('### '): item['subheading']=paragraph[4:].strip()
   else: item['text'].append(paragraph.replace('\n',' ').strip())
  assert item['text']; out.append(item)
 return out

def build():
 specs=json.loads((ROOT/'topics.json').read_text())
 guides=[]
 previous=json.loads((ROOT/'guides.json').read_text()) if (ROOT/'guides.json').exists() else []
 dates={g['translationId']:g['publishedAt'] for g in previous}
 for spec in specs:
  for lang in ['en','es']:
   m=spec[lang]; body=(ROOT/'content'/f"{spec['id']}.{lang}.txt").read_text()
   g={'id':spec['id']+'-'+lang,'translationId':spec['id'],'lang':lang,'slug':m['slug'],'editorialRevision':1,'kind':'guide','format':'explainer','academyCategory':spec['category'],'cluster':spec['cluster'],'level':'beginner','category':spec['newsCategory'],'tags':m['keywords'],'demo':False,'status':'published','author':'EconoFlux','publishedAt':dates.get(spec['id'],'2026-11-15T00:00:00.000Z'),'title':m['title'],'summary':m['summary'],'seoTitle':m['seoTitle'],'seoDescription':m['description'],'sections':sections(body),'sources':spec['sources'],'image':{'src':f"/images/academy/batch-2026-11/{spec['id']}-{lang}.webp",'srcSet':f"/images/academy/batch-2026-11/{spec['id']}-{lang}-640.webp 640w, /images/academy/batch-2026-11/{spec['id']}-{lang}.webp 1200w",'alt':m['alt'],'credit': 'Original EconoFlux educational diagram; hypothetical examples.' if lang=='en' else 'Infografía educativa original de EconoFlux; ejemplos hipotéticos.','width':1200,'height':630,'socialSrc':f"/images/academy/batch-2026-11/{spec['id']}-{lang}.png",'socialWidth':1200,'socialHeight':630,'creator':'EconoFlux','license':'EconoFlux original'},'seo':{'primaryKeyword':m['keywords'][0],'relatedQueries':m['keywords'][1:],'searchIntent':m['intent'],'readerQuestions':m['questions'],'relatedTranslationIds':spec['related'],'basis':'editorial-topic-inference'}}
   # Contextual links are rendered only for these new guides.
   for i,link in enumerate(m['links']): g['sections'][min(i*2,len(g['sections'])-1)].setdefault('links',[]).append(link)
   words=len(re.findall(r'\S+',g['summary']+' '+' '.join(s['title']+' '+s.get('subheading','')+' '+' '.join(s['text']) for s in g['sections'])))
   print(spec['id'],lang,words)
   g['wordCountAudit']=words
   guides.append(g)
 (ROOT/'guides.json').write_text(json.dumps(guides,ensure_ascii=False,indent=2)+'\n')
 return guides
if __name__=='__main__':build()
