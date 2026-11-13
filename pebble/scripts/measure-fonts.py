"""Export the FreeType advance widths used by Pebble's native font generator."""
from pathlib import Path
import json,freetype
root=Path(__file__).resolve().parents[1]
glyphs=(root/'content/glyphs.txt').read_text();result={}
for key,name,size in [('py','latin',24),('en','latin',20),('zh','chinese',28)]:
 face=freetype.Face(str(root/'reader/resources/fonts'/f'{name}.ttf'));face.set_pixel_sizes(0,size);widths={}
 for c in glyphs:
  if face.get_char_index(ord(c)):
   face.load_char(c,freetype.FT_LOAD_RENDER|freetype.FT_LOAD_TARGET_MONO)
   widths[c]=face.glyph.advance.x//64
 result[key]=widths
(root/'content/font-metrics.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print('Recorded font advances')
