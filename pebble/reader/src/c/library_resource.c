#include <pebble.h>
// Lookup/menu data streams separately from the unchanged 512-byte artwork cache.
static void read_at(uint32_t at,void *out,size_t count){resource_load_byte_range(resource_get_handle(RESOURCE_ID_LIBRARY),at,out,count);}
static uint16_t u16(const uint8_t *b){return b[0]|b[1]<<8;}
static uint32_t u32(const uint8_t *b){return u16(b)|(uint32_t)u16(b+2)<<16;}
static bool entry(uint32_t id,uint32_t *at,uint16_t *len){uint8_t h[8],b[6];read_at(0,h,8);if(id>=u16(h+6))return false;read_at(8+u16(h+4)*8+id*6,b,6);*at=u32(b);*len=u16(b+4);return true;}
char *libraryText(uint32_t id){uint32_t at;uint16_t len;if(!entry(id,&at,&len))return NULL;char *s=malloc(len+1);if(s){read_at(at,s,len);s[len]=0;}return s;}
uint32_t libraryFind(uint32_t hash,uint32_t ordinal){
 uint8_t h[8],b[8];read_at(0,h,8);uint32_t lo=0,hi=u16(h+4);
 while(lo<hi){uint32_t mid=(lo+hi)/2;read_at(8+mid*8,b,8);if(u32(b)<hash)lo=mid+1;else hi=mid;}
 lo+=ordinal;if(lo>=u16(h+4))return 0;read_at(8+lo*8,b,8);
 return u32(b)==hash?((uint32_t)(u16(b+4)+1)<<16)|u16(b+6):0;
}
uint32_t memoryFree(void){return heap_bytes_free();}
