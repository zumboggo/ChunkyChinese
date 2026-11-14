/* Stream 3-bit tiles without a full-frame heap buffer. */
#include "reaction_data.h"
static AppTimer *reaction_timer;
static bool reaction_active,reaction_focused=true,reaction_held,reaction_ready;
static uint8_t reaction_index,reaction_step;
static uint32_t reaction_due,reaction_remaining,reaction_draw_max,reaction_min_free;
static uint32_t reaction_now(void){time_t s;uint16_t ms;time_ms(&s,&ms);return (uint32_t)s*1000+ms;}
static void reaction_cancel(void){if(reaction_timer){app_timer_cancel(reaction_timer);reaction_timer=NULL;}}
static uint32_t reaction_blocks[2]={UINT32_MAX,UINT32_MAX};
static uint8_t reaction_recent;
static bool reaction_read(uint32_t at,void *out,size_t n){
 uint8_t *dest=out;
 while(n){uint32_t block=at/256;int slot=reaction_blocks[0]==block?0:reaction_blocks[1]==block?1:1-reaction_recent;
  if(reaction_blocks[slot]!=block){size_t got=resource_load_byte_range(resource_get_handle(RESOURCE_ID_REACTIONS),block*256,bytes+slot*256,256);if(!got)return false;if(got<256)memset(bytes+slot*256+got,0,256-got);reaction_blocks[slot]=block;}
  reaction_recent=slot;size_t count=256-at%256;if(count>n)count=n;memcpy(dest,bytes+slot*256+at%256,count);at+=count;dest+=count;n-=count;
 }return true;
}
static uint16_t reaction_u16(uint32_t at){uint8_t b[2]={0};reaction_read(at,b,2);return b[0]|(b[1]<<8);}
static uint32_t reaction_u32(uint32_t at){uint8_t b[4]={0};reaction_read(at,b,4);return b[0]|(b[1]<<8)|(b[2]<<16)|((uint32_t)b[3]<<24);}
static void reaction_tick(void *unused);
static void reaction_schedule(void){if(reaction_active&&reaction_focused&&(!reaction_held||!reaction_ready)&&!reaction_timer){reaction_due=reaction_now()+reaction_remaining;reaction_timer=app_timer_register(reaction_remaining?reaction_remaining:1,reaction_tick,NULL);}}
void reactionFocus(bool focus){if(!focus&&reaction_timer){uint32_t now=reaction_now();reaction_remaining=(int32_t)(reaction_due-now)>0?reaction_due-now:1;}reaction_focused=focus;reaction_cancel();if(focus){if(reaction_held){reaction_ready=false;reaction_remaining=250;}reaction_schedule();}}
static void reaction_stop(void){reaction_cancel();reaction_active=false;}
uint32_t portraitReady(void){return !reaction_active||(reaction_held&&reaction_ready&&reaction_focused);}
static void reaction_tick(void *unused){
 (void)unused;reaction_timer=NULL;if(!reaction_active)return;const ReactionAnim *a=&reaction_anims[reaction_index];
 if(reaction_held){reaction_ready=true;APP_LOG(APP_LOG_LEVEL_INFO,"Reaction %u held free=%lu max=%lu",reaction_index,(unsigned long)reaction_min_free,(unsigned long)reaction_draw_max);return;}
 if(reaction_step+1<a->count){reaction_step++;reaction_remaining=reaction_u16(a->offset+reaction_step*6);layer_mark_dirty(s_portrait);reaction_schedule();}
 else{reaction_held=true;reaction_remaining=250;reaction_schedule();}
}
static void reaction_start(uint32_t id){reaction_stop();if(id>=REACTION_COUNT)return;reaction_blocks[0]=reaction_blocks[1]=UINT32_MAX;reaction_index=id;reaction_step=0;reaction_held=false;reaction_ready=false;reaction_active=true;reaction_min_free=heap_bytes_free();reaction_draw_max=0;reaction_remaining=reaction_u16(reaction_anims[id].offset);reaction_schedule();APP_LOG(APP_LOG_LEVEL_INFO,"Reaction %lu started free=%lu",(unsigned long)id,(unsigned long)heap_bytes_free());}
static void reaction_palette(uint32_t base,uint8_t *p){uint8_t rgb[24];reaction_read(base+8,rgb,24);for(int i=0;i<8;i++)p[i]=0xc0|(((rgb[i*3]+42)/85)<<4)|(((rgb[i*3+1]+42)/85)<<2)|((rgb[i*3+2]+42)/85);}
static int reaction_x=4,reaction_y=9,reaction_scale=3;
static void reaction_run(GContext *ctx,int x,int y,int w,int color){if(w<=0||color<0)return;graphics_context_set_fill_color(ctx,(GColor){.argb=(uint8_t)color});graphics_fill_rect(ctx,GRect(reaction_x+x*reaction_scale,reaction_y+y*reaction_scale,w*reaction_scale,reaction_scale),0,GCornerNone);}
static void reaction_piece(GContext *ctx,uint32_t base,uint8_t part,int dx,int dy,const uint8_t *p){
 if(part==255){return;}uint32_t at=base+reaction_u32(base+32+part*4);uint8_t h[5];if(!reaction_read(at,h,5))return;int x0=h[0],y0=h[1],w=h[2],height=h[3],alpha=h[4];if(!w||w>64||!height||height>64)return;int stride=(w*3+7)/8,ms=(w+7)/8;at+=5;
 for(int y=0;y<height;y++){uint8_t row[24],mask[8];reaction_read(at+y*stride,row,stride);if(alpha)reaction_read(at+height*stride+y*ms,mask,ms);int last=-1,start=0;
  for(int x=0;x<=w;x++){int color=-1;if(x<w&&(!alpha||(mask[x/8]&(128>>(x%8))))){int bit=x*3,byte=bit/8,shift=bit%8;uint16_t v=row[byte]<<8;if(byte+1<stride)v|=row[byte+1];color=p[(v>>(13-shift))&7];}if(color!=last){reaction_run(ctx,x0+start+dx,y0+y+dy,x-start,last);start=x;last=color;}}
 }
}
static void reaction_draw(GContext *ctx){
 reaction_x=4;reaction_y=9;reaction_scale=3;
 uint32_t began=time_ms(NULL,NULL);const ReactionAnim *a=&reaction_anims[reaction_index];const ReactionActor *actor=&reaction_actors[a->actor];uint8_t f[6],p[8];reaction_read(a->offset+reaction_step*6,f,6);reaction_palette(actor->offset,p);
 if(actor->tiled)reaction_piece(ctx,actor->offset,f[2],0,0,p);
 else{int dx=(int8_t)f[4],dy=(int8_t)f[5];reaction_piece(ctx,actor->offset,0,0,0,p);reaction_piece(ctx,actor->offset,1,dx,dy,p);reaction_piece(ctx,actor->offset,f[2],dx,dy,p);reaction_piece(ctx,actor->offset,actor->cheeks,dx,dy,p);reaction_piece(ctx,actor->offset,actor->nose,dx,dy,p);reaction_piece(ctx,actor->offset,f[3],dx,dy,p);}
 uint32_t cost=(time_ms(NULL,NULL)+1000-began)%1000,free=heap_bytes_free();if(cost>reaction_draw_max)reaction_draw_max=cost;if(free<reaction_min_free)reaction_min_free=free;
}

