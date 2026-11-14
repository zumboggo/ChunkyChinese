"""Reusable Shonen Alden cutout rig: one identity, six finite parameter animations."""
from pathlib import Path
import math,json
ROOT=Path(__file__).resolve().parent
EMOTIONS=['blink','surprised','thinking','talking','laughing','worried']
LABELS=['Blink / idle','Surprised','Thinking','Talking','Laughing','Worried / confused']
PALETTE={'ink':'#2e1b17','hair':'#8b5637','hoodie':'#504e51','shirt':'#b8b6b5','skin':'#ffd3aa'}
DURATION=1800;STEP=100

def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
def state(emotion,t):
 a=ease((t-.18)/.42)
 p=dict(tilt=0,dy=0,gaze=0,open=1,brow=0,asym=0,mouth=0,smile=.12,happy=0,worry=0)
 if emotion=='blink':
  p['open']=1-ease((t-.35)/.16)*(1-ease((t-.57)/.18))
 elif emotion=='surprised':
  p.update(open=1+.7*a,brow=6*a,mouth=.75*a,smile=0,dy=-2.5*math.sin(math.pi*min(1,max(0,(t-.18)/.65))))
 elif emotion=='thinking':
  p.update(tilt=-4*a,gaze=-3*a,open=1-.14*a,brow=a,asym=3*a,smile=-.15*a)
 elif emotion=='talking':
  v=max(0,math.sin((t-.18)*math.pi*5)) if .18<t<1.3 else 0
  p.update(mouth=.45*v,smile=.18,gaze=.4*math.sin(t*3) if t<1.3 else 0)
 elif emotion=='laughing':
  p.update(happy=a,mouth=.95*a,smile=a,brow=2*a,tilt=-2*a,dy=-1.7*abs(math.sin((t-.18)*math.pi*3))*a if t<1.2 else 0)
 elif emotion=='worried':
  p.update(worry=a,gaze=2*a,open=1-.2*a,tilt=3*a,asym=2*a,smile=-.5*a)
 return p

