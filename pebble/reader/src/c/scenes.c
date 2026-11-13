#include <pebble.h>

// Primitive renderer; shared poses/timing come from scenes/library.json. No bitmap frames or JS heap.
typedef struct { float x,y; } Pt;
typedef struct { Pt head, shoulder, hip, hand; float angle,gaze,brow,phone; } Pose;
typedef enum { TEXT, ESTABLISH, WAITING, PICKUP, HOLD, AFTER } Phase;
#include "scene_data.h"
#include "ensemble_data.h"
static uint32_t scene_id;
static float world_x,world_y,world_sx=1,world_sy=1;
static int actor; // 0 present Alden, 1 young Alden, 2 Hannah
static Layer *canvas;
static AppTimer *timer;
static Phase phase=ESTABLISH;
static uint32_t elapsed,scene_time,last_time,hold_started,frames,render_total,render_max;
static bool focused=true,background_motion=true,subscribed=false;
static GContext *ctx;
static float tx,ty,rotation;
#define INK GColorFromHEX(0x000055)
#define PAPER GColorWhite
#define RAIL GColorLightGray
#define NEAR GColorDarkGray
#define COAT GColorDarkGray
#define SHIRT GColorLightGray
#define HAIR GColorFromHEX(0xaa5500)
#define SKIN GColorFromHEX(0xffaa55)
#define PHONE GColorFromHEX(0x005555)
#define GLOW GColorFromHEX(0x55aaaa)
#define P(x,y) ((Pt){(x),(y)})
#define POLY(color,...) polygon((Pt[]){__VA_ARGS__},sizeof((Pt[]){__VA_ARGS__})/sizeof(Pt),color)
static uint32_t now_ms(void){time_t s;uint16_t ms;time_ms(&s,&ms);return (uint32_t)s*1000+ms;}
static float sine(float r){return (float)sin_lookup((int32_t)(r*TRIG_MAX_ANGLE/6.2831853f))/TRIG_MAX_RATIO;}
static float cosine(float r){return (float)cos_lookup((int32_t)(r*TRIG_MAX_ANGLE/6.2831853f))/TRIG_MAX_RATIO;}
static float root(float v){if(v<=0)return 0;float x=v>1?v:1;for(int i=0;i<12;i++)x=(x+v/x)*.5f;return x;}
static int16_t round_px(float v){return (int16_t)(v+(v<0?-.5f:.5f));}
static GPoint point(Pt p){float c=cosine(rotation),s=sine(rotation);return GPoint(round_px(world_x+world_sx*(tx+p.x*c-p.y*s)),round_px(world_y+world_sy*(ty+p.x*s+p.y*c)));}
static void disc(Pt p,int radius,GColor c){graphics_context_set_fill_color(ctx,c);graphics_fill_circle(ctx,point(p),radius*world_sy);}
static void line(Pt a,Pt b,GColor c,int width){graphics_context_set_stroke_color(ctx,c);graphics_context_set_stroke_width(ctx,width*world_sy<1?1:round_px(width*world_sy));graphics_draw_line(ctx,point(a),point(b));if(width>2){disc(a,width/2,c);disc(b,width/2,c);}}
static void polygon(Pt *p,int n,GColor c){GPoint points[24];if(n>24)return;for(int i=0;i<n;i++)points[i]=point(p[i]);GPath path={.num_points=n,.points=points,.rotation=0,.offset={0,0}};graphics_context_set_fill_color(ctx,c);gpath_draw_filled(ctx,&path);}
// Store fixed geometry as compact integer coordinates, not float setup instructions.
static void segment(const int16_t *v,GColor c,int w){line(P(v[0],v[1]),P(v[2],v[3]),c,w);}
static void shape(const int16_t *v,int n,GColor c){GPoint points[24];if(n>24)return;for(int i=0;i<n;i++)points[i]=point(P(v[i*2],v[i*2+1]));GPath path={.num_points=n,.points=points,.rotation=0,.offset={0,0}};graphics_context_set_fill_color(ctx,c);gpath_draw_filled(ctx,&path);}
#define SEG(x1,y1,x2,y2,c,w) do{static const int16_t v[]={x1,y1,x2,y2};segment(v,c,w);}while(0)
#define SHAPE(c,...) do{static const int16_t v[]={__VA_ARGS__};shape(v,sizeof(v)/sizeof(v[0])/2,c);}while(0)
static void box(float x,float y,float w,float h,GColor c){POLY(c,P(x,y),P(x+w,y),P(x+w,y+h),P(x,y+h));}
static void label(const char *s,int x,int y,int w,int h,const char *font,GColor c,GTextAlignment align){graphics_context_set_text_color(ctx,c);graphics_draw_text(ctx,s,fonts_get_system_font(font),GRect(x,y,w,h),GTextOverflowModeWordWrap,align,NULL);}
static float mix(float a,float b,float t){return a+(b-a)*t;}
static Pt mixp(Pt a,Pt b,float t){return P(mix(a.x,b.x,t),mix(a.y,b.y,t));}
static Pose blend(Pose a,Pose b,float t){if(t<0)t=0;if(t>1)t=1;t=t*t*(3-2*t);return (Pose){mixp(a.head,b.head,t),mixp(a.shoulder,b.shoulder,t),mixp(a.hip,b.hip,t),mixp(a.hand,b.hand,t),mix(a.angle,b.angle,t),mix(a.gaze,b.gaze,t),mix(a.brow,b.brow,t),mix(a.phone,b.phone,t)};}
static Pose sample(uint32_t ms){for(int i=1;i<PHONE_KEY_COUNT;i++)if(ms<=key_times[i])return blend(poses[key_poses[i-1]],poses[key_poses[i]],(float)(ms-key_times[i-1])/(key_times[i]-key_times[i-1]));return poses[key_poses[PHONE_KEY_COUNT-1]];}
static void phone(float x,float y,float angle){float oldx=tx,oldy=ty,oldr=rotation;tx+=x;ty+=y;rotation=angle;box(-5,-9,10,18,INK);box(-3,-6,6,11,GLOW);box(-1,7,2,1,PAPER);tx=oldx;ty=oldy;rotation=oldr;}
#include "ambient_draw.h"
static void scenery(void){
 box(0,0,200,228,PAPER);
 ambience(scene_time,0);
 SEG(10,115,10,19,NEAR,2);SEG(10,19,190,19,NEAR,2);SEG(190,19,190,115,NEAR,2);SEG(190,115,10,115,NEAR,2);
 SEG(15,110,15,25,RAIL,1);SEG(15,25,185,25,RAIL,1);SEG(185,25,185,110,RAIL,1);
 SEG(0,124,200,124,RAIL,1);SEG(33,143,33,120,RAIL,2);SEG(33,120,173,120,RAIL,2);SEG(173,120,173,143,RAIL,2);
 SHAPE(PAPER,31,145,171,145,184,156,44,156);
 SEG(31,145,171,145,NEAR,2);SEG(171,145,184,156,NEAR,2);SEG(184,156,44,156,NEAR,2);SEG(44,156,31,145,NEAR,2);
 SEG(44,157,44,178,RAIL,1);SEG(44,178,181,178,RAIL,1);SEG(181,178,181,157,RAIL,1);
 SEG(53,179,50,196,NEAR,2);SEG(170,179,175,196,NEAR,2);SEG(0,199,200,199,RAIL,1);SEG(28,200,0,225,RAIL,1);SEG(166,200,199,225,RAIL,1);
}
static Pt elbow(Pt s,Pt h){float dx=h.x-s.x,dy=h.y-s.y,d=root(dx*dx+dy*dy);if(d<1)d=1;float a=(26*26-29*29+d*d)/(2*d),b=root(26*26-a*a);return P(s.x+a*dx/d-b*dy/d,s.y+a*dy/d+b*dx/d);}
static void character(Pose p,bool attached,float sway){
 tx=sway;float hx=p.head.x,hy=p.head.y,sx=p.shoulder.x,sy=p.shoulder.y,ix=p.hip.x,iy=p.hip.y;
 line(P(ix-5,iy),P(105,161),INK,9);SEG(105,161,102,190,INK,9);SEG(101,191,112,193,INK,7);
 line(P(ix+4,iy),P(123,159),INK,10);SEG(123,159,127,190,INK,10);SEG(127,191,141,193,INK,7);
 line(P(sx-9,sy+2),P(sx-15,132),INK,9);line(P(sx-15,132),P(91,145),INK,9);line(P(sx-9,sy+2),P(sx-15,132),COAT,5);line(P(sx-15,132),P(91,145),COAT,5);disc(P(92,145),3,SKIN);
 POLY(INK,P(sx-13,sy-4),P(sx+9,sy-5),P(ix+12,iy+2),P(ix-12,iy+2));
 POLY(actor==1?GColorPastelYellow:COAT,P(sx-10,sy-3),P(sx+7,sy-3),P(ix+9,iy-2),P(ix-9,iy-2));
 POLY(SHIRT,P(sx-5,sy-4),P(sx+4,sy-4),P(ix+3,iy-5),P(ix-3,iy-5));
 if(actor==0){line(P(sx-8,sy-4),P(sx-3,sy+9),INK,2);line(P(sx-3,sy+9),P(sx-9,sy+13),INK,2);line(P(sx+6,sy-3),P(sx+2,sy+10),INK,2);line(P(sx+2,sy+10),P(sx+8,sy+13),INK,2);
 }
 line(P(hx,hy+16),P(sx-1,sy-3),SKIN,6);
 tx=sway+hx;ty=hy;rotation=p.angle;
 if(actor==2){
  disc(P(-11,17),7,HAIR);disc(P(-10,25),5,HAIR);disc(P(12,17),7,HAIR);disc(P(12,25),5,HAIR);
 }
 disc(P(0,0),18,INK);disc(P(1,1),16,SKIN);disc(P(-15,3),4,SKIN);
 SHAPE(INK,-18,3,-20,-9,-15,-8,-18,-17,-9,-15,-5,-22,1,-18,10,-19,8,-15,17,-11,20,-4,13,-7,11,-2,5,-10,-2,-6,-1,-13,-11,-4,-13,6);
 SHAPE(HAIR,-17,-10,-10,-12,-4,-18,0,-14,9,-16,5,-11,-6,-5,-13,0);
 if(actor==2){SEG(-12,8,-11,23,HAIR,5);SEG(13,8,13,23,HAIR,5);disc(P(-10,26),2,INK);disc(P(13,26),2,INK);box(-9,5,1,1,HAIR);box(-6,6,1,1,HAIR);box(9,5,1,1,HAIR);}
 bool blink=(phase==WAITING||phase==ESTABLISH)&&elapsed%3900>3650;
 if(blink){SEG(-6,2,-2,2,INK,1);SEG(6,2,10,2,INK,1);}else{box(-6+p.gaze,0,2,3,INK);box(6+p.gaze,0,2,3,INK);}
 line(P(-8,-4-p.brow),P(-3,-5-p.brow),INK,1);line(P(5,-5-p.brow),P(10,-4-p.brow),INK,1);SEG(5,5,8,6,HAIR,1);SEG(8,6,5,7,HAIR,1);line(P(0,11),P(5,11.5f),INK,1);
 tx=sway;ty=0;rotation=0;
 Pt shoulder=P(sx+7,sy+1),e=elbow(shoulder,p.hand);
 line(shoulder,e,INK,9);line(e,p.hand,INK,9);line(shoulder,e,actor==1?GColorPastelYellow:COAT,5);line(e,p.hand,actor==1?GColorPastelYellow:COAT,5);
 if(attached)phone(p.hand.x,p.hand.y-2,p.phone);
 disc(P(p.hand.x-2,p.hand.y+1),3,SKIN);line(P(p.hand.x-3,p.hand.y),P(p.hand.x+1,p.hand.y+2),SKIN,2);
 tx=ty=rotation=0;
}

