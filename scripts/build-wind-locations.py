from PIL import Image,ImageDraw
from pathlib import Path
out=Path('public/stories/animated/locations/wind-v1')
for kind in ['waystone','mews','mains','mess']:
 im=Image.new('RGB',(1600,900),'#b3a58d');d=ImageDraw.Draw(im)
 d.rectangle((0,570,1600,900),fill='#6c594a');d.polygon([(0,570),(1600,570),(1600,660),(0,620)],fill='#504438')
 for x in range(-1200,2800,160):d.line((800,570,x,900),fill='#54463c',width=4)
 for y in [650,760,885]:d.line((0,y,1600,y),fill='#504438',width=4)
 for x in [0,440,1050,1540]:d.rectangle((x,0,x+38,580),fill='#594c40');d.line((x+38,0,x+38,580),fill='#303936',width=5)
 d.rectangle((0,0,1600,54),fill='#4b443d')
 if kind=='waystone':
  d.rectangle((0,54,1600,570),fill='#93836d')
  for x in [0,440,1050,1540]:d.rectangle((x,54,x+38,570),fill='#50453a')
  d.rounded_rectangle((70,165,350,535),35,fill='#59584f',outline='#303936',width=9);d.rounded_rectangle((120,275,300,525),25,fill='#242e2d');d.rectangle((65,515,355,550),fill='#393e37')
  d.rectangle((660,115,875,340),fill='#2b4048',outline='#3a3932',width=12)
  for x in [715,770,825]:d.line((x,115,x,340),fill='#8b8d7a',width=4)
  d.line((660,225,875,225),fill='#8b8d7a',width=4)
  d.rectangle((1190,150,1400,560),fill='#3c3e35',outline='#544638',width=12)
  d.rectangle((470,435,1160,570),fill='#71503a',outline='#343731',width=5);d.rounded_rectangle((450,415,1180,445),8,fill='#a4774b',outline='#343731',width=6)
  for x in [520,1015]:
   d.ellipse((x-30,350,x+30,410),fill='#c1a25f');d.rectangle((x-10,330,x+10,375),fill='#e8c676');d.line((x,322,x,300),fill='#2d352f',width=4)
 elif kind=='mews':
  for x in [50,1100]:
   d.rectangle((x,170,x+390,480),fill='#b3a58d',outline='#4c463c',width=12)
   for y in [285,465]:d.rectangle((x,y,x+390,y+24),fill='#65503e');d.rounded_rectangle((x+20,y-24,x+365,y),8,fill='#ddcfb3')
   for y in range(280,560,48):d.line((x+350,y,x+400,y),fill='#564635',width=10)
  d.rectangle((715,130,860,350),fill='#62828b',outline='#514b3d',width=12);d.line((785,130,785,350),fill='#d1c4a4',width=5)
  d.rectangle((540,450,690,555),fill='#675140',outline='#333a35',width=5);d.rectangle((600,470,625,500),fill='#b1a078')
 elif kind=='mains':
  d.rectangle((480,150,1120,390),fill='#3e504b',outline='#544a3c',width=16)
  for y in [470,510,555]:d.polygon([(0,y),(340,y-40),(1260,y-40),(1600,y),(1600,y+24),(0,y+24)],fill='#7a6249',outline='#414138',width=4)
  d.rectangle((570,430,1030,485),fill='#817f70',outline='#343d36',width=5)
 elif kind=='mess':
  for x in [180,640,1100]:
   d.rectangle((x,140,x+180,330),fill='#72939a',outline='#514c3e',width=10);d.line((x+90,140,x+90,330),fill='#d1c4a4',width=4)
  for x in [80,950]:d.polygon([(x,405),(x+420,405),(x+510,570),(x-70,570)],fill='#8d6d48',outline='#3d4035',width=6)
 im.save(out/(kind+'.webp'),quality=90)
