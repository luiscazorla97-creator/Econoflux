from PIL import Image,ImageDraw,ImageFont
import pathlib,json,math
ROOT=pathlib.Path(__file__).parent
OUT=ROOT.parent.parent/'public/images/academy/batch-2026-11'
OUT.mkdir(parents=True,exist_ok=True)
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
BG='#091b25';FG='#e9f2ef';MUT='#a7bac0';GREEN='#83e6b0';GOLD='#f6c26b';BLUE='#7cb9f4';RED='#f29c94'
def font(n,b=False):return ImageFont.truetype(B if b else F,n)
def txt(x,y,s,n=24,c=FG,b=False):d.text((x,y), (s.replace(',', '~').replace('.', ',').replace('~', '.') if lang=='es' and any(ch.isdigit() for ch in s) and not ('0,80' in s or '12,68' in s or '343,15' in s or '10.000 sats' in s or 'Inicial 1.000' in s) else s),font=font(n,b),fill=c)
def line(points,c=MUT,w=3):d.line(points,fill=c,width=w)
def bar(x,y,w,h,c):d.rounded_rectangle((x,y,x+w,y+h),radius=9,fill=c)
def wrap(s,width=44):
 import textwrap
 return textwrap.wrap(s,width)
labels={
'bitcoin-halving':('Bitcoin subsidy per block','Subsidio de Bitcoin por bloque'),
'bitcoin-mining-costs':('Revenue is not profit','Ingresos no equivalen a beneficio'),
'lightning-network-payments':('Capacity has two directions','La capacidad tiene dos direcciones'),
'dca-crypto-calculation':('Same money, different quantities','Mismo dinero, distintas cantidades'),
'crypto-order-types':('A trigger is not an execution price','Activación no es precio de ejecución'),
'slippage-price-impact':('Quote first. Then set a limit.','Primero cotización, después límite'),
'impermanent-loss':('Compare with holding the same assets','Compara con conservar los activos'),
'defi-liquidation-health-factor':('Collateral buffer under pressure','El margen de garantía bajo presión'),
'apr-apy-crypto':('Compounding before costs','Capitalización antes de costes'),
'nft-ownership-metadata':('Four layers, different dependencies','Cuatro capas, distintas dependencias')}
alts={}
for id,(en,es) in labels.items():
 for lang in ['en','es']:
  eng=lang=='en';im=Image.new('RGB',(1200,630),BG);d=ImageDraw.Draw(im)
  txt(50,30,'ECONOFLUX / '+('CRYPTO ACADEMY' if eng else 'ACADEMIA CRYPTO'),18,GREEN,True)
  txt(50,78,en if eng else es,35,FG,True)
  line([(50,138),(1150,138)],'#29414b',2)
  foot='Illustrative assumptions • Not a forecast' if eng else 'Supuestos ilustrativos • No es una previsión'
  alt=''
  if id=='bitcoin-halving':
   vals=[50,25,12.5,6.25,3.125,1.5625]; heights=['0','210,000','420,000','630,000','840,000','1,050,000']
   for i,(v,h) in enumerate(zip(vals,heights)):
    x=65+i*182; bh=260*v/50
    bar(x,465-bh,130,max(bh,8),GREEN if i<5 else GOLD)
    txt(x,425-bh,str(v),23,FG,True);txt(x,487,h,18);txt(x,515,'BTC',17,MUT)
   foot='Height determines issuance; calendar dates are estimates.' if eng else 'La altura determina emisión; las fechas son estimaciones.'
   alt='Bars showing Bitcoin subsidy falling from 50 to 1.5625 BTC at 210,000-block intervals.' if eng else 'Barras del subsidio de Bitcoin: de 50 a 1,5625 BTC en intervalos de 210.000 bloques.'
  elif id=='bitcoin-mining-costs':
   entries=[('Gross' if eng else 'Bruto',12,GREEN),('Pool',.24,BLUE),('Energy' if eng else 'Energía',7.92,GOLD),('Remainder' if eng else 'Resto',3.84,GREEN),('Depreciation' if eng else 'Amortización',3,BLUE),('Before other costs' if eng else 'Antes de otros gastos',.84,GOLD)]
   for i,(label,v,c) in enumerate(entries):
    y=170+i*59;txt(55,y,label,22);bar(340,y,650*v/12,30,c);txt(1010,y,f'{v:.2f}',23,FG,True)
   alt='Daily mining example: 12 gross minus 0.24 pool fee, 7.92 energy and 3 depreciation leaves 0.84 before other costs.' if eng else 'Ejemplo diario: 12 brutos menos 0,24 de pool, 7,92 de energía y 3 de amortización dejan 0,84 antes de otros gastos.'
  elif id=='lightning-network-payments':
   for y,a,b,label in [(230,70000,30000,'Before' if eng else 'Antes'),(390,60000,40000,'After sending 10,000 sats' if eng else 'Tras enviar 10,000 sats')]:
    txt(55,y-43,label,25,FG,True);bar(55,y,1090*a/100000,55,GREEN);bar(55+1090*a/100000,y,1090*b/100000,55,BLUE)
    txt(75,y+12,f'{a:,} '+('outbound' if eng else 'salida'),23,BG,True);txt(75+1090*a/100000,y+12,f'{b:,} '+('inbound' if eng else 'entrada'),23,BG,True)
   txt(55,490,'100,000 sats '+('total; reserves and fees excluded' if eng else 'totales; sin reservas ni comisiones'),24,MUT)
   alt='Channel balances before and after a 10,000-sat payment: outbound falls from 70,000 to 60,000 and inbound rises from 30,000 to 40,000.' if eng else 'Canal antes y después de pagar 10.000 sats: salida baja de 70.000 a 60.000 y entrada sube de 30.000 a 40.000.'
  elif id=='dca-crypto-calculation':
   for i,(p,q) in enumerate([(10,10),(5,20),(20,5)]):
    x=70+i*245;txt(x,170,('BUY ' if eng else 'COMPRA ')+str(i+1),20,GREEN,True);bar(x,440-q*9,150,q*9,BLUE);txt(x,455,f'{q} '+('coins' if eng else 'monedas'),24);txt(x,490,('Price ' if eng else 'Precio ')+str(p),22,MUT)
   txt(835,220,'300 / 35',39,FG,True);txt(835,280,'= 8.57',43,GOLD,True);txt(835,350,'Average cost' if eng else 'Coste medio',22);txt(835,389,'100 '+('per purchase' if eng else 'por compra'),19,MUT)
   alt='Three purchases of 100 at prices 10, 5 and 20 buy 35 coins in total, with average cost 8.57 before fees.' if eng else 'Tres compras de 100 a precios 10, 5 y 20 suman 35 monedas y un coste medio de 8,57 antes de comisiones.'
  elif id=='crypto-order-types':
   for x,title,value,c in [(55,'STOP','90',GREEN),(445,'LIMIT' if eng else 'LÍMITE','88',BLUE),(835,'BIDS' if eng else 'COMPRAS','86',GOLD)]:
    d.rounded_rectangle((x,215,x+305,415),radius=16,outline=c,width=3);txt(x+22,245,title,25,c,True);txt(x+22,305,value,45,FG,True)
   txt(55,475,'A triggered sell limit at 88 cannot fill against bids at 86.' if eng else 'Una venta limitada a 88 no se ejecuta contra compras a 86.',25)
   txt(55,525,'Price control can mean no execution.' if eng else 'Controlar el precio puede implicar no ejecutar.',24,MUT)
   alt='Sell stop-limit example: trigger 90, limit 88, bids 86; activation does not guarantee execution.' if eng else 'Venta stop-limit: activación 90, límite 88 y compras a 86; activarse no garantiza ejecución.'
  elif id=='slippage-price-impact':
   for x,title,value,c in [(55,'Quote' if eng else 'Cotización','500 Y',GREEN),(445,'Tolerance' if eng else 'Tolerancia','1%',BLUE),(835,'Minimum' if eng else 'Mínimo','495 Y',GOLD)]:
    d.rounded_rectangle((x,215,x+305,415),radius=16,outline=c,width=3);txt(x+22,245,title,25,c,True);txt(x+22,305,value,45,FG,True)
   txt(55,475,'Price impact is already reflected in the quote.' if eng else 'La cotización ya incorpora el impacto de precio.',27)
   txt(55,520,'Higher tolerance does not create liquidity.' if eng else 'Más tolerancia no crea liquidez.',24,MUT)
   alt='A swap quote of 500 Y with 1% tolerance implies about 495 Y minimum output; this does not reduce price impact.' if eng else 'Cotización de 500 Y y tolerancia del 1% implican unos 495 Y mínimos; no reducen el impacto de precio.'
  elif id=='impermanent-loss':
   for y,label,v,c in [(230,'Hold' if eng else 'Conservar',6000,GREEN),(350,'LP position' if eng else 'Posición LP',5656.85,BLUE)]:
    txt(55,y,label,25);bar(300,y,680*v/6000,55,c);txt(1000,y,f'{v:,.2f}',25)
   txt(55,465,'Gap: -343.15 / -5.72%' if eng else 'Diferencia: -343,15 / -5,72%',36,GOLD,True)
   txt(55,520,'ETH price doubles • Full-range 50/50 • No fees' if eng else 'ETH duplica precio • Rango completo 50/50 • Sin comisiones',22,MUT)
   alt='When ETH doubles, the hypothetical LP is worth 5,656.85 versus 6,000 for holding; divergence is 5.72% before fees.' if eng else 'Si ETH duplica precio, la posición LP vale 5.656,85 frente a 6.000 al conservar: divergencia del 5,72% sin comisiones.'
  elif id=='defi-liquidation-health-factor':
   line([(95,200),(95,475),(1110,475)])
   for c,h in [(10000,1.6),(8000,1.28),(6250,1)]:
    x=120+(10000-c)/3750*950;y=460-(h-.95)/.7*240
    d.ellipse((x-8,y-8,x+8,y+8),fill=GREEN);txt(x-25,y-50,str(h),28,FG,True);txt(x-45,495,f'{c:,}',23,MUT)
   line([(120,237),(627,347),(1070,443)],GREEN,5)
   line([(95,443),(1110,443)],RED,2);txt(350,165,'HF = collateral × 0.80 / 5,000' if eng else 'HF = garantía × 0,80 / 5.000',27)
   txt(55,540,'Collateral value falls; debt and threshold held constant.' if eng else 'Cae la garantía; deuda y umbral permanecen constantes.',23,MUT)
   alt='With debt 5,000 and threshold 80%, collateral values 10,000, 8,000 and 6,250 give health factors 1.6, 1.28 and 1.' if eng else 'Deuda 5.000 y umbral 80%: garantías de 10.000, 8.000 y 6.250 dan factores 1,6, 1,28 y 1.'
  elif id=='apr-apy-crypto':
   for i,(label,v,c) in enumerate([('Simple',1120,BLUE),('Monthly compounding' if eng else 'Capitalización mensual',1126.83,GREEN)]):
    y=230+i*125;txt(55,y,label,25);bar(450,y,600*v/1200,55,c);txt(940,y-37,f'{v:,.2f}',30,c,True)
   txt(55,485,'12% nominal → 12.68% effective' if eng else '12% nominal → 12,68% efectivo',32,GOLD,True)
   txt(55,535,'Initial 1,000 • Constant rate • No costs' if eng else 'Inicial 1.000 • Tasa constante • Sin gastos',23,MUT)
   alt='At a constant 12% nominal annual rate, 1,000 becomes 1,120 without reinvestment or 1,126.83 with monthly compounding before costs.' if eng else 'Al 12% nominal constante, 1.000 pasa a 1.120 sin reinvertir o 1.126,83 con capitalización mensual antes de gastos.'
  elif id=='nft-ownership-metadata':
   cards=[('TOKEN','Contract + ID' if eng else 'Contrato + ID'),('METADATA' if eng else 'METADATOS','URI / JSON'),('MEDIA' if eng else 'ARCHIVO','HTTPS / IPFS'),('RIGHTS' if eng else 'DERECHOS','License / service' if eng else 'Licencia / servicio')]
   for i,(a,b) in enumerate(cards):
    x=50+i*285;d.rounded_rectangle((x,230,x+250,400),radius=15,outline=[GREEN,BLUE,GOLD,RED][i],width=3);txt(x+18,265,a,25,[GREEN,BLUE,GOLD,RED][i],True);txt(x+18,325,b,21)
   txt(55,475,'Owning the token does not automatically transfer copyright.' if eng else 'Poseer el token no transfiere automáticamente derechos de autor.',25)
   txt(55,525,'Inspect each layer without signing.' if eng else 'Inspecciona cada capa sin firmar.',24,MUT)
   alt='Four distinct NFT layers: contract and token ID, metadata URI, media storage, and license or external service rights.' if eng else 'Cuatro capas de un NFT: contrato e identificador, URI de metadatos, archivo y licencia o derechos sobre servicios externos.'
  line([(50,580),(1150,580)],'#29414b',2);txt(50,596,foot,17,MUT)
  stem=OUT/f'{id}-{lang}';im.save(str(stem)+'.png',optimize=True);im.save(str(stem)+'.webp',quality=86,method=6);im.resize((640,336),Image.Resampling.LANCZOS).save(str(stem)+'-640.webp',quality=84,method=6)
  alts[(id,lang)]=alt
specs=json.loads((ROOT/'topics.json').read_text())
for spec in specs:
 for lang in ['en','es']:spec[lang]['alt']=alts[(spec['id'],lang)]
(ROOT/'topics.json').write_text(json.dumps(specs,ensure_ascii=False,indent=2)+'\n')
print('Created',len(labels)*2,'localized diagrams, each with WebP sizes and PNG social version')
