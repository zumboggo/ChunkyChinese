"""Resample the same existing recording; both A/B outputs use signed 8-bit mono PCM."""
from pathlib import Path
import json,base64,subprocess,wave,struct,hashlib,tempfile
p=Path(__file__).resolve().parent
phrase='你打算每天都这样吗？'
pack=json.loads((p.parents[1]/'stories/animated/supportive-13.json').read_text());line=pack['chinese']['lines'][phrase]
source=p/'audio/source.m4a';source.write_bytes(base64.b64decode(line['audio'].split(',')[1]))
meta={'phrase':phrase,'pinyin':line['pinyin'],'english':'Are you going to do this every day?','source':'Existing Episode 13 Mandarin audio; no new synthesis','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'formats':[]}
with tempfile.TemporaryDirectory() as tmp:
 decoded=Path(tmp)/'source.wav';subprocess.run(['/usr/bin/afconvert','-f','WAVE','-d','LEI16',str(source),str(decoded)],check=True)
 for rate in [8000,16000]:
  wav=Path(tmp)/f'{rate}.wav';subprocess.run(['/usr/bin/afconvert','-f','WAVE','-d',f'LEI16@{rate}','-c','1',str(decoded),str(wav)],check=True)
  data=wav.read_bytes();pos=12;raw=None
  while pos+8<=len(data):
   tag=data[pos:pos+4];length=struct.unpack_from('<I',data,pos+4)[0]
   if tag==b'data':raw=data[pos+8:pos+8+length]
   pos+=8+length+(length%2)
  assert raw is not None and len(raw)%2==0
  values=struct.unpack('<'+'h'*(len(raw)//2),raw);signed=bytes((v>>8)&255 for v in values);(p/'resources'/f'phrase-{rate}.pcm').write_bytes(signed)
  with wave.open(str(p/'audio'/f'chinese-{rate}.wav'),'wb') as w:w.setparams((1,1,rate,0,'NONE','not compressed'));w.writeframes(bytes(b^128 for b in signed))
  meta['formats'].append({'rate':rate,'bits':8,'bytes':len(signed),'seconds':len(signed)/rate})
(p/'audio/manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print(json.dumps(meta,ensure_ascii=False))
