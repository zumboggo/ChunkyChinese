#include <pebble.h>
#include <stdlib.h>
// The episode renderer replaces the former articulated/full-body engine.
// Portraits and scenes share one streamed resource and 512-byte read cache.
extern void scenePortraitDraw(GContext *,uint32_t,uint32_t,uint32_t,int,int);
extern void scenePortraitReset(void);
extern void reactionFocus(bool);
static GContext *ctx;
static void rect(int x,int y,int w,int h,uint32_t c){
 graphics_context_set_fill_color(ctx,GColorFromRGB(((c>>16)&255)+42>255?255:((((c>>16)&255)+42)/85)*85,((c>>8)&255)+42>255?255:((((c>>8)&255)+42)/85)*85,(c&255)+42>255?255:(((c&255)+42)/85)*85));
 graphics_fill_rect(ctx,GRect(x,y,w,h),0,GCornerNone);
}
static void portrait(unsigned who,unsigned emotion,uint32_t t,int hx,int hy){
 static const uint8_t gorgon[]={0,1,2,4,5,3},young[]={0,1,3,0,1,4};
 scenePortraitDraw(ctx,who,who==4?gorgon[emotion]:who==5?young[emotion]:emotion,t,hx,hy);
}
#include "visual_novel_draw.h"
// Keep schema-1 recipe downloads and their validated bounded channels.
typedef struct {uint16_t t;float dy,hx,hy,angle;} GestureKey;
#include "downloadable_scene.h"
static DownloadScene downloaded;
static Layer *canvas;
static AppTimer *timer;
static uint32_t scene_id,elapsed,scene_time,last_time,hold_elapsed,frames,render_total,render_max;
static bool focused=true,background_motion=true,subscribed;
typedef enum {ESTABLISH,WAITING,PLAYING,HOLD} Phase;
static Phase phase;
static uint32_t now_ms(void){time_t s;uint16_t ms;time_ms(&s,&ms);return (uint32_t)s*1000+ms;}
static uint32_t scene_duration(void){return scene_id==DOWNLOADED_SCENE?downloaded.keys[downloaded.count-1].t:vn_scenes[scene_id].duration;}
static int scene_setting_id(void){return scene_id==DOWNLOADED_SCENE?downloaded.setting:vn_scenes[scene_id].setting;}
static int scene_ambient_id(void){return scene_id==DOWNLOADED_SCENE?downloaded.ambient:vn_scenes[scene_id].ambient;}
static VNKey download_pose(int *hx){
 int i=1;while(i<downloaded.count-1&&elapsed>downloaded.keys[i].t)i++;
 GestureKey a=downloaded.keys[i-1],b=downloaded.keys[i];float f=elapsed>=b.t?1:(float)(elapsed-a.t)/(b.t-a.t);f=f*f*(3-2*f);
 // Retain schema-1 deltas in the closer framing, with the elbow below the crop.
 float dy=a.dy+(b.dy-a.dy)*f,angle=a.angle+(b.angle-a.angle)*f;
 *hx=(int)(angle*10);return (VNKey){0,150+(int)(a.hx+(b.hx-a.hx)*f),194+(int)(a.hy+(b.hy-a.hy)*f),2,(int)dy};
}
static void draw(Layer *layer,GContext *context){
 (void)layer;uint32_t began=now_ms();ctx=context;
 unsigned who,action;uint32_t t;VNKey k,*custom=NULL;int hx=0;
 if(scene_id==DOWNLOADED_SCENE){static const uint8_t map[]={4,2,3,1,5,0};who=map[downloaded.actor];action=downloaded.prop?VN_SIP:VN_THINK;k=download_pose(&hx);custom=&k;t=elapsed;}
 else{const VNScene *s=&vn_scenes[scene_id];who=s->actor;action=s->action;t=elapsed*4000/s->duration;if(scene_id==1&&(phase==ESTABLISH||phase==WAITING)){action=VN_LISTEN;t=phase==WAITING?4000:elapsed*4000/VN_ESTABLISH;}}
 vn_stage(who,action,scene_setting_id(),scene_ambient_id(),t,scene_ambient_id()==6?0:scene_time,custom,hx);
 if(scene_id==1&&phase==WAITING){rect(0,204,200,24,0x000055);graphics_context_set_text_color(ctx,GColorWhite);graphics_draw_text(ctx,"Pick up the phone",fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),GRect(0,203,200,25),GTextOverflowModeWordWrap,GTextAlignmentCenter,NULL);}
 uint32_t cost=(now_ms()+1000-began)%1000;frames++;render_total+=cost;if(cost>render_max)render_max=cost;
}
static bool moving(void){return scene_id&&((phase!=HOLD&&phase!=WAITING)||(phase==HOLD&&hold_elapsed<VN_HOLD_GUARD)||(background_motion&&scene_setting_id()!=6&&scene_ambient_id()!=6));}
static void schedule(void);
static void tick(void *unused){
 (void)unused;timer=NULL;uint32_t now=now_ms(),dt=now-last_time;last_time=now;if(dt>250)dt=VN_FRAME_MS;
 if(phase!=HOLD&&phase!=WAITING)elapsed+=dt;
 if(phase==HOLD&&hold_elapsed<VN_HOLD_GUARD)hold_elapsed+=dt;
 // 24 seconds is an exact shared period for the room's 4.8s screensaver and 12s exterior.
 if(background_motion)scene_time=(scene_time+dt)%24000;
 if(scene_id==1&&phase==ESTABLISH&&elapsed>=VN_ESTABLISH){phase=WAITING;elapsed=0;}
 else if(phase==PLAYING&&elapsed>=scene_duration()){phase=HOLD;elapsed=scene_duration();hold_elapsed=0;APP_LOG(APP_LOG_LEVEL_INFO,"Scene %lu held; free=%lu draw avg/max=%lu/%lu ms",(unsigned long)scene_id,(unsigned long)heap_bytes_free(),(unsigned long)(frames?render_total/frames:0),(unsigned long)render_max);}
 layer_mark_dirty(canvas);schedule();
}
static void schedule(void){if(!timer&&focused&&moving())timer=app_timer_register((phase==HOLD||phase==WAITING)?166:VN_FRAME_MS,tick,NULL);}
static void cancel(void){if(timer){app_timer_cancel(timer);timer=NULL;}}
static void focus_changed(bool focus){
 reactionFocus(focus);focused=focus;cancel();last_time=now_ms();if(phase==HOLD)hold_elapsed=0;
 APP_LOG(APP_LOG_LEVEL_INFO,"Scene focus %d id=%lu action=%lu ambient=%lu",focus,(unsigned long)scene_id,(unsigned long)elapsed,(unsigned long)scene_time);if(focus)schedule();
}
void setBackgroundMotion(uint32_t enabled){
 if(!subscribed){app_focus_service_subscribe(focus_changed);subscribed=true;}
 background_motion=enabled!=0;cancel();last_time=now_ms();APP_LOG(APP_LOG_LEVEL_INFO,"Background motion %d",background_motion);schedule();
}
void showScene(uint32_t id){
 if(!subscribed){app_focus_service_subscribe(focus_changed);subscribed=true;}
 cancel();scene_id=(id<=VN_SCENE_COUNT||id==DOWNLOADED_SCENE)?id:0;
 if(!scene_id){if(canvas)layer_set_hidden(canvas,true);return;}
 if(!canvas){canvas=layer_create(GRect(0,0,200,228));if(canvas)layer_set_update_proc(canvas,draw);}
 if(!canvas){scene_id=0;return;}
 scenePortraitReset();phase=id==1?ESTABLISH:PLAYING;hold_elapsed=elapsed=scene_time=frames=render_total=render_max=0;last_time=now_ms();
 layer_remove_from_parent(canvas);layer_add_child(window_get_root_layer(window_stack_get_top_window()),canvas);layer_set_hidden(canvas,false);layer_mark_dirty(canvas);schedule();
 APP_LOG(APP_LOG_LEVEL_INFO,"Scene %lu started; free=%lu",(unsigned long)id,(unsigned long)heap_bytes_free());
}
uint32_t sceneSelect(void){
 if(!scene_id)return 2;
 if(!focused)return 0;
 if(scene_id==1&&phase==WAITING){phase=PLAYING;elapsed=0;last_time=now_ms();cancel();schedule();return 0;}
 return phase==HOLD&&hold_elapsed>=VN_HOLD_GUARD;
}
void destroyScenes(void){if(subscribed){app_focus_service_unsubscribe();subscribed=false;}cancel();if(canvas){layer_destroy(canvas);canvas=NULL;}scene_id=0;}
uint32_t recipeData(uint32_t index,int32_t value){
 static int values[46];static uint8_t count;
 if(index==0)count=0;
 if(index<46){if(index!=count||value< -12000||value>12000)return 0;values[count++]=value;return 1;}
 if(index!=46)return 0;
 DownloadScene next;if(!decode_values(values,count,&next))return 0;
 if(value){downloaded=next;showScene(DOWNLOADED_SCENE);}return 1;
}
