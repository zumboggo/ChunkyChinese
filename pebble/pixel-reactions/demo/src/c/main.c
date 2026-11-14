#include "pixel.h"
static Window *window;static Layer *layer;static AppTimer *timer;static PixelReaction sprite;
static bool focused=true,held=false;static uint32_t min_free,max_draw,draws;
static const char *names[]={"Idle / blink","Surprised","Thinking","Talking","Happy","Worried"};
static uint32_t now(void){time_t s;uint16_t ms;time_ms(&s,&ms);return (uint32_t)s*1000+ms;}
static void cancel(void){if(timer){app_timer_cancel(timer);timer=NULL;}}
static void schedule(void);
static void tick(void *data){timer=NULL;if(pixel_next(&sprite)){layer_mark_dirty(layer);schedule();}else{held=true;APP_LOG(APP_LOG_LEVEL_INFO,"PIXEL held emotion=%u free=%lu max_draw=%lu draws=%lu",sprite.emotion,(unsigned long)min_free,(unsigned long)max_draw,(unsigned long)draws);}}
static void schedule(void){if(focused&&!held&&!timer)timer=app_timer_register(pixel_duration(&sprite),tick,NULL);}
static void play(uint8_t emotion){cancel();if(!pixel_select(&sprite,emotion))return;held=false;min_free=heap_bytes_free();max_draw=draws=0;layer_mark_dirty(layer);schedule();}
static void draw(Layer *l,GContext *c){uint32_t start=now();graphics_context_set_fill_color(c,GColorWhite);graphics_fill_rect(c,GRect(0,0,200,228),0,GCornerNone);graphics_context_set_text_color(c,GColorBlack);
 graphics_draw_text(c,names[sprite.emotion],fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),GRect(0,5,200,30),GTextOverflowModeTrailingEllipsis,GTextAlignmentCenter,NULL);
 pixel_draw(&sprite,c,GPoint(36,43),4);pixel_draw(&sprite,c,GPoint(84,177),1);
 graphics_draw_text(c,"Select: next  Down: replay",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(0,209,200,19),GTextOverflowModeTrailingEllipsis,GTextAlignmentCenter,NULL);
 uint32_t cost=now()-start;if(cost>max_draw)max_draw=cost;uint32_t free=heap_bytes_free();if(free<min_free)min_free=free;draws++;}
static void next(ClickRecognizerRef r,void *c){play((sprite.emotion+1)%6);}
static void previous(ClickRecognizerRef r,void *c){play((sprite.emotion+5)%6);}
static void replay(ClickRecognizerRef r,void *c){play(sprite.emotion);}
static void clicks(void *c){window_single_click_subscribe(BUTTON_ID_SELECT,next);window_single_click_subscribe(BUTTON_ID_UP,previous);window_single_click_subscribe(BUTTON_ID_DOWN,replay);}
static void focus(bool value){focused=value;cancel();schedule();}
int main(void){if(!pixel_open(&sprite,RESOURCE_ID_ALDEN_PIXEL))return 1;window=window_create();layer=layer_create(GRect(0,0,200,228));layer_set_update_proc(layer,draw);layer_add_child(window_get_root_layer(window),layer);window_set_click_config_provider(window,clicks);app_focus_service_subscribe(focus);window_stack_push(window,true);APP_LOG(APP_LOG_LEVEL_INFO,"PIXEL state=%u resource=%lu",sizeof sprite,(unsigned long)resource_size(sprite.resource));play(0);app_event_loop();cancel();app_focus_service_unsubscribe();layer_destroy(layer);window_destroy(window);}
