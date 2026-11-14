// Rasterize the actual native scene geometry and shared portrait decoder on a host.
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static uint8_t pixels[228][200][3],art[65536],bytes[512];static size_t art_size;static uint8_t stage[4096];static size_t stage_size;
typedef int AppTimer;typedef int GContext;typedef int Layer;static Layer *s_portrait;
typedef struct {uint8_t argb;} GColor;
typedef struct {int x,y,w,h;} Rect;
#define GRect(x,y,w,h) ((Rect){x,y,w,h})
#define GCornerNone 0
#define RESOURCE_ID_REACTIONS 0
#define RESOURCE_ID_STAGE 1
#define APP_LOG(...) ((void)0)
static uint8_t fill;
static void graphics_context_set_fill_color(GContext *c,GColor col){(void)c;fill=col.argb;}
static void graphics_fill_rect(GContext *c,Rect r,int radius,int corners){(void)c;(void)radius;(void)corners;for(int y=r.y;y<r.y+r.h;y++)for(int x=r.x;x<r.x+r.w;x++)if(x>=0&&x<200&&y>=0&&y<228){pixels[y][x][0]=((fill>>4)&3)*85;pixels[y][x][1]=((fill>>2)&3)*85;pixels[y][x][2]=(fill&3)*85;}}
static int resource_get_handle(int id){return id;}
static size_t resource_load_byte_range(int handle,size_t at,void *out,size_t n){if(handle==RESOURCE_ID_STAGE){if(at+n>stage_size)return 0;memcpy(out,stage+at,n);return n;}if(at>=art_size)return 0;if(n>art_size-at)n=art_size-at;memcpy(out,art+at,n);return n;}
static uint32_t time_ms(void *s,void *ms){(void)s;(void)ms;return 0;}
static void app_timer_cancel(AppTimer *t){(void)t;}
static AppTimer *app_timer_register(uint32_t t,void(*f)(void*),void *p){(void)t;(void)f;(void)p;return NULL;}
static void layer_mark_dirty(Layer *l){(void)l;}
static uint32_t heap_bytes_free(void){return 0;}
#include <time.h>
#include "../reader/src/c/reactions.inc"
static void rect(int x,int y,int w,int h,uint32_t c){uint8_t r=((c>>16)&255),g=((c>>8)&255),b=c&255;fill=0xc0|(((r+42)/85)<<4)|(((g+42)/85)<<2)|((b+42)/85);graphics_fill_rect(NULL,GRect(x,y,w,h),0,0);}
static void portrait(unsigned who,unsigned emotion,uint32_t t,int hx,int hy){scenePortraitDraw(NULL,who,emotion,t,hx,hy);}
#ifdef PACKED_STAGE
#include "../reader/src/c/visual_novel_packed.h"
#else
#include "../reader/src/c/visual_novel_draw.h"
#endif
int main(int argc,char **argv){if(argc!=5)return 2;FILE *f=fopen("reader/resources/data/reactions.bin","rb");if(!f)return 3;art_size=fread(art,1,sizeof(art),f);fclose(f);f=fopen("reader/resources/data/stage.bin","rb");if(!f)return 6;stage_size=fread(stage,1,sizeof(stage),f);fclose(f);int id=atoi(argv[1]),action=atoi(argv[2]),ambient=atoi(argv[3]);if(id>=1000&&id<1000+REACTION_COUNT){rect(0,0,200,228,0xffffff);reaction_scale=ambient>=1&&ambient<=3?ambient:3;const ReactionAnim *a=&reaction_anims[id-1000];unsigned step=0;while(step+1<a->count){unsigned d=reaction_u16(a->offset+step*6);if((unsigned)action<d)break;action-=d;step++;}reaction_frame(NULL,a,step,0,0);}else{if(id<1||id>VN_SCENE_COUNT)return 4;const VNScene *s=&vn_scenes[id];vn_stage(s->actor,s->action,s->setting,s->ambient,action,ambient,NULL,0);}f=fopen(argv[4],"wb");if(!f)return 5;fprintf(f,"P6\n200 228\n255\n");fwrite(pixels,1,sizeof(pixels),f);fclose(f);return 0;}
