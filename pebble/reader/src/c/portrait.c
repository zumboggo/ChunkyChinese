#include <pebble.h>
#include "episode_title.h"
static Layer *s_portrait;
static uint32_t s_resource,s_actor;
static char s_title[81],s_begin[40];
void cardData(uint32_t index,uint32_t value){
 if(index<80){s_title[index]=(value>=32&&value<=126)?(char)value:'?';s_title[index+1]=0;}
 else if(index==80){
  snprintf(s_begin,sizeof(s_begin),"Episode %lu   Select: begin",(unsigned long)value);
  APP_LOG(APP_LOG_LEVEL_DEBUG,"Card episode %lu: %s",(unsigned long)value,s_title);
 }
}
static uint8_t bytes[512];
static ResHandle handle;
static uint32_t offset,size;
static size_t used,available;
static int next_byte(void){
 if(used==available){if(offset>=size)return -1;available=resource_load_byte_range(handle,offset,bytes,sizeof(bytes));offset+=available;used=0;if(!available)return -1;}
 return bytes[used++];
}

#include "reactions.inc"
static void draw_portrait(Layer *layer,GContext *ctx){
 graphics_context_set_fill_color(ctx,GColorWhite);graphics_fill_rect(ctx,layer_get_bounds(layer),0,GCornerNone);
 if(reaction_active){reaction_draw(ctx);}else{
 handle=resource_get_handle(s_resource);size=resource_size(handle);offset=used=available=0;
 int y=0;
 while(y<228){int rows=next_byte(),runs=next_byte(),x=0;if(rows<=0||runs<=0||y+rows>228)break;
  for(int i=0;i<runs;i++){int length=next_byte(),color=next_byte();if(length<=0||color<0||x+length>200)return;graphics_context_set_fill_color(ctx,(GColor){.argb=(uint8_t)color});graphics_fill_rect(ctx,GRect(x,y,length,rows),0,GCornerNone);x+=length;}
  if(x!=200){break;}
  y+=rows;
 }
 }
 if(s_actor==3||s_actor==4){
  graphics_context_set_fill_color(ctx,GColorOxfordBlue);graphics_fill_rect(ctx,GRect(0,163,200,65),0,GCornerNone);graphics_context_set_text_color(ctx,GColorWhite);
  graphics_draw_text(ctx,s_title[0]?s_title:EPISODE_TITLE,fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),GRect(9,161,190,45),GTextOverflowModeWordWrap,GTextAlignmentLeft,NULL);
  graphics_draw_text(ctx,s_actor==3?(s_begin[0]?s_begin:EPISODE_BEGIN):"Complete | Back: menu",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(8,208,190,20),GTextOverflowModeWordWrap,GTextAlignmentLeft,NULL);
 }else{
  graphics_context_set_fill_color(ctx,GColorWhite);graphics_fill_rect(ctx,GRect(0,207,85,21),0,GCornerNone);graphics_context_set_text_color(ctx,GColorOxfordBlue);
  graphics_draw_text(ctx,s_actor==1?"Hannah":s_actor==2?"Young Alden":s_actor==5?"Boe":s_actor==6?"Jeremy":s_actor==7?"Gorgon":"Alden",fonts_get_system_font(FONT_KEY_GOTHIC_14),GRect(5,209,80,19),GTextOverflowModeTrailingEllipsis,GTextAlignmentLeft,NULL);
 }
}
void showPortrait(uint32_t resource,uint32_t actor){
 if(resource==s_resource&&actor==s_actor&&resource>=1000&&reaction_active){layer_mark_dirty(s_portrait);return;}
 reaction_stop();
 if(!resource){if(s_portrait)layer_set_hidden(s_portrait,true);return;}
 if(!s_portrait){s_portrait=layer_create(GRect(0,0,200,228));if(s_portrait)layer_set_update_proc(s_portrait,draw_portrait);}
 if(!s_portrait){return;}
 s_resource=resource;s_actor=actor;if(resource>=1000)reaction_start(resource-1000);
 layer_remove_from_parent(s_portrait);layer_add_child(window_get_root_layer(window_stack_get_top_window()),s_portrait);layer_set_hidden(s_portrait,false);layer_mark_dirty(s_portrait);
}
void destroyPortrait(void){reaction_stop();if(s_portrait){layer_destroy(s_portrait);s_portrait=NULL;}}
