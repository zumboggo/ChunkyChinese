#include <pebble.h>

// Primitive renderer; shared poses/timing come from scenes/library.json. No bitmap frames or JS heap.
typedef struct { float x,y; } Pt;
typedef struct { Pt head, shoulder, hip, hand; float angle,gaze,brow,phone; } Pose;
typedef enum { TEXT, ESTABLISH, WAITING, PICKUP, HOLD, AFTER } Phase;
#include "scene_data.h"
static uint32_t scene_id;
static float world_x,world_y,world_sx=1,world_sy=1;
static int actor; // 0 present Alden, 1 young Alden, 2 Hannah
static Layer *canvas;
static AppTimer *timer;
static Phase phase=ESTABLISH;
static uint32_t elapsed,scene_time,last_time,hold_started,frames,render_total,render_max;
static bool focused=true;
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
static void box(float x,float y,float w,float h,GColor c){POLY(c,P(x,y),P(x+w,y),P(x+w,y+h),P(x,y+h));}
static void label(const char *s,int x,int y,int w,int h,const char *font,GColor c,GTextAlignment align){graphics_context_set_text_color(ctx,c);graphics_draw_text(ctx,s,fonts_get_system_font(font),GRect(x,y,w,h),GTextOverflowModeWordWrap,align,NULL);}
static float mix(float a,float b,float t){return a+(b-a)*t;}
static Pt mixp(Pt a,Pt b,float t){return P(mix(a.x,b.x,t),mix(a.y,b.y,t));}
static Pose blend(Pose a,Pose b,float t){if(t<0)t=0;if(t>1)t=1;t=t*t*(3-2*t);return (Pose){mixp(a.head,b.head,t),mixp(a.shoulder,b.shoulder,t),mixp(a.hip,b.hip,t),mixp(a.hand,b.hand,t),mix(a.angle,b.angle,t),mix(a.gaze,b.gaze,t),mix(a.brow,b.brow,t),mix(a.phone,b.phone,t)};}
static Pose sample(uint32_t ms){for(int i=1;i<PHONE_KEY_COUNT;i++)if(ms<=key_times[i])return blend(poses[key_poses[i-1]],poses[key_poses[i]],(float)(ms-key_times[i-1])/(key_times[i]-key_times[i-1]));return poses[key_poses[PHONE_KEY_COUNT-1]];}
static void phone(float x,float y,float angle){float oldx=tx,oldy=ty,oldr=rotation;tx+=x;ty+=y;rotation=angle;box(-5,-9,10,18,INK);box(-3,-6,6,11,GLOW);box(-1,7,2,1,PAPER);tx=oldx;ty=oldy;rotation=oldr;}
static void scenery(void){
 box(0,0,200,228,PAPER);
 // Clip the landscape geometrically to the inside of the window.
 float scroll=(scene_time%44000)*.007f;while(scroll>=44)scroll-=44;
 for(int i=-1;i<6;i++){float x=i*44-scroll;int h=23+(i+8)%3*13;
  if(x>=15&&x<=185)line(P(x,94),P(x,94-h),RAIL,1);
  float l=x<15?15:x,r=x+29>185?185:x+29;
  if(l<r)line(P(l,94-h),P(r,94-h),RAIL,1);
  if(x+29>=15&&x+29<=185)line(P(x+29,94-h),P(x+29,94),RAIL,1);
  for(int j=0;j<3;j++){float wx=x+6+j*7;if(wx>15&&wx<185)line(P(wx,99-h),P(wx,103-h),RAIL,1);}
 }
 line(P(15,95),P(185,95),RAIL,1);
 float pole=190-(int)((scene_time*45/1000)%250);
 if(pole>=15&&pole<=185){line(P(pole,25),P(pole,110),NEAR,2);line(P(pole-12<15?15:pole-12,33),P(pole+13>185?185:pole+13,33),NEAR,1);}
 line(P(10,115),P(10,19),NEAR,2);line(P(10,19),P(190,19),NEAR,2);line(P(190,19),P(190,115),NEAR,2);line(P(190,115),P(10,115),NEAR,2);
 line(P(15,110),P(15,25),RAIL,1);line(P(15,25),P(185,25),RAIL,1);line(P(185,25),P(185,110),RAIL,1);
 line(P(0,124),P(200,124),RAIL,1);line(P(33,143),P(33,120),RAIL,2);line(P(33,120),P(173,120),RAIL,2);line(P(173,120),P(173,143),RAIL,2);
 POLY(PAPER,P(31,145),P(171,145),P(184,156),P(44,156));
 line(P(31,145),P(171,145),NEAR,2);line(P(171,145),P(184,156),NEAR,2);line(P(184,156),P(44,156),NEAR,2);line(P(44,156),P(31,145),NEAR,2);
 line(P(44,157),P(44,178),RAIL,1);line(P(44,178),P(181,178),RAIL,1);line(P(181,178),P(181,157),RAIL,1);
 line(P(53,179),P(50,196),NEAR,2);line(P(170,179),P(175,196),NEAR,2);line(P(0,199),P(200,199),RAIL,1);line(P(28,200),P(0,225),RAIL,1);line(P(166,200),P(199,225),RAIL,1);
}
static Pt elbow(Pt s,Pt h){float dx=h.x-s.x,dy=h.y-s.y,d=root(dx*dx+dy*dy);if(d<1)d=1;float a=(26*26-29*29+d*d)/(2*d),b=root(26*26-a*a);return P(s.x+a*dx/d-b*dy/d,s.y+a*dy/d+b*dx/d);}
static void character(Pose p,bool attached,float sway){
 tx=sway;float hx=p.head.x,hy=p.head.y,sx=p.shoulder.x,sy=p.shoulder.y,ix=p.hip.x,iy=p.hip.y;
 line(P(ix-5,iy),P(105,161),INK,9);line(P(105,161),P(102,190),INK,9);line(P(101,191),P(112,193),INK,7);
 line(P(ix+4,iy),P(123,159),INK,10);line(P(123,159),P(127,190),INK,10);line(P(127,191),P(141,193),INK,7);
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
 POLY(INK,P(-18,3),P(-20,-9),P(-15,-8),P(-18,-17),P(-9,-15),P(-5,-22),P(1,-18),P(10,-19),P(8,-15),P(17,-11),P(20,-4),P(13,-7),P(11,-2),P(5,-10),P(-2,-6),P(-1,-13),P(-11,-4),P(-13,6));
 POLY(HAIR,P(-17,-10),P(-10,-12),P(-4,-18),P(0,-14),P(9,-16),P(5,-11),P(-6,-5),P(-13,0));
 if(actor==2){line(P(-12,8),P(-11,23),HAIR,5);line(P(13,8),P(13,23),HAIR,5);disc(P(-10,26),2,INK);disc(P(13,26),2,INK);box(-9,5,1,1,HAIR);box(-6,6,1,1,HAIR);box(9,5,1,1,HAIR);}
 bool blink=(phase==WAITING||phase==ESTABLISH)&&scene_time%3900>3650;
 if(blink){line(P(-6,2),P(-2,2),INK,1);line(P(6,2),P(10,2),INK,1);}else{box(-6+p.gaze,0,2,3,INK);box(6+p.gaze,0,2,3,INK);}
 line(P(-8,-4-p.brow),P(-3,-5-p.brow),INK,1);line(P(5,-5-p.brow),P(10,-4-p.brow),INK,1);line(P(5,5),P(8,6),HAIR,1);line(P(8,6),P(5,7),HAIR,1);line(P(0,11),P(5,11.5f),INK,1);
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
 line(P(14,22),P(186,22),RAIL,1);line(P(14,22),P(14,94),RAIL,1);line(P(186,22),P(186,94),RAIL,1);line(P(14,94),P(186,94),RAIL,1);line(P(100,22),P(100,94),RAIL,1);
 line(P(26,86),P(26,57),RAIL,1);line(P(26,57),P(61,57),RAIL,1);line(P(61,57),P(61,86),RAIL,1);line(P(117,86),P(117,43),RAIL,1);line(P(117,43),P(166,43),RAIL,1);line(P(166,43),P(166,86),RAIL,1);
 line(P(17,140),P(17,117),NEAR,2);line(P(17,117),P(49,117),NEAR,2);line(P(183,140),P(183,117),NEAR,2);line(P(183,117),P(151,117),NEAR,2);
 line(P(0,194),P(200,194),RAIL,1);line(P(19,195),P(0,227),RAIL,1);line(P(181,195),P(200,227),RAIL,1);
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
 POLY(PAPER,P(65,151),P(135,151),P(150,163),P(50,163));
 line(P(65,151),P(135,151),NEAR,2);line(P(135,151),P(150,163),NEAR,2);line(P(150,163),P(50,163),NEAR,2);line(P(50,163),P(65,151),NEAR,2);line(P(62,164),P(59,193),NEAR,2);line(P(138,164),P(141,193),NEAR,2);
 line(P(94,149),P(113,149),RAIL,2);for(int i=0;i<4;i++)line(P(96+i*4,147),P(97+i*4,139),GColorChromeYellow,2);
 if(scene_id!=4||t>=CUP_RELEASE)milkshake(78,145);
 actor=0;
}
static void draw(Layer *layer,GContext *context){
 (void)layer;uint32_t start=time_ms(NULL,NULL);ctx=context;world(0,0,1,1);graphics_context_set_antialiased(ctx,false);
 if(scene_id>=2&&scene_id<=4){restaurant(elapsed);}else{
  scenery();Pose p;
  if(scene_id==5){p=reflection_pose(elapsed);}else{p=phase==ESTABLISH?blend(poses[POSE_SEATED],poses[POSE_GLANCE],((float)elapsed-PHONE_GLANCE_START)/PHONE_GLANCE_DURATION):phase==WAITING?poses[POSE_GLANCE]:phase==PICKUP?sample(elapsed):poses[key_poses[PHONE_KEY_COUNT-1]];}
  bool attached=scene_id==1&&(phase==HOLD||(phase==PICKUP&&elapsed>=PHONE_CONTACT));float sway=phase==HOLD?0:sine(scene_time*.002f)*.65f;
  if(scene_id==1&&!attached){phone(142+sway,146,-1.3f);}character(p,attached,sway);
  if(scene_id==1&&phase==WAITING){box(0,204,200,24,INK);label(PHONE_PROMPT,0,203,200,25,FONT_KEY_GOTHIC_18_BOLD,PAPER,GTextAlignmentCenter);}
 }
 uint32_t cost=(time_ms(NULL,NULL)+1000-start)%1000;frames++;render_total+=cost;if(cost>render_max)render_max=cost;
}
static bool moving(void){return scene_id&&phase!=HOLD;}
static void schedule(void);
static void tick(void *data){
 (void)data;timer=NULL;uint32_t now=now_ms(),dt=now-last_time;last_time=now;if(dt>250)dt=SCENE_FRAME_MS;elapsed+=dt;scene_time+=dt;
 if(scene_id==1&&phase==ESTABLISH&&elapsed>=PHONE_ESTABLISH){phase=WAITING;elapsed=0;}
 else if((scene_id==1&&phase==PICKUP&&elapsed>=scene_durations[scene_id])||(scene_id!=1&&elapsed>=scene_durations[scene_id])){phase=HOLD;elapsed=scene_durations[scene_id];hold_started=now;APP_LOG(APP_LOG_LEVEL_INFO,"Scene %lu held; free=%lu draw avg/max=%lu/%lu ms",(unsigned long)scene_id,(unsigned long)heap_bytes_free(),(unsigned long)(frames?render_total/frames:0),(unsigned long)render_max);}
 layer_mark_dirty(canvas);schedule();
}
static void schedule(void){if(!timer&&focused&&moving())timer=app_timer_register(SCENE_FRAME_MS,tick,NULL);}
void showScene(uint32_t id){
 if(timer){app_timer_cancel(timer);timer=NULL;}
 scene_id=id<=SCENE_COUNT?id:0;
 if(!scene_id){if(canvas)layer_set_hidden(canvas,true);return;}
 if(!canvas){canvas=layer_create(GRect(0,0,200,228));if(canvas)layer_set_update_proc(canvas,draw);}
 if(!canvas){scene_id=0;return;}
 phase=ESTABLISH;elapsed=scene_time=frames=render_total=render_max=0;last_time=now_ms();actor=0;focused=true;
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
void destroyScenes(void){if(timer){app_timer_cancel(timer);timer=NULL;}if(canvas){layer_destroy(canvas);canvas=NULL;}scene_id=0;}
