from pathlib import Path
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parent
def sample(path):
 im=Image.open(path);frames=[];durations=[]
 for i in range(im.n_frames):im.seek(i);frames.append(im.convert('RGB'));durations.append(im.info.get('duration',140))
 output=[]
 for n in range(31):
  t=n*140;at=0
  for i,d in enumerate(durations):
   at+=d
   if t<at:break
  output.append(frames[i])
 return output
old=sample(r.parent/'hybrid-prototype/preview/emulator-colors.gif');a=sample(r/'16/reaction.gif');b=sample(r/'8/reaction.gif');result=[]
for i in range(31):
 canvas=Image.new('RGB',(648,267),'#f4f0e8');d=ImageDraw.Draw(canvas)
 for j,(name,im) in enumerate(zip(['Previous / 45,244 B','16 colours / 3,872 B','8 colours / 2,990 B'],[old[i],a[i],b[i]])):
  x=8+j*216;d.text((x+15,9),name,fill='black')
  panel=Image.new('RGB',(200,228),'white')
  if j==0:panel.paste(im,(0,0))
  else:panel.paste(im.resize((192,192),Image.Resampling.NEAREST),(4,12))
  canvas.paste(panel,(x,31))
 result.append(canvas)
result[0].save(r/'three-way.gif',save_all=True,append_images=result[1:],duration=140,loop=0,disposal=2)
result[18].save(r/'three-way-embarrassed.png')
