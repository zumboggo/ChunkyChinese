#include <pebble.h>
static Layer *s_portrait;
static uint32_t s_resource,s_actor;
static uint8_t bytes[512];
static ResHandle handle;
static uint32_t offset,size;
static size_t used,available;
static int next_byte(void){
 if(used==available){if(offset>=size)return -1;available=resource_load_byte_range(handle,offset,bytes,sizeof(bytes));offset+=available;used=0;if(!available)return -1;}
 return bytes[used++];
}
static void draw_portrait(Layer *layer,GContext *ctx){
 graphics_context_set_fill_color(ctx,GColorWhite);graphics_fill_rect(ctx,layer_get_bounds(layer),0,GCornerNone);
 handle=resource_get_handle(s_resource);size=resource_size(handle);offset=used=available=0;
 int y=0;
 while(y<228){int rows=next_byte(),runs=next_byte(),x=0;if(rows<=0||runs<=0||y+rows>228)break;
  for(int i=0;i<runs;i++){int length=next_byte(),color=next_byte();if(length<=0||color<0||x+length>200)return;graphics_context_set_fill_color(ctx,(GColor){.argb=(uint8_t)color});graphics_fill_rect(ctx,GRect(x,y,length,rows),0,GCornerNone);x+=length;}
  if(x!=200){break;}
  y+=rows;
 }
 if(s_actor>=3){
  graphics_context_set_fill_color(ctx,GColorOxfordBlue);graphics_fill_rect(ctx,GRect(0,163,200,65),0,GCornerNone);graphics_context_set_text_color(ctx,GColorWhite);
  graphics_draw_text(ctx,"We Could Do Better",fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),GRect(9,161,190,45),GTextOverflowModeWordWrap,GTextAlignmentLeft,NULL);
  graphics_draw_text(ctx,s_actor==3?"Episode 11   Select: begin":"Complete | Back: menu",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(8,208,190,20),GTextOverflowModeWordWrap,GTextAlignmentLeft,NULL);
 }else{
  graphics_context_set_fill_color(ctx,GColorWhite);graphics_fill_rect(ctx,GRect(0,207,85,21),0,GCornerNone);graphics_context_set_text_color(ctx,GColorOxfordBlue);
  graphics_draw_text(ctx,s_actor==1?"Hannah":s_actor==2?"Young Alden":"Alden",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(5,209,80,19),GTextOverflowModeTrailingEllipsis,GTextAlignmentLeft,NULL);
 }
}
void showPortrait(uint32_t resource,uint32_t actor){
 if(!resource){if(s_portrait)layer_set_hidden(s_portrait,true);return;}
 if(!s_portrait){s_portrait=layer_create(GRect(0,0,200,228));if(s_portrait)layer_set_update_proc(s_portrait,draw_portrait);}
 if(!s_portrait){return;}
 s_resource=resource;s_actor=actor;
 layer_remove_from_parent(s_portrait);layer_add_child(window_get_root_layer(window_stack_get_top_window()),s_portrait);layer_set_hidden(s_portrait,false);layer_mark_dirty(s_portrait);
}
void destroyPortrait(void){if(s_portrait){layer_destroy(s_portrait);s_portrait=NULL;}}
