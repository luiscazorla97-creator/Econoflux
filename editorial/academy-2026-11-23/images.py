"""Original explanatory figures; all numeric examples are hypothetical."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
ROOT=Path(__file__).parent;OUT=Path('public/images/academy/batch-2026-11-23');OUT.mkdir(parents=True,exist_ok=True)
BG='#081725';PANEL='#10293a';INK='#f2f6fb';MUTED='#b4c9da';GREEN='#51e3b2';BLUE='#76bbff';GOLD='#ffcd70'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(n,b=False):return ImageFont.truetype(BOLD if b else FONT,n)
def text(x,y,s,size=23,color=INK,b=False,maxw=None):
 f=font(size,b)
 if maxw: assert d.textbbox((0,0),s,font=f)[2]<=maxw,(s,maxw)
 d.text((x,y),s,font=f,fill=color)
def panel(x,y,w,h):d.rounded_rectangle((x,y,x+w,y+h),radius=20,fill=PANEL)
def label(x,y,s):text(x,y,s,20,MUTED)
def footer(lang,s):
 d.line((56,548,1144,548),fill='#29485c',width=2);text(56,571,s,19,MUTED,maxw=1088)
for spec in json.loads((ROOT/'topics.json').read_text()):
 for lang in ['en','es']:
  es=lang=='es';im=Image.new('RGB',(1200,630),BG);d=ImageDraw.Draw(im)
  text(56,31,'ECONOFLUX  /  ACADEMIA CRYPTO' if es else 'ECONOFLUX  /  CRYPTO ACADEMY',18,GREEN,True)
  id=spec['id']
  if id=='proof-of-reserves-explained':
   text(56,82,'El denominador cambia la lectura' if es else 'The denominator changes the story',38,INK,True,maxw=1088)
   text(56,142,'Mismos activos. Distintas obligaciones incluidas.' if es else 'Same assets. Different included obligations.',25,MUTED)
   for x,title,liab,ratio in [(56,'Solo clientes' if es else 'Customers only',1000,'105 %' if es else '105%'),(620,'Clientes + deuda' if es else 'Customers + debt',1150,'91,30 %' if es else '91.30%')]:
    panel(x,207,524,311);text(x+24,226,title,26,INK,True,maxw=475)
    label(x+24,279,('Activos: 1.050 BTC' if es else 'Assets: 1,050 BTC'));d.rounded_rectangle((x+24,312,x+24+410*1050/1150,335),radius=6,fill=GREEN)
    label(x+24,351,('Obligaciones: '+('1.000' if liab==1000 else '1.150')+' BTC') if es else ('Obligations: '+('1,000' if liab==1000 else '1,150')+' BTC'))
    d.rounded_rectangle((x+24,385,x+24+410*liab/1150,408),radius=6,fill=BLUE)
    text(x+24,435,ratio,40,GOLD,True);text(x+225,452,'Activos / obligaciones' if es else 'Assets / obligations',21,MUTED,maxw=280)
   footer(lang,'Ejemplo hipotético: 150 BTC de deuda adicional. No es un balance completo.' if es else 'Hypothetical example: 150 BTC of additional debt. Not a complete balance sheet.')
  elif id=='blockchain-price-oracles':
   text(56,82,'Cuándo se activa una actualización' if es else 'When a price update is triggered',38,INK,True,maxw=1088)
   text(56,142,'Supuestos: umbral del 1 % · heartbeat de 60 min' if es else 'Assumptions: 1% threshold · 60-minute heartbeat',25,MUTED)
   for x,time,price,change,note,col in [(56,'12:00','2.000' if es else '2,000','Referencia' if es else 'Reference','Último publicado' if es else 'Last published',BLUE),(426,'12:10','2.012' if es else '2,012','+0,6 %' if es else '+0.6%','No cruza el umbral' if es else 'Below threshold',MUTED),(796,'12:20','2.024' if es else '2,024','+1,2 %' if es else '+1.2%','Activa un informe' if es else 'Report triggered',GREEN)]:
    panel(x,216,348,274);text(x+24,238,time,26,BLUE,True);text(x+24,293,price,48,INK,True);text(x+24,367,change,27,col,True);text(x+24,426,note,22,MUTED,maxw=305)
   footer(lang,'Valores hipotéticos. El envío y la inclusión pueden demorarse.' if es else 'Hypothetical values. Reporting and onchain inclusion can take time.')
  else:
   text(56,82,'Validar no exige guardar todo' if es else 'Full validation, different storage',38,INK,True,maxw=1088)
   text(56,142,'Dos configuraciones de nodo completo' if es else 'Two full-node storage configurations',25,MUTED)
   for x,title,lines in [(56,'Archivo' if es else 'Archival',[('Comprueba las reglas' if es else 'Checks the rules',GREEN),('Conserva bloques históricos' if es else 'Retains historical blocks',BLUE),('Más almacenamiento' if es else 'More retained storage',MUTED)]),(620,'Podado' if es else 'Pruned',[('Comprueba las reglas' if es else 'Checks the rules',GREEN),('Elimina archivos antiguos' if es else 'Discards old block files',BLUE),('Menos almacenamiento' if es else 'Less retained storage',MUTED)])]:
    panel(x,215,524,302);text(x+26,239,title,32,INK,True)
    for i,(line,col) in enumerate(lines):
     d.ellipse((x+26,314+i*57,x+37,325+i*57),fill=col);text(x+53,302+i*57,line,25,col,maxw=445)
   footer(lang,'Validar no genera recompensas del protocolo. La poda no evita la descarga inicial ordinaria.' if es else 'Validation earns no protocol reward. Pruning does not avoid ordinary initial downloading.')
  stem=OUT/f'{id}-{lang}';im.save(str(stem)+'.webp',quality=88,method=6);im.resize((640,336),Image.Resampling.LANCZOS).save(str(stem)+'-640.webp',quality=88,method=6);im.save(str(stem)+'.png',optimize=True)
  print(stem.name,Path(str(stem)+'.webp').stat().st_size)
