#include <pebble.h>
static Layer *clock_layer;
static AppTimer *light_timer;
static ClickConfigProvider original_clicks;
static void draw_clock(Layer *layer,GContext *ctx){
 // Include AM/PM and its terminator for two-digit hours.
 char time[16];clock_copy_time_string(time,sizeof(time));
 graphics_context_set_fill_color(ctx,GColorOxfordBlue);
 graphics_fill_rect(ctx,layer_get_bounds(layer),0,GCornerNone);
 graphics_context_set_text_color(ctx,GColorWhite);
 graphics_draw_text(ctx,time,fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(0,0,64,20),GTextOverflowModeTrailingEllipsis,GTextAlignmentRight,NULL);
}
void clockFront(void){if(clock_layer){layer_remove_from_parent(clock_layer);layer_add_child(window_get_root_layer(window_stack_get_top_window()),clock_layer);layer_mark_dirty(clock_layer);}}
static void minute_tick(struct tm *now,TimeUnits changed){(void)now;(void)changed;if(clock_layer)layer_mark_dirty(clock_layer);}
static void light_done(void *unused){(void)unused;light_timer=NULL;light_enable(false);APP_LOG(APP_LOG_LEVEL_INFO,"Reading light off");}
static void reading_light(ClickRecognizerRef recognizer,void *context){
 (void)recognizer;(void)context;
 if(light_timer)app_timer_cancel(light_timer);
 light_enable(true);light_timer=app_timer_register(30000,light_done,NULL);
 APP_LOG(APP_LOG_LEVEL_INFO,"Reading light 30s; free=%lu",(unsigned long)heap_bytes_free());
}
static void clicks(void *context){if(original_clicks)original_clicks(context);window_long_click_subscribe(BUTTON_ID_SELECT,600,reading_light,NULL);}
void readerControls(void){
 Window *window=window_stack_get_top_window();
 original_clicks=window_get_click_config_provider(window);
 window_set_click_config_provider_with_context(window,clicks,window_get_click_config_context(window));
 clock_layer=layer_create(GRect(130,207,66,21));
 if(clock_layer){layer_set_update_proc(clock_layer,draw_clock);clockFront();tick_timer_service_subscribe(MINUTE_UNIT,minute_tick);}
}
void destroyReaderControls(void){tick_timer_service_unsubscribe();if(light_timer)app_timer_cancel(light_timer);light_enable(false);if(clock_layer)layer_destroy(clock_layer);}
