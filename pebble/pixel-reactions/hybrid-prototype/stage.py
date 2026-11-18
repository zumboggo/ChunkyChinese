"""Build an isolated copy of the full reader; never modifies the release source/PBW."""
from pathlib import Path
import shutil,json
r=Path(__file__).resolve().parent;pebble=r.parent.parent;dst=r.parent/'.local/hybrid-reader'
if dst.exists():shutil.rmtree(dst)
shutil.copytree(pebble/'reader',dst,ignore=shutil.ignore_patterns('build','.lock-*','.waf*'))
p=dst/'package.json';j=json.loads(p.read_text());j['version']='1.9.2';j['pebble']['displayName']='Alden Lab';j['pebble']['uuid']='a7b670c8-0444-4d13-a4d2-985da22c17aa';j['pebble']['resources']['media'].append({'type':'raw','name':'ALDEN_HYBRID','file':'alden.layers'});p.write_text(json.dumps(j,indent=2)+'\n')
shutil.copy(r/'alden.layers',dst/'resources/alden.layers');shutil.copy(r/'hybrid.inc',dst/'src/c/hybrid.inc')
p=dst/'src/c/portrait.c';s=p.read_text().replace('static void draw_portrait','\n#include "hybrid.inc"\nstatic void draw_portrait',1)
s=s.replace(' handle=resource_get_handle(s_resource);',' if(s_actor==99){hybrid_draw(ctx);return;}\n handle=resource_get_handle(s_resource);')
s=s.replace(' if(!resource){',' hybrid_cancel();\n if(!resource){')
s=s.replace('s_resource=resource;s_actor=actor;','s_resource=resource;s_actor=actor;if(actor==99)hybrid_start();')
s=s.replace('void destroyPortrait(void){','void destroyPortrait(void){hybrid_cancel();')
p.write_text(s)
p=dst/'src/c/scenes.c';s=p.read_text().replace('static void focus_changed(bool focus){','extern void hybridFocus(bool focus);\nstatic void focus_changed(bool focus){\n hybridFocus(focus);');p.write_text(s)
p=dst/'src/embeddedjs/manifest.json';j=json.loads(p.read_text());j['ffi']['functions']['portraitReady']={'arguments':[],'returns':'uint32_t'};p.write_text(json.dumps(j,indent=2)+'\n')
p=dst/'src/embeddedjs/main.js';s=p.read_text();s=s.replace('function menuItems()',"let hybridPreview=false;\nfunction menuItems()")
s=s.replace("['Resume','Refresh episode','Animations',","['Alden prototype','Resume','Refresh episode','Animations',")
s=s.replace('function draw(){','function draw(){\n if(hybridPreview)return;')
s=s.replace('function input(type){',"""function input(type){
 if(hybridPreview){
  if(type==='down')graphics.showPortrait(1,99);
  else if(type==='back'||(type==='select'&&graphics.portraitReady())){hybridPreview=false;graphics.showPortrait(0,0);draw();}
  return;
 }
""")
s=s.replace("const chosen=items[menuIndex];", """const chosen=items[menuIndex];
   if(chosen==='Alden prototype'){stopScene();graphics.showScene(0);hybridPreview=true;Debug.gc();graphics.showPortrait(1,99);return;}
""")
p.write_text(s)
print(dst)
