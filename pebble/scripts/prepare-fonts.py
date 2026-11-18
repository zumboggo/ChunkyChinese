"""Create redistributable static subsets from OFL Noto Sans SC. No learner data is included."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
root=Path(__file__).resolve().parents[1]
assets=root/'reader/src/embeddedjs/assets'
glyphs=(root/'content/glyphs.txt').read_text()
font=TTFont(assets/'NotoSansSC.ttf')
font=instantiateVariableFont(font,{'wght':400},inplace=True)
for name,characters in [('chinese',glyphs),('latin',''.join(c for c in glyphs if not '\u3400'<=c<='\u9fff'))]:
 import copy
 f=copy.deepcopy(font); sub=subset.Subsetter();sub.populate(text=characters);sub.subset(f)
 cmap=f.getBestCmap();missing=[c for c in characters if ord(c) not in cmap and not c.isspace()]
 if missing:raise ValueError('Missing glyphs: '+repr(missing))
 f.save(assets/(name+'.ttf'));print(name,len(cmap),(assets/(name+'.ttf')).stat().st_size)
