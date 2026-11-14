#include <pebble.h>
#include <stdlib.h>
static Window *window;static Layer *canvas;static GContext *context;
static uint8_t cache[512];static uint32_t block=UINT32_MAX;
static void read_art(uint32_t at,void *out,size_t n){uint8_t *p=out;while(n){uint32_t b=at/512;if(block!=b){size_t got=resource_load_byte_range(resource_get_handle(RESOURCE_ID_ALDEN),b*512,cache,512);if(got<512)memset(cache+got,0,512-got);block=b;}size_t c=512-at%512;if(c>n)c=n;memcpy(p,cache+at%512,c);at+=c;p+=c;n-=c;}}
static void rect(int x,int y,int w,int h,uint32_t rgb){if(w<=0||h<=0)return;uint8_t r=(rgb>>16)&255,g=(rgb>>8)&255,b=rgb&255;GColor c={.argb=0xc0|((r+42)/85<<4)|((g+42)/85<<2)|((b+42)/85)};graphics_context_set_fill_color(context,c);graphics_fill_rect(context,GRect(x,y,w,h),0,GCornerNone);}
#include "stage.h"
static AppTimer *timer;static uint32_t action_ms,ambient_ms,min_free,max_draw,draws;static unsigned shot,mode=3,interval;static bool focused=true,held,hud=true;
static void schedule(void);
static void draw(Layer *l,GContext *c){uint32_t start=time_ms(NULL,NULL);context=c;stage(shot,action_ms,ambient_ms,mode);
 if(hud){graphics_context_set_text_color(c,GColorOxfordBlue);graphics_draw_text(c,shot==0?"1 / Reaction":shot==1?"2 / Fry":"3 / Phone",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(62,0,130,20),GTextOverflowModeTrailingEllipsis,GTextAlignmentRight,NULL);
 const char *labels[]={"Motion: off","Motion: fan","Motion: screen","Motion: both"};graphics_draw_text(c,labels[mode],fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(5,210,190,18),GTextOverflowModeTrailingEllipsis,GTextAlignmentLeft,NULL);}
 uint32_t cost=(time_ms(NULL,NULL)+1000-start)%1000;if(cost>max_draw)max_draw=cost;uint32_t f=heap_bytes_free();if(f<min_free)min_free=f;draws++;}
static void tick(void *unused){timer=NULL;if(!focused)return;if(action_ms<SHOT_DURATION){action_ms+=interval;if(action_ms>=SHOT_DURATION){action_ms=SHOT_DURATION;held=true;APP_LOG(APP_LOG_LEVEL_INFO,"STAGE held shot=%u free=%lu max=%lu draws=%lu",shot,(unsigned long)min_free,(unsigned long)max_draw,(unsigned long)draws);}}if(mode)ambient_ms=(ambient_ms+interval)%120000;layer_mark_dirty(canvas);schedule();}
static void cancel(void){if(timer){app_timer_cancel(timer);timer=NULL;}}
static void schedule(void){if(!timer&&focused&&(!held||mode)){interval=held?166:83;timer=app_timer_register(interval,tick,NULL);}}
static void replay(void){cancel();action_ms=0;held=false;draws=max_draw=0;min_free=heap_bytes_free();layer_mark_dirty(canvas);schedule();APP_LOG(APP_LOG_LEVEL_INFO,"STAGE start shot=%u mode=%u",shot,mode);}
static void up(ClickRecognizerRef r,void *ctx){shot=(shot+1)%3;replay();}
static void select_click(ClickRecognizerRef r,void *ctx){replay();}
static void down(ClickRecognizerRef r,void *ctx){mode=(mode+1)%4;cancel();layer_mark_dirty(canvas);schedule();APP_LOG(APP_LOG_LEVEL_INFO,"STAGE mode=%u",mode);}
static void long_select(ClickRecognizerRef r,void *ctx){hud=!hud;layer_mark_dirty(canvas);}
static void clicks(void *ctx){window_single_click_subscribe(BUTTON_ID_UP,up);window_single_click_subscribe(BUTTON_ID_DOWN,down);window_single_click_subscribe(BUTTON_ID_SELECT,select_click);window_long_click_subscribe(BUTTON_ID_SELECT,600,long_select,NULL);}
static void focus(bool value){focused=value;cancel();if(value)schedule();APP_LOG(APP_LOG_LEVEL_INFO,"STAGE focus=%d action=%lu ambient=%lu",value,(unsigned long)action_ms,(unsigned long)ambient_ms);}
int main(void){window=window_create();canvas=layer_create(GRect(0,0,200,228));layer_set_update_proc(canvas,draw);layer_add_child(window_get_root_layer(window),canvas);window_set_click_config_provider(window,clicks);app_focus_service_subscribe(focus);window_stack_push(window,true);replay();app_event_loop();cancel();app_focus_service_unsubscribe();layer_destroy(canvas);window_destroy(window);}
