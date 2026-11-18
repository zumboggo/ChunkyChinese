#include <pebble.h>
#define AUDIO_ENABLED 1
#define AUDIO_BUFFER_BYTES 512
static Window *window;
static Layer *layer;
static unsigned rate=8000;
static const char *status="Ready / offline";
static uint32_t idle_free, low_free;
static void redraw(void){layer_mark_dirty(layer);}
#if AUDIO_ENABLED
static uint8_t pcm[AUDIO_BUFFER_BYTES];
static AppTimer *timer;
static ResHandle resource;
static uint32_t length, read_offset, sent, checksum, ticks, started;
static size_t buffered, consumed;
static bool active, draining, stopping;
static uint32_t now(void){time_t s;uint16_t ms;time_ms(&s,&ms);return (uint32_t)s*1000+ms;}
static void sample_heap(void){uint32_t f=heap_bytes_free();if(f<low_free)low_free=f;}
static void cancel_timer(void){if(timer){app_timer_cancel(timer);timer=NULL;}}
static void stop(void){if(active){stopping=true;cancel_timer();speaker_stop();status="Stopping...";redraw();}}
static void finished(SpeakerFinishReason reason,void *ctx){
 cancel_timer();sample_heap();active=false;
 status=reason==SpeakerFinishReasonDone?"Finished":reason==SpeakerFinishReasonStopped?"Stopped":reason==SpeakerFinishReasonPreempted?"Interrupted":"Audio error";
 APP_LOG(APP_LOG_LEVEL_INFO,"AUDIO finish rate=%u reason=%d sent=%lu crc=%lu",rate,reason,(unsigned long)sent,(unsigned long)checksum);
 APP_LOG(APP_LOG_LEVEL_INFO,"AUDIO heap idle=%lu min=%lu after=%lu",(unsigned long)idle_free,(unsigned long)low_free,(unsigned long)heap_bytes_free());
 APP_LOG(APP_LOG_LEVEL_INFO,"AUDIO time ms=%lu ticks=%lu",(unsigned long)(now()-started),(unsigned long)ticks);
 redraw();
}
static void pump(void *ctx){
 timer=NULL;if(!active||stopping)return;ticks++;sample_heap();
 // Bound work per callback and retain unwritten bytes under speaker backpressure.
 for(unsigned n=0;n<16;n++){
  if(consumed==buffered){
   if(read_offset==length){draining=true;status="Finishing...";speaker_stream_close();sample_heap();redraw();return;}
   size_t count=length-read_offset;if(count>sizeof pcm)count=sizeof pcm;
   buffered=resource_load_byte_range(resource,read_offset,pcm,count);consumed=0;
   if(buffered!=count){APP_LOG(APP_LOG_LEVEL_ERROR,"AUDIO resource read failure");stop();return;}
   read_offset+=buffered;
  }
  uint32_t accepted=speaker_stream_write(pcm+consumed,buffered-consumed);
  sample_heap();
  for(uint32_t j=0;j<accepted;j++)checksum=(checksum^pcm[consumed+j])*16777619u;
  consumed+=accepted;sent+=accepted;
  if(!accepted)break;
 }
 timer=app_timer_register(10,pump,NULL);sample_heap();
}
static void play(unsigned hz){
 if(active)return;
 rate=hz;if(speaker_is_muted()){status="Watch sound is muted";redraw();return;}
 resource=resource_get_handle(hz==8000?RESOURCE_ID_PHRASE_8000:RESOURCE_ID_PHRASE_16000);
 length=resource_size(resource);read_offset=sent=ticks=0;buffered=consumed=0;checksum=2166136261u;draining=stopping=false;
 idle_free=low_free=heap_bytes_free();started=now();
 if(!speaker_stream_open(hz==8000?SpeakerPcmFormat_8kHz_8bit:SpeakerPcmFormat_16kHz_8bit,65)){status="Speaker unavailable";redraw();return;}
 active=true;sample_heap();status="Playing / Select stops";
 APP_LOG(APP_LOG_LEVEL_INFO,"AUDIO start rate=%u bytes=%lu buffer=%u idle=%lu opened=%lu",rate,(unsigned long)length,sizeof pcm,(unsigned long)idle_free,(unsigned long)heap_bytes_free());
 pump(NULL);redraw();
}
#else
static void play(unsigned hz){rate=hz;status="Static measurement control";redraw();}
#endif
static void text(GContext *c,const char *s,int y,int h,const char *font){graphics_draw_text(c,s,fonts_get_system_font(font),GRect(8,y,184,h),GTextOverflowModeWordWrap,GTextAlignmentCenter,NULL);}
static void draw(Layer *l,GContext *c){
 graphics_context_set_fill_color(c,GColorWhite);graphics_fill_rect(c,layer_get_bounds(l),0,GCornerNone);graphics_context_set_text_color(c,GColorBlack);
 text(c,"Chinese audio A/B",4,28,FONT_KEY_GOTHIC_24_BOLD);
 text(c,"Ni da suan mei tian\ndou zhe yang ma?",36,51,FONT_KEY_GOTHIC_18);
 text(c,"Are you going to do\nthis every day?",89,43,FONT_KEY_GOTHIC_18);
 text(c,rate==8000?"8 kHz / 8-bit mono":"16 kHz / 8-bit mono",137,25,FONT_KEY_GOTHIC_18_BOLD);
 text(c,status,162,22,FONT_KEY_GOTHIC_14);
 text(c,"Up: 8k   Down: 16k\nSelect: replay / stop",184,40,FONT_KEY_GOTHIC_14);
#if AUDIO_ENABLED
 if(active)sample_heap();
#endif
}
static void up(ClickRecognizerRef r,void *ctx){play(8000);}
static void down(ClickRecognizerRef r,void *ctx){play(16000);}
static void select_click(ClickRecognizerRef r,void *ctx){
#if AUDIO_ENABLED
 if(active){stop();return;}
#endif
 play(rate);
}
static void focus(bool focused){
#if AUDIO_ENABLED
 if(!focused)stop();
#endif
}
static void clicks(void *ctx){window_single_click_subscribe(BUTTON_ID_UP,up);window_single_click_subscribe(BUTTON_ID_DOWN,down);window_single_click_subscribe(BUTTON_ID_SELECT,select_click);}
int main(void){
 window=window_create();layer=layer_create(GRect(0,0,200,228));layer_set_update_proc(layer,draw);layer_add_child(window_get_root_layer(window),layer);window_set_click_config_provider(window,clicks);
#if AUDIO_ENABLED
 speaker_set_finish_callback(finished,NULL);
#endif
 app_focus_service_subscribe(focus);window_stack_push(window,true);idle_free=low_free=heap_bytes_free();
 APP_LOG(APP_LOG_LEVEL_INFO,"AUDIO ready enabled=%u idle=%lu",AUDIO_ENABLED,(unsigned long)idle_free);app_event_loop();
#if AUDIO_ENABLED
 cancel_timer();speaker_set_finish_callback(NULL,NULL);speaker_stop();
#endif
 app_focus_service_unsubscribe();layer_destroy(layer);window_destroy(window);
}
