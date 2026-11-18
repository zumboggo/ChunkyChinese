#include "pixel.h"
#include <string.h>
bool pixel_open(PixelReaction *p,uint32_t id){
 memset(p,0,sizeof(*p));p->resource=resource_get_handle(id);uint8_t h[16];
 if(resource_load_byte_range(p->resource,0,h,sizeof h)!=sizeof h||memcmp(h,"PX32",4)||h[4]!=2||h[5]<1||h[5]>24||h[6]<1||h[6]>5||h[7]!=6)return false;
 if(resource_size(p->resource)!=100+(uint32_t)h[5]*512)return false;
 p->frames=h[5];memcpy(p->palette,h+8,5);
 if(resource_load_byte_range(p->resource,16,p->descriptors,84)!=84)return false;
 for(int e=0;e<6;e++){const uint8_t *d=p->descriptors+14*e;if(d[0]<2||d[0]>4||d[1]!=0)return false;for(int f=0;f<d[0];f++){int j=2+3*f;uint16_t ms=d[j+1]|(d[j+2]<<8);if(d[j]>=p->frames||ms<160||ms>2000)return false;}}
 p->valid=true;return true;
}
bool pixel_select(PixelReaction *p,uint8_t e){if(!p->valid||e>=6)return false;p->emotion=e;p->step=0;return true;}
bool pixel_next(PixelReaction *p){if(!p->valid)return false;uint8_t n=p->descriptors[p->emotion*14];if(p->step+1>=n)return false;p->step++;return true;}
uint16_t pixel_duration(const PixelReaction *p){if(!p->valid)return 0;const uint8_t *d=p->descriptors+14*p->emotion+2+3*p->step;return d[1]|(d[2]<<8);}
void pixel_draw(PixelReaction *p,GContext *c,GPoint origin,uint8_t scale){
 if(!p->valid||scale<1||scale>6)return;
 uint8_t frame=p->descriptors[14*p->emotion+2+3*p->step];uint32_t offset=100+(uint32_t)frame*512;
 for(int y=0;y<32;y++){
  if(resource_load_byte_range(p->resource,offset+y*16,p->row,16)!=16)return;
  for(int x=0;x<32;){
   uint8_t index=(p->row[x/2]>>(x%2?0:4))&15;
   int end=x+1;
   while(end<32&&((p->row[end/2]>>(end%2?0:4))&15)==index)end++;
   if(index>5)return;
   if(index){
    graphics_context_set_fill_color(c,(GColor){.argb=p->palette[index-1]});
    graphics_fill_rect(c,GRect(origin.x+x*scale,origin.y+y*scale,(end-x)*scale,scale),0,GCornerNone);
   }
   x=end;
  }
 }
}