static void world(float x,float y,float sx,float sy){world_x=x;world_y=y;world_sx=sx;world_sy=sy;tx=ty=rotation=0;}
static float ease(float t){if(t<0)t=0;if(t>1)t=1;return t*t*(3-2*t);}
#include "scene_choreography.h"
static void cafe(void){
 box(0,0,200,228,PAPER);
 ambience(scene_time,1);
 SEG(14,22,186,22,RAIL,1);SEG(14,22,14,94,RAIL,1);SEG(186,22,186,94,RAIL,1);SEG(14,94,186,94,RAIL,1);SEG(100,22,100,94,RAIL,1);
 SEG(26,86,26,57,RAIL,1);SEG(26,57,61,57,RAIL,1);SEG(61,57,61,86,RAIL,1);SEG(117,86,117,43,RAIL,1);SEG(117,43,166,43,RAIL,1);SEG(166,43,166,86,RAIL,1);
 SEG(17,140,17,117,NEAR,2);SEG(17,117,49,117,NEAR,2);SEG(183,140,183,117,NEAR,2);SEG(183,117,151,117,NEAR,2);
 SEG(0,194,200,194,RAIL,1);SEG(19,195,0,227,RAIL,1);SEG(181,195,200,227,RAIL,1);
}
static void milkshake(float x,float y){POLY(INK,P(x-6,y-12),P(x+6,y-12),P(x+4,y+5),P(x-4,y+5));POLY(GColorMelon,P(x-4,y-10),P(x+4,y-10),P(x+2,y+3),P(x-2,y+3));line(P(x+1,y-11),P(x+2,y-23),INK,1);line(P(x+2,y-23),P(x-2,y-26),INK,1);}
static void restaurant(uint32_t t){
 cafe();Pose child=poses[POSE_SEATED],hannah=poses[POSE_GLANCE];child.gaze=1;hannah.gaze=1;
 direct_restaurant(t,&child,&hannah);
 world(-4,39,.73f,.73f);actor=1;character(child,false,0);
 if(scene_id==4&&t<CUP_RELEASE)milkshake(child.hand.x+1,child.hand.y-4);
 world(204,39,-.73f,.73f);actor=2;character(hannah,false,0);
 if(scene_id==3&&t>=FRY_CONTACT){int len=t<FRY_BITE?FRY_LENGTH:FRY_BITTEN_LENGTH;line(P(hannah.hand.x,hannah.hand.y-1),P(hannah.hand.x+1,hannah.hand.y-len),GColorChromeYellow,3);}
 world(0,0,1,1);
 // Table stays below hands so the reach and the prop remain visible.
 SHAPE(PAPER,65,151,135,151,150,163,50,163);
 SEG(65,151,135,151,NEAR,2);SEG(135,151,150,163,NEAR,2);SEG(150,163,50,163,NEAR,2);SEG(50,163,65,151,NEAR,2);SEG(62,164,59,193,NEAR,2);SEG(138,164,141,193,NEAR,2);
 SEG(94,149,113,149,RAIL,2);for(int i=0;i<4;i++)line(P(96+i*4,147),P(97+i*4,139),GColorChromeYellow,2);
 if(scene_id!=4||t>=CUP_RELEASE)milkshake(78,145);
 actor=0;
}
#include "ensemble_draw.h"
static void draw(Layer *layer,GContext *context){
 (void)layer;uint32_t start=time_ms(NULL,NULL);ctx=context;world(0,0,1,1);graphics_context_set_antialiased(ctx,false);
 if(scene_id>5){
  int setting=scene_setting[scene_id];
  if(setting==0)scenery();else room_background(setting,scene_time,scene_ambient[scene_id]);
  if(scene_actor[scene_id]>=0)ensemble_character(scene_actor[scene_id],scene_gesture[scene_id],elapsed);
  else {actor=0;character(poses[POSE_SEATED],false,0);}
  if(setting!=0)room_props(setting,scene_time);
 }else if(scene_id>=2&&scene_id<=4){restaurant(elapsed);}else{
  scenery();Pose p;
  if(scene_id==5){p=reflection_pose(elapsed);}else{p=phase==ESTABLISH?blend(poses[POSE_SEATED],poses[POSE_GLANCE],((float)elapsed-PHONE_GLANCE_START)/PHONE_GLANCE_DURATION):phase==WAITING?poses[POSE_GLANCE]:phase==PICKUP?sample(elapsed):poses[key_poses[PHONE_KEY_COUNT-1]];}
  bool attached=scene_id==1&&(phase==HOLD||(phase==PICKUP&&elapsed>=PHONE_CONTACT));float sway=phase==HOLD?0:sine(scene_time*.002f)*.65f;
  if(scene_id==1&&!attached){phone(142+sway,146,-1.3f);}character(p,attached,sway);
  if(scene_id==1&&phase==WAITING){box(0,204,200,24,INK);label(PHONE_PROMPT,0,203,200,25,FONT_KEY_GOTHIC_18_BOLD,PAPER,GTextAlignmentCenter);}
 }
 uint32_t cost=(time_ms(NULL,NULL)+1000-start)%1000;frames++;render_total+=cost;if(cost>render_max)render_max=cost;
}
static bool moving(void){return scene_id&&(phase!=HOLD||(background_motion&&scene_setting[scene_id]!=6));}
static void schedule(void);
static void tick(void *data){
 (void)data;timer=NULL;uint32_t now=now_ms(),dt=now-last_time;last_time=now;if(dt>250)dt=SCENE_FRAME_MS;if(phase!=HOLD)elapsed+=dt;if(background_motion)scene_time=(scene_time+dt)%AMBIENT_PERIOD;
 if(scene_id==1&&phase==ESTABLISH&&elapsed>=PHONE_ESTABLISH){phase=WAITING;elapsed=0;}
 else if(phase!=HOLD&&((scene_id==1&&phase==PICKUP&&elapsed>=scene_durations[scene_id])||(scene_id!=1&&elapsed>=scene_durations[scene_id]))){phase=HOLD;elapsed=scene_durations[scene_id];hold_started=now;APP_LOG(APP_LOG_LEVEL_INFO,"Scene %lu held; free=%lu draw avg/max=%lu/%lu ms",(unsigned long)scene_id,(unsigned long)heap_bytes_free(),(unsigned long)(frames?render_total/frames:0),(unsigned long)render_max);}
 layer_mark_dirty(canvas);schedule();
}
static void schedule(void){if(!timer&&focused&&moving())timer=app_timer_register(phase==HOLD?AMBIENT_FRAME_MS:SCENE_FRAME_MS,tick,NULL);}
static void focus_changed(bool focus){
 focused=focus;if(timer){app_timer_cancel(timer);timer=NULL;}last_time=now_ms();
 APP_LOG(APP_LOG_LEVEL_INFO,"Scene focus %d id=%lu action=%lu ambient=%lu",focus,(unsigned long)scene_id,(unsigned long)elapsed,(unsigned long)scene_time);if(focus)schedule();
}
void setBackgroundMotion(uint32_t enabled){
 background_motion=enabled!=0;if(timer){app_timer_cancel(timer);timer=NULL;}last_time=now_ms();
 APP_LOG(APP_LOG_LEVEL_INFO,"Background motion %d",background_motion);schedule();
}
void showScene(uint32_t id){
 if(!subscribed){app_focus_service_subscribe(focus_changed);subscribed=true;}
 if(timer){app_timer_cancel(timer);timer=NULL;}
 scene_id=id<=SCENE_COUNT?id:0;
 if(!scene_id){if(canvas)layer_set_hidden(canvas,true);return;}
 if(!canvas){canvas=layer_create(GRect(0,0,200,228));if(canvas)layer_set_update_proc(canvas,draw);}
 if(!canvas){scene_id=0;return;}
 phase=ESTABLISH;elapsed=scene_time=frames=render_total=render_max=0;last_time=now_ms();actor=0;
 layer_remove_from_parent(canvas);layer_add_child(window_get_root_layer(window_stack_get_top_window()),canvas);layer_set_hidden(canvas,false);layer_mark_dirty(canvas);schedule();
 APP_LOG(APP_LOG_LEVEL_INFO,"Scene %lu started; free=%lu",(unsigned long)id,(unsigned long)heap_bytes_free());
}
// 0 waits, 1 means the final held image was acknowledged, 2 means unavailable.
uint32_t sceneSelect(void){
 if(!scene_id)return 2;
 if(scene_id==1&&phase==WAITING){phase=PICKUP;elapsed=0;return 0;}
 if(phase==HOLD&&now_ms()-hold_started>=SCENE_HOLD_GUARD)return 1;
 return 0;
}
void destroyScenes(void){if(subscribed){app_focus_service_unsubscribe();subscribed=false;}if(timer){app_timer_cancel(timer);timer=NULL;}if(canvas){layer_destroy(canvas);canvas=NULL;}scene_id=0;}
