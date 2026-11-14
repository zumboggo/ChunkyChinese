#include <pebble.h>
// One streamed portrait, procedural facial patches, no decoded bitmap or frame array.
static Window *window;
static Layer *layer;
static AppTimer *timer;
static uint8_t buffer[512];
static uint32_t offset, size, elapsed, last_ms, min_free, draws, max_draw;
static size_t used, available;
static ResHandle resource;
static bool focused=true, original=false;
static unsigned emotion=0;
static const char *names[]={"Smile", "Raised eyebrow", "Surprise"};
#define DURATION 960
#define FRAME_MS 80
static uint32_t now(void){time_t s;uint16_t ms;time_ms(&s,&ms);return (uint32_t)s*1000+ms;}
static int byte(void){if(used==available){if(offset>=size)return -1;available=resource_load_byte_range(resource,offset,buffer,sizeof buffer);offset+=available;used=0;if(!available)return -1;}return buffer[used++];}
static void box(GContext *c,int x,int y,int w,int h,GColor col){graphics_context_set_fill_color(c,col);graphics_fill_rect(c,GRect(x,y,w,h),0,GCornerNone);}
static void stroke(GContext *c,int x,int y,int x2,int y2,GColor col,int width){graphics_context_set_stroke_color(c,col);graphics_context_set_stroke_width(c,width);graphics_draw_line(c,GPoint(x,y),GPoint(x2,y2));}
static void face(GContext *c){
 // Patch only interior skin: hair, nose, cheek contour and jaw remain original.
 const GColor skin=GColorFromHEX(0xffaa7f),ink=GColorFromHEX(0x552a2a),shadow=GColorFromHEX(0xaa5555),white=GColorFromHEX(0xffffaa);
 int t=elapsed<160?0:elapsed>800?100:(elapsed-160)*100/640;
 t=t*t*(300-2*t)/10000; // smoothstep, fixed point
 int lift=emotion==1?5*t/100:emotion==2?5*t/100:0;
 int eyes=emotion==2?4*t/100:0;
 box(c,81,85,21,20,skin);box(c,116,83,19,22,skin);
 // Brows: the right eyebrow alone rises for skepticism.
 stroke(c,83,88-(emotion==2?lift:0),98,87-(emotion==2?lift:0),ink,2);
 stroke(c,118,86-lift,132,87-lift,ink,2);
 int eye_y=94,eye_h=5+eyes;
 box(c,84,eye_y,14,eye_h,white);box(c,119,eye_y,13,eye_h,white);
 box(c,90,eye_y,5,eye_h,ink);box(c,122,eye_y,5,eye_h,ink);
 stroke(c,83,eye_y-1,98,eye_y-1,ink,2);stroke(c,118,eye_y-1,132,eye_y-1,ink,2);
 if(emotion==0&&t>50){stroke(c,84,eye_y+eye_h,98,eye_y+eye_h-1,skin,2);stroke(c,119,eye_y+eye_h-1,132,eye_y+eye_h,skin,2);}
 box(c,98,118,25,13,skin);
 if(emotion==2){int h=2+8*t/100;box(c,106,120,10,h,ink);if(h>5)box(c,108,121,6,2,white);}
 else if(emotion==0){int s=4*t/100;stroke(c,101,122-s/2,106,123+s/2,ink,2);stroke(c,106,123+s/2,114,123+s/2,ink,2);stroke(c,114,123+s/2,119,122-s/2,ink,2);if(t>65)stroke(c,106,123,114,123,white,1);}
 else stroke(c,103,124,117,123,shadow,2);
}
static void draw(Layer *l,GContext *c){
 uint32_t start=now();offset=used=available=0;int y=0;
 while(y<228){int rows=byte(),runs=byte(),x=0;if(rows<=0||runs<=0||y+rows>228)break;for(int i=0;i<runs;i++){int len=byte(),color=byte();if(len<=0||color<0||x+len>200)return;box(c,x,y,len,rows,(GColor){.argb=(uint8_t)color});x+=len;}if(x!=200)break;y+=rows;}
 if(!original)face(c);
 box(c,0,0,200,20,GColorWhite);box(c,0,205,200,23,GColorWhite);
 graphics_context_set_text_color(c,GColorOxfordBlue);
 graphics_draw_text(c,original?"Alden / original still":names[emotion],fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(0,0,200,20),GTextOverflowModeTrailingEllipsis,GTextAlignmentCenter,NULL);
 graphics_draw_text(c,"Up: next  Select: replay",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(0,204,200,22),GTextOverflowModeTrailingEllipsis,GTextAlignmentCenter,NULL);
 uint32_t cost=now()-start;if(cost>max_draw)max_draw=cost;draws++;uint32_t free=heap_bytes_free();if(free<min_free)min_free=free;
}
static void schedule(void);
static void tick(void *unused){timer=NULL;uint32_t n=now();elapsed+=n-last_ms;last_ms=n;if(elapsed>DURATION)elapsed=DURATION;layer_mark_dirty(layer);if(elapsed==DURATION)APP_LOG(APP_LOG_LEVEL_INFO,"REACTION held id=%u min_free=%lu max_draw_ms=%lu draws=%lu",emotion,(unsigned long)min_free,(unsigned long)max_draw,(unsigned long)draws);else schedule();}
static void schedule(void){if(!timer&&focused&&!original&&elapsed<DURATION){last_ms=now();timer=app_timer_register(FRAME_MS,tick,NULL);}}
static void cancel(void){if(timer){app_timer_cancel(timer);timer=NULL;}}
static void play(void){cancel();original=false;elapsed=0;draws=max_draw=0;min_free=heap_bytes_free();layer_mark_dirty(layer);schedule();APP_LOG(APP_LOG_LEVEL_INFO,"REACTION start id=%u free=%lu",emotion,(unsigned long)heap_bytes_free());}
static void focus(bool value){focused=value;cancel();schedule();APP_LOG(APP_LOG_LEVEL_INFO,"REACTION focus=%d elapsed=%lu",value,(unsigned long)elapsed);}
static void up(ClickRecognizerRef r,void *c){emotion=(emotion+1)%3;play();}
static void select_click(ClickRecognizerRef r,void *c){play();}
static void down(ClickRecognizerRef r,void *c){if(original)play();else{cancel();original=true;layer_mark_dirty(layer);APP_LOG(APP_LOG_LEVEL_INFO,"REACTION original free=%lu",(unsigned long)heap_bytes_free());}}
static void clicks(void *c){window_single_click_subscribe(BUTTON_ID_UP,up);window_single_click_subscribe(BUTTON_ID_SELECT,select_click);window_single_click_subscribe(BUTTON_ID_DOWN,down);}
int main(void){window=window_create();layer=layer_create(GRect(0,0,200,228));layer_set_update_proc(layer,draw);layer_add_child(window_get_root_layer(window),layer);window_set_click_config_provider(window,clicks);resource=resource_get_handle(RESOURCE_ID_ALDEN);size=resource_size(resource);app_focus_service_subscribe(focus);window_stack_push(window,true);APP_LOG(APP_LOG_LEVEL_INFO,"REACTION budget buffer=%u base=%lu",sizeof buffer,(unsigned long)size);play();app_event_loop();cancel();app_focus_service_unsubscribe();layer_destroy(layer);window_destroy(window);}
