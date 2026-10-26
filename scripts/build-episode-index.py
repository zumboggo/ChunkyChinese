"""Build lightweight discovery metadata; never rewrite immutable episode packages."""
import json,base64,io
from pathlib import Path
from PIL import Image
catalog=Path('public/stories/animated/catalog.json');entries=json.loads(catalog.read_text())
out=Path('public/stories/animated/covers');out.mkdir(exist_ok=True)
for e in entries:
 p=json.loads((Path('stories/animated')/e['path']).read_text())
 summary={'title':p['title'],'description':p['description']}
 bg=next(iter(p['assets']['backgrounds'].values()),None)
 if bg:
  image=Image.open(io.BytesIO(base64.b64decode(bg['src'].split(',',1)[1]))).convert('RGB');image.thumbnail((600,340));image.save(out/(e['id']+'.webp'),quality=75)
  summary['cover']='stories/animated/covers/'+e['id']+'.webp'
 e['summary']=summary
catalog.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
print('Indexed',len(entries),'episodes without loading speech or cast in the library.')
