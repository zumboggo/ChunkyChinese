from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import math,json
ROOT=Path(__file__).resolve().parent
FRAMES=ROOT/'frames';FRAMES.mkdir(exist_ok=True)
PIX=ROOT.parent/'characters/alden-chibi-48'
neutral=Image.open(PIX/'master.png').convert('RGBA');surprise=Image.open(PIX/'surprised/2.png').convert('RGBA')
INK=(46,27,23,255);SKIN=(255,211,170,255);SHIRT=(184,182,181,255)
def xy(x,y):return(round((x-16)*46/30+24),round((y-31)*46/30+47))
emb=neutral.copy();d=ImageDraw.Draw(emb)
for a,b in [((14,14),(16,17)),((20,14),(22,17)),((16,19),(20,20))]:d.rectangle((*xy(*a),*xy(*b)),fill=SKIN)
for x in (14,20):
 d.line([xy(x+1,16),xy(x+2,16)],fill=INK,width=2)
 d.line([xy(x,14),xy(x+2,13)],fill=INK)
d.line([xy(17,20),xy(19,20),xy(20,19)],fill=INK,width=1)
source=Image.open(ROOT/'detailed-source.png').convert('RGBA').crop((220,0,1070,1100));source.thumbnail((200,228),Image.Resampling.LANCZOS)
base=Image.new('RGBA',(200,228));base.alpha_composite(source,((200-source.width)//2,228-source.height))
# Source features measured from the generated portrait before downsampling.
scale=source.width/850;top=228-source.height;left=(200-source.width)//2
EX=[(575-220)*scale+left,(755-220)*scale+left];EY=430*scale+top;MY=605*scale+top;MX=(665-220)*scale+left

def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
def state(t):
 s=ease((t-.2)/.3)*(1-ease((t-.85)/.35))
 e=ease((t-.85)/.55)
 return s,e

def cutout(s,e):
 angle=5*e-2*s;heady=8-3*s+2*e;eyeh=4+3*s-1.8*e;look=2.7*e
 browraise=5*s
 mouth=(f'<ellipse cx="103" cy="137" rx="{3+2*s}" ry="{2+5*s}" fill="#2e1b17"/>' if s>.35 else f'<path d="M93 139 Q103 {140+3*e} 113 {139-3*e}" fill="none" stroke="#2e1b17" stroke-width="2" stroke-linecap="round"/>')
 cheeks='<path d="M69 132 l3 3 m3 -4 l3 3 M126 131 l3 3 m3 -4 l3 3" stroke="#8b5637" stroke-width="1.3"/>' if e>.6 else ''
 return f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="228" viewBox="0 0 200 228">
 <g stroke="#2e1b17" stroke-width="2.5" stroke-linejoin="round">
 <path d="M16 228 L23 193 Q27 179 66 175 L132 175 Q173 180 178 194 L186 228" fill="#504e51"/>
 <path d="M74 170 L73 192 Q99 207 127 191 L125 169" fill="#ffd3aa"/>
 <path d="M66 189 Q100 207 134 189 L134 228 L66 228 Z" fill="#b8b6b5"/>
 <path d="M64 173 Q47 175 43 188 L66 207 L55 210 L68 228 L78 228 L76 193 Z M136 173 Q153 175 157 188 L134 207 L145 210 L132 228 L122 228 L124 193 Z" fill="#504e51"/>
 <path d="M67 205 L65 224 M135 205 L137 224" stroke="#b8b6b5" stroke-width="2"/>
 </g>
 <g transform="translate(0 {heady}) rotate({angle} 100 164)">
 <path d="M50 82 Q43 53 66 34 Q98 14 131 36 Q157 50 153 93 L147 143 L125 159 L74 157 L52 133 Z" fill="#8b5637" stroke="#2e1b17" stroke-width="3"/>
 <ellipse cx="52" cy="113" rx="9" ry="15" fill="#ffd3aa" stroke="#2e1b17" stroke-width="2"/>
 <ellipse cx="148" cy="113" rx="9" ry="15" fill="#ffd3aa" stroke="#2e1b17" stroke-width="2"/>
 <path d="M58 76 Q98 54 143 78 L141 126 Q137 151 104 168 Q70 154 60 129 Z" fill="#ffd3aa" stroke="#2e1b17" stroke-width="2.5"/>
 <path d="M44 85 L40 68 L51 60 L47 48 L64 47 L67 32 L82 37 Q100 20 117 30 L130 25 L134 40 L152 46 L149 60 L161 75 L146 80 L148 99 L136 91 L131 70 Q127 82 121 85 L111 63 L106 83 L93 64 Q82 83 70 89 L72 73 L60 101 L55 90 L49 111 Z" fill="#8b5637" stroke="#2e1b17" stroke-width="3" stroke-linejoin="round"/>
 <path d="M72 {94-browraise+e} Q80 {90-browraise-2*e} 89 {94-browraise-3*e} M111 {94-browraise-3*e} Q120 {90-browraise-2*e} 129 {94-browraise+e}" fill="none" stroke="#2e1b17" stroke-width="2.5" stroke-linecap="round"/>
 <ellipse cx="{81+look}" cy="{108+e}" rx="3.8" ry="{eyeh}" fill="#2e1b17"/>
 <ellipse cx="{121+look}" cy="{108+e}" rx="3.8" ry="{eyeh}" fill="#2e1b17"/>
 <path d="M100 117 l-2 7 5 0" fill="none" stroke="#8b5637" stroke-width="1.5"/>
 {mouth}{cheeks}</g></svg>'''

def detailed(s,e):
 def mapping(x,y):
  dx=dy=0
  for ex in EX:
   w=math.exp(-((x-ex)/10)**4-((y-EY)/7)**4)
   dy+=(y-EY)*(1/(1+.6*s)-1)*w-e*.8*w
   dx-=e*1.5*w
   w2=math.exp(-((x-ex)/12)**4-((y-(EY-9))/4)**4)
   dy+=(2.5*s+1.2*e)*w2
  # Smile corner displacement retains the illustration's real lip texture.
  wm=math.exp(-((x-MX)/12)**4-((y-MY)/5)**4)
  dy+=e*3.0*max(0,(x-MX)/10)*wm
  return x+dx,y+dy
 mesh=[]
 for y in range(0,228,4):
  for x in range(0,200,4):
   x1=min(200,x+4);y1=min(228,y+4)
   mesh.append(((x,y,x1,y1),(*mapping(x,y),*mapping(x,y1),*mapping(x1,y1),*mapping(x1,y))))
 im=base.transform(base.size,Image.Transform.MESH,mesh,Image.Resampling.BICUBIC)
 if s>.05:
  patch=Image.new('RGBA',im.size);pd=ImageDraw.Draw(patch)
  skin=base.getpixel((round(MX),round(MY-6)))[:3]
  pd.ellipse((MX-13,MY-4,MX+13,MY+5),fill=(*skin,round(255*s)))
  im.alpha_composite(patch.filter(ImageFilter.GaussianBlur(1)))
  layer=Image.new('RGBA',im.size);draw=ImageDraw.Draw(layer)
  # Bounded mouth opening over the existing closed-lip line.
  rx=3+2*s;ry=4*s
  draw.ellipse((MX-rx,MY-ry,MX+rx,MY+ry),fill=(65,33,29,round(245*s)))
  im.alpha_composite(layer)
 if e>.05:
  layer=Image.new('RGBA',im.size);draw=ImageDraw.Draw(layer)
  for x in (EX[0]-3,EX[1]+3):draw.ellipse((x-6,EY+12,x+6,EY+17),fill=(200,108,96,round(65*e)))
  im.alpha_composite(layer.filter(ImageFilter.GaussianBlur(2)))
 return im

manifest={'durationMs':1800,'frameMs':100,'styles':['pixel','cutout','detailed'],'reaction':'neutral → surprised → embarrassed → hold','paletteNote':'Pixel and cutout preserve the five-color design roles. Detailed portrait uses shaded artwork. All are design previews, not hardware palette or performance tests.'}
for i in range(19):
 s,e=state(i/10)
 # Pixel version uses deliberate discrete poses; vector/portrait use interpolated motion.
 im=emb if e>.65 else surprise if s>.3 else neutral
 pixel=Image.new('RGBA',(200,228));up=im.resize((192,192),Image.Resampling.NEAREST)
 pixel.alpha_composite(up,(4,32-(4 if s>.6 and i<6 else 0)))
 pixel.save(FRAMES/f'pixel-{i:02}.png')
 (FRAMES/f'cutout-{i:02}.svg').write_text(cutout(s,e))
 detailed(s,e).save(FRAMES/f'detailed-{i:02}.png')
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared 19 synchronized poses per style.')