def svg(emotion,t):
 p=state(emotion,t);ink=PALETTE['ink'];skin=PALETTE['skin'];shirt=PALETTE['shirt']
 # Shared almond eye geometry. The white sclera is transparent: white comes from the backdrop.
 eyes='';holes=''
 for side,cx in enumerate([80,122]):
  openness=p['open'];half=6.0*openness
  ey=109
  if p['happy']>.5:
   eyes+=f'<path d="M{cx-12} {ey+1} Q{cx} {ey-11*p["happy"]} {cx+12} {ey+1}" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round"/>'
  elif openness<.2:
   eyes+=f'<path d="M{cx-12} {ey} Q{cx} {ey+3} {cx+12} {ey}" fill="none" stroke="{ink}" stroke-width="2.5" stroke-linecap="round"/>'
  else:
   shape=f'M{cx-13} {ey} Q{cx-2} {ey-2*half} {cx+13} {ey} Q{cx+1} {ey+half*1.5} {cx-13} {ey} Z'
   holes+=f'<path d="{shape}" fill="black"/>'
   clip=f'eye{side}'
   eyes+=f'<defs><clipPath id="{clip}"><path d="{shape}"/></clipPath></defs><g clip-path="url(#{clip})"><ellipse cx="{cx+p["gaze"]}" cy="{ey+1}" rx="4.5" ry="{7*openness}" fill="{PALETTE["hair"]}"/><ellipse cx="{cx+p["gaze"]}" cy="{ey+1}" rx="2.5" ry="{5*openness}" fill="{ink}"/><circle cx="{cx+p["gaze"]-1.8}" cy="{ey-1.5}" r="1.5" fill="{skin}"/></g><path d="{shape}" fill="none" stroke="{ink}" stroke-width="2"/>'
 # Eyebrows vary asymmetrically, with raised inner ends for concern.
 b=p['brow'];asym=p['asym'];w=p['worry']
 brows=f'<path d="M67 {98-b+asym+w*2} Q78 {92-b-asym-w*3} 91 {97-b-asym-w*4} M109 {97-b+asym-w*4} Q121 {92-b+asym-w*3} 135 {98-b-asym+w*2}" fill="none" stroke="{ink}" stroke-width="2.7" stroke-linecap="round"/>'
 mo=p['mouth'];sm=p['smile'];mouth=''
 if mo>.1:
  width=5+10*max(0,sm)+4*mo;depth=3+14*mo
  mouth=f'<path d="M{102-width} 137 Q102 {134-2*sm} {102+width} 137 Q{102+width-2} {139+depth} 102 {140+depth} Q{104-width} {139+depth} {102-width} 137 Z" fill="{ink}" stroke="{ink}" stroke-width="1.8"/>'
  if emotion=='surprised':mouth=f'<ellipse cx="102" cy="142" rx="{5+2*mo}" ry="{4+7*mo}" fill="{ink}"/>'
  if sm>.4:
   mouth+=f'<path d="M{103-width} 137 Q102 134 {101+width} 137 L{99+width} 141 Q102 143 {105-width} 141 Z" fill="{shirt}"/><path d="M{105-width} {139+depth-2} Q102 {132+depth} {99+width} {139+depth-2} Q102 {143+depth} {105-width} {139+depth-2}" fill="{skin}"/>'
 else:
  mouth=f'<path d="M93 139 Q102 {139+7*sm} 112 {138-sm}" fill="none" stroke="{ink}" stroke-width="2" stroke-linecap="round"/>'
 return f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="228" viewBox="0 0 200 228" role="img" aria-label="Alden {emotion}">
 <g id="body" stroke="{ink}" stroke-width="2.5" stroke-linejoin="round">
 <path d="M24 228 L29 194 Q32 182 65 175 L135 175 Q168 182 171 194 L176 228" fill="{PALETTE['hoodie']}"/>
 <path d="M77 164 L75 192 Q100 208 126 192 L124 164" fill="{skin}"/>
 <path d="M65 188 Q100 207 136 188 L136 228 L65 228 Z" fill="{shirt}"/>
 <path d="M64 174 Q44 175 40 188 L62 207 L53 212 L66 228 L79 228 L77 194 Z M137 174 Q157 175 161 188 L139 207 L148 212 L135 228 L122 228 L124 194 Z" fill="{PALETTE['hoodie']}"/>
 <path d="M68 205 L66 225 M134 205 L136 225" stroke="{shirt}" stroke-width="2.5"/>
 </g>
 <g id="head" transform="translate(0 {18+p['dy']}) rotate({p['tilt']} 101 163)">
 <path d="M51 100 Q40 70 54 50 Q65 35 82 36 Q99 24 126 36 Q147 43 153 63 L148 85 L149 113 L139 137 L64 138 L52 117 Z" fill="{PALETTE['hair']}" stroke="{ink}" stroke-width="2.5" mask="url(#face)"/>
 <ellipse cx="54" cy="113" rx="8" ry="13" fill="{skin}" stroke="{ink}" stroke-width="2"/>
 <ellipse cx="147" cy="113" rx="8" ry="13" fill="{skin}" stroke="{ink}" stroke-width="2"/>
 <defs><mask id="face"><rect width="200" height="228" fill="white"/>{holes}</mask></defs>
 <path id="face-base" d="M59 77 Q101 57 142 78 L140 126 Q136 147 103 164 Q74 150 61 127 Z" fill="{skin}" stroke="{ink}" stroke-width="2.5" mask="url(#face)"/>
 <path id="fringe" d="M47 99 Q39 76 49 60 L44 64 Q48 47 69 43 Q71 30 93 30 Q126 28 151 50 L142 48 Q155 61 154 74 L149 69 L151 100 L142 114 L141 88 Q124 83 111 67 Q117 88 130 94 Q108 90 94 71 L100 94 Q85 84 78 70 Q72 91 63 99 L63 82 L55 113 Z" fill="{PALETTE['hair']}" stroke="{ink}" stroke-width="2.5" stroke-linejoin="round"/>
 <path d="M87 43 Q104 56 128 60 M97 51 Q118 68 143 72" fill="none" stroke="{ink}" stroke-width="1.3"/>
 {brows}{eyes}
 <path d="M102 119 l-1 6 3 0" fill="none" stroke="{ink}" stroke-width="1.3" stroke-linecap="round"/>
 {mouth}
 </g></svg>'''

def main():
 manifest={'character':'Alden','style':'Shonen cutout','palette':PALETTE,'background':'Transparent; white eye apertures reveal the page background','durationMs':DURATION,'frameMs':STEP,'playback':'once then hold; no automatic idle loop','animations':{}}
 for e,label in zip(EMOTIONS,LABELS):
  folder=ROOT/e;folder.mkdir(exist_ok=True)
  for i in range(DURATION//STEP+1):(folder/f'{i:02}.svg').write_text(svg(e,i*STEP/1000))
  manifest['animations'][e]={'label':label,'frameCount':DURATION//STEP+1,'parameters':[state(e,i*STEP/1000) for i in range(DURATION//STEP+1)]}
 (ROOT/'master.svg').write_text(svg('blink',0))
 (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':main()
