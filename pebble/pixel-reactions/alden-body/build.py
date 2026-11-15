"""Pack authored body pieces in Alden's unchanged eight-colour palette.
Source rows are one logical pixel; native scenes display them at 2x.
"""
from pathlib import Path
import json,struct,math
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
def compile_body():
 pal=json.loads((ROOT/'pixel-reactions/alden-sincere/manifest.json').read_text())['palette']
 original=Image.open(ROOT/'pixel-reactions/alden-sincere/patches/body.png').convert('RGB')
 # Continue the last visible source row; taper at the waist, not the crop seam.
 base=[pal.index(list(original.getpixel((x,62)))) for x in range(64)]
 rows=[]
 for y in range(27):
  row=base[:];left=6+y//12;right=56-y//12
  for x in range(64):
   if x<left or x>right:row[x]=8
   elif x in (left,right):row[x]=0
   elif row[x]==7:row[x]=0
  # Subtle sleeve creases and pocket edges; no new shade or dithering.
  if 7<=y<=10:row[12+(y-7)//2]=0
  if 11<=y<=13:row[50-(y-11)//2]=0
  if 16<=y<=21:row[17-(y-16)//2]=0;row[47+(y-16)//2]=0
  if y in (23,24):
   for x in range(23,44):row[x]=0 if x in (23,43) or y==23 else row[x]
  rows.append(''.join('.' if n==8 else str(n) for n in row))
 pieces={'torso':rows,
 'sleeve':['..00000..','.0444440.','044444440','044444440','044444440','044444440','044444440','044444440','044444440','044444440','.0444440.','.0440440.','.0444440.','.0444440.','.0444440.','.0000000.','.0444440.','..00000..'],
 'grip':['...0000...','..022220..','.02222220.','0222222220','0222222220','0233322220','0222222220','0233322220','.02222220.','..022220..','..022220..','...0000...'],
 'palm':['....00.00......','..002202200....','.022222222200..','.022222222220..','0222222222220..','0222322322220..','0222322322220..','0222322322220..','0222322322220..','0222322322220..','0222222222220..','0222222222220..','0222222222220..','022222222222000','022222222222220','022222222222220','.0222222222220.','.022222222220..','..0222222220...','...02222220....','...00000000....','...04444440....','...04444440....','....000000.....'],
 'cup':['.000000000000....','05555555555550...','0577777777755000.','05555555555550440','05555555555550440','05555555555550.40','05555555555550.40','05555555555550.40','05555555555550.40','05555555555550440','0555555555555000.','05555555555550...','05555555555550...','.055555555550....','..0000000000.....']}
 # Pre-rasterized sleeve orientations: reuse one authored texture, no runtime transform.
 pieces['palm-mirrored']=[row[::-1] for row in pieces['palm']]
 anchors={}
 sleeve=pieces['sleeve']
 for length in [12,24,40]:
  for direction in range(16):
   angle=direction*math.pi/8;dx,dy=math.cos(angle),math.sin(angle)
   # Direction is shoulder -> wrist; extend the proximal end for hidden overlap.
   ex,ey=-dx*(length+3),-dy*(length+3)
   lo=math.floor(min(0,ex)-5);hi=math.ceil(max(0,ex)+5);top=math.floor(min(0,ey)-5);bottom=math.ceil(max(0,ey)+5)
   raster=[]
   for y in range(top,bottom+1):
    row=''
    for x in range(lo,hi+1):
     along=-(x*dx+y*dy);cross=x*dy-y*dx
     xx=4+round(cross);yy=17-int(along*18/(length+3))
     row+=sleeve[yy][xx] if 0<=along<length+3 and 0<=xx<9 and 0<=yy<18 else '.'
    raster.append(row)
   # Crop transparent margins and retain the wrist anchor in source pixels.
   pts=[(x,y) for y,row in enumerate(raster) for x,c in enumerate(row) if c!='.'];x0=min(x for x,y in pts);x1=max(x for x,y in pts);y0=min(y for x,y in pts);y1=max(y for x,y in pts)
   name=f'sleeve-{length}-{direction}';pieces[name]=[row[x0:x1+1] for row in raster[y0:y1+1]];anchors[name]=[-lo-x0,-top-y0]
 out=ROOT/'pixel-reactions/alden-body';parts=[];manifest=[]
 for name,rows in pieces.items():
  w=len(rows[0]);h=len(rows);assert all(len(r)==w for r in rows),name
  im=Image.new('RGBA',(w,h));stride=(w*3+7)//8;ms=(w+7)//8;anchor=anchors.get(name,[0,0]);data=bytearray([anchor[0]&255,anchor[1]&255,w,h,7]);masks=bytearray()
  for y,row in enumerate(rows):
   bits=0;mask=0
   for x,c in enumerate(row):
    n=0 if c=='.' else int(c);bits=(bits<<3)|n;mask=(mask<<1)|(c!='.')
    if c!='.':im.putpixel((x,y),tuple(pal[n])+ (255,))
   data+=(bits<<(stride*8-w*3)).to_bytes(stride,'big');masks+=(mask<<(ms*8-w)).to_bytes(ms,'big')
  colors=data[5:];rows_raw=[colors[y*stride:(y+1)*stride]+masks[y*ms:(y+1)*ms] for y in range(h)];packed=bytearray();y=0
  while y<h:
   repeat=1
   while y+repeat<h and rows_raw[y+repeat]==rows_raw[y]:repeat+=1
   packed+=bytes([repeat])+rows_raw[y];y+=repeat
  data=data[:5]+packed;parts.append(data);im.save(out/(name+'.png'));manifest.append({'name':name,'width':w,'height':h,'bytes':len(data)})
 blob=bytearray(b'AS64'+bytes([1,len(parts),8,3])+bytes(sum(pal,[])));at=32+4*len(parts)
 for p in parts:blob+=struct.pack('<I',at);at+=len(p)
 blob+=b''.join(parts);(out/'pieces.bin').write_bytes(blob)
 (out/'manifest.json').write_text(json.dumps({'palette':pal,'pieces':manifest,'bytes':len(blob),'scale':2},indent=2)+'\n')
 return blob
if __name__=='__main__':print(len(compile_body()))
