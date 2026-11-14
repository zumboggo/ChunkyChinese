/* Included after portrait.c's shared 512-byte streaming reader. */
static AppTimer *hybrid_timer;
static uint8_t hybrid_frame;
static bool hybrid_focused=true;
static uint32_t hybrid_min,hybrid_max,hybrid_total,hybrid_draws;
static uint32_t hybrid_now(void){time_t sec;uint16_t ms;time_ms(&sec,&ms);return (uint32_t)sec*1000+ms;}
static void hybrid_cancel(void){if(hybrid_timer){app_timer_cancel(hybrid_timer);hybrid_timer=NULL;}}
static void hybrid_tick(void *unused);
static void hybrid_schedule(void){if(s_actor==99&&hybrid_focused&&hybrid_frame<30&&!hybrid_timer)hybrid_timer=app_timer_register(140,hybrid_tick,NULL);}
void hybridFocus(bool focus){hybrid_focused=focus;hybrid_cancel();hybrid_schedule();}
uint32_t portraitReady(void){return hybrid_frame==30;}
static void hybrid_tick(void *unused){hybrid_timer=NULL;hybrid_frame++;layer_mark_dirty(s_portrait);hybrid_schedule();}
static void hybrid_start(void){hybrid_cancel();hybrid_frame=0;hybrid_min=heap_bytes_free();hybrid_max=hybrid_total=hybrid_draws=0;hybrid_schedule();}
/* Packed rows: at most 32 bytes for 64 pixels; shared portrait stream buffer. */
static void hybrid_piece(GContext *ctx,uint8_t part,int dx,int dy){
 ResHandle res=resource_get_handle(RESOURCE_ID_ALDEN_HYBRID);
 uint8_t header[4],palette[16];uint32_t start;
 if(resource_load_byte_range(res,0,header,4)!=4)return;
 int bits=header[0],count=header[1];if((bits!=3&&bits!=4)||count!=(1<<bits)||part>=header[2])return;
 if(resource_load_byte_range(res,4,palette,count)!=(size_t)count)return;
 if(resource_load_byte_range(res,4+count+part*4,(uint8_t*)&start,4)!=4)return;
 handle=res;size=resource_size(res);offset=start;used=available=0;
 int x0=next_byte(),y0=next_byte(),width=next_byte(),height=next_byte();
 if(x0<0||y0<0||width<1||height<1||x0+width>64||y0+height>64)return;
 for(int y=0;y<height;y++){
  uint32_t acc=0;int have=0,last=-1,begin=0;
  for(int x=0;x<=width;x++){
   int index=-1;
   if(x<width){while(have<bits){int value=next_byte();if(value<0)return;acc=(acc<<8)|value;have+=8;}have-=bits;index=(acc>>have)&(count-1);}
   if(index!=last){
    if(last>0){graphics_context_set_fill_color(ctx,(GColor){.argb=palette[last]});graphics_fill_rect(ctx,GRect(4+(x0+begin+dx)*3,12+(y0+y+dy)*3,(x-begin)*3,3),0,GCornerNone);}
    last=index;begin=x;
   }
  }
 }
}
static void hybrid_draw(GContext *ctx){
 uint32_t start=hybrid_now();int f=hybrid_frame,k=f<5?0:f<13?1:f<23?2:3;
 int dx=k==2?-1:0,dy=0;
 if(f>=5&&f<=7)dy=-1;else if(f>=13&&f<=24)dy=1;
 hybrid_piece(ctx,0,0,0);hybrid_piece(ctx,1,dx,dy);if(k==1)hybrid_piece(ctx,12,dx,dy);hybrid_piece(ctx,4+k,dx,dy);hybrid_piece(ctx,3,dx,dy);hybrid_piece(ctx,8+k,dx,dy);hybrid_piece(ctx,2,dx,dy);
 graphics_context_set_fill_color(ctx,GColorWhite);graphics_fill_rect(ctx,GRect(0,211,200,17),0,GCornerNone);graphics_context_set_text_color(ctx,GColorBlack);
 graphics_draw_text(ctx,f==30?"Select: return  Down: replay":"Alden / prototype",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(0,211,200,17),GTextOverflowModeTrailingEllipsis,GTextAlignmentCenter,NULL);
 uint32_t duration=hybrid_now()-start;if(duration>hybrid_max)hybrid_max=duration;hybrid_total+=duration;hybrid_draws++;
 uint32_t free=heap_bytes_free();if(free<hybrid_min)hybrid_min=free;
 APP_LOG(APP_LOG_LEVEL_INFO,"HYBRID frame=%u draw=%lu free=%lu",f,(unsigned long)duration,(unsigned long)free);
 if(f==30)APP_LOG(APP_LOG_LEVEL_INFO,"HYBRID held min=%lu max=%lu avg=%lu draws=%lu",(unsigned long)hybrid_min,(unsigned long)hybrid_max,(unsigned long)(hybrid_total/hybrid_draws),(unsigned long)hybrid_draws);
}
