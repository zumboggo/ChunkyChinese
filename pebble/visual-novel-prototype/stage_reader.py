"""Freeze a private reader snapshot; no modifications to the active reader checkout."""
from pathlib import Path
import shutil,json,hashlib
r=Path(__file__).resolve().parent;src=r.parent/'reader';dst=r/'.local/reader-lab'
if dst.exists():shutil.rmtree(dst)
shutil.copytree(src,dst,ignore=shutil.ignore_patterns('build','.lock-*','.waf*'))
baseline=r/'.local/reader-baseline'
if baseline.exists():shutil.rmtree(baseline)
shutil.copytree(dst,baseline)
hashes={str(p.relative_to(src)):hashlib.sha256(p.read_bytes()).hexdigest() for p in src.rglob('*') if p.is_file() and 'build' not in p.relative_to(src).parts and not p.name.startswith('.lock')}
(r/'verification/reader-source.json').write_text(json.dumps(hashes,indent=2)+'\n')
p=dst/'package.json';j=json.loads(p.read_text());j['pebble']['displayName']='Scene Reader Lab';j['pebble']['uuid']='9a93b5a1-f2de-478b-a4ee-78689c78c2e8';j['pebble']['resources']['media'].append({'type':'raw','name':'STAGE_ALDEN','file':'stage-alden.bin'});p.write_text(json.dumps(j,indent=2)+'\n');shutil.copy2(r/'resources/alden.bin',dst/'resources/stage-alden.bin')
for name in ['stage.h','tracks.h','parts.h']:shutil.copy2(r/'src/c'/name,dst/'src/c'/name)
s=(r/'src/c/main.c').read_text().replace('RESOURCE_ID_ALDEN','RESOURCE_ID_STAGE_ALDEN')
# Reader owns focus and buttons; only the renderer and one timer are added.
a=s.index('static void up(');s=s[:a]+'''
void stageLabFocus(bool value){focused=value;cancel();if(value&&canvas&&!layer_get_hidden(canvas))schedule();}
uint32_t stageLabReady(void){return held?1:0;}
void stageLabMotion(uint32_t enabled){mode=enabled?3:0;if(canvas){cancel();layer_mark_dirty(canvas);if(!layer_get_hidden(canvas))schedule();}}
void showStageLab(uint32_t id){
 cancel();if(!id){if(canvas)layer_set_hidden(canvas,true);return;}
 if(!canvas){canvas=layer_create(GRect(0,0,200,228));layer_set_update_proc(canvas,draw);}
 shot=id-200;action_ms=ambient_ms=0;held=false;focused=true;
 layer_remove_from_parent(canvas);layer_add_child(window_get_root_layer(window_stack_get_top_window()),canvas);layer_set_hidden(canvas,false);replay();
}
void destroyStageLab(void){cancel();if(canvas){layer_destroy(canvas);canvas=NULL;}}
''';s=s.replace('static Window *window;','');(dst/'src/c/stage_lab.c').write_text(s)
p=dst/'src/c/scenes.c';s=p.read_text();s='extern void showStageLab(uint32_t id);\nextern uint32_t stageLabReady(void);\nextern void stageLabFocus(bool focus);\nextern void stageLabMotion(uint32_t enabled);\nextern void destroyStageLab(void);\nstatic uint32_t stage_lab_id;\n'+s
# Include pebble types before declarations.
s=s.replace('#include <pebble.h>','',1);s='#include <pebble.h>\n'+s
s=s.replace('static void focus_changed(bool focus){','static void focus_changed(bool focus){\n stageLabFocus(focus);')
s=s.replace('void setBackgroundMotion(uint32_t enabled){','void setBackgroundMotion(uint32_t enabled){\n stageLabMotion(enabled);')
s=s.replace('void showScene(uint32_t id){','''void showScene(uint32_t id){
 stage_lab_id=0;showStageLab(0);
 if(id>=200&&id<=202){if(timer){app_timer_cancel(timer);timer=NULL;}scene_id=0;if(canvas)layer_set_hidden(canvas,true);stage_lab_id=id;showStageLab(id);return;}
''')
s=s.replace('uint32_t sceneSelect(void){','uint32_t sceneSelect(void){\n if(stage_lab_id)return stageLabReady();')
s=s.replace('void destroyScenes(void){','void destroyScenes(void){destroyStageLab();')
p.write_text(s)
p=dst/'src/embeddedjs/main.js';s=p.read_text();s=s.replace("['Resume','Refresh episode','Animations',","['Scene lab: reaction','Scene lab: fry','Scene lab: phone','Resume','Refresh episode','Animations',")
s=s.replace('const chosen=items[menuIndex];',"const chosen=items[menuIndex];\n   if(chosen.startsWith('Scene lab:')){stopScene();previewScene=200+menuIndex;closeOverlay();draw();return;}")
s=s.replace("function previewReturn(){previewScene=0;overlay='scene-list';menuIndex=previewIndex;}","function previewReturn(){if(previewScene>=200){previewScene=0;overlay='menu';menuIndex=0;return;}previewScene=0;overlay='scene-list';menuIndex=previewIndex;}")
p.write_text(s);print(dst)
