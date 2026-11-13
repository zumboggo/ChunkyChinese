#include <pebble.h>
uint32_t storySize(void){return resource_size(resource_get_handle(RESOURCE_ID_STORY_DATA));}
// The generated char* FFI copies this into JS, then frees the native buffer.
char *readStory(uint32_t offset,uint32_t count){
 uint32_t size=storySize();
 if(count>2048||offset>size||count>size-offset)return NULL;
 char *record=malloc(count+1);if(!record)return NULL;
 size_t n=resource_load_byte_range(resource_get_handle(RESOURCE_ID_STORY_DATA),offset,(uint8_t*)record,count);
 record[n]=0;return record;
}
