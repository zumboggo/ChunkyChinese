#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static uint8_t pixels[200*228*3],art[8192];static int hardware;
static void read_art(uint32_t at,void *out,size_t n){memcpy(out,art+at,n);}
static void rect(int x,int y,int w,int h,uint32_t rgb){uint8_t c[3]={(rgb>>16)&255,(rgb>>8)&255,rgb&255};if(hardware)for(int i=0;i<3;i++)c[i]=((c[i]+42)/85)*85;for(int yy=y;yy<y+h;yy++)for(int xx=x;xx<x+w;xx++)if(xx>=0&&xx<200&&yy>=0&&yy<228)memcpy(pixels+(yy*200+xx)*3,c,3);}
#include "src/c/stage.h"
int main(int argc,char **argv){if(argc!=6)return 2;FILE *f=fopen("resources/alden.bin","rb");if(!f)return 3;fread(art,1,sizeof art,f);fclose(f);hardware=atoi(argv[5]);stage(atoi(argv[1]),atoi(argv[2]),atoi(argv[3]),atoi(argv[4]));printf("P6\n200 228\n255\n");fwrite(pixels,1,sizeof pixels,stdout);return 0;}
