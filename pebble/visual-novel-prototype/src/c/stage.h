// Shared native/host scene renderer. Backend provides rect() and read_art().
#include "parts.h"
#include "tracks.h"
static uint32_t pal[8];
#define WALL 0xf6f4ee
#define LIGHT 0xd7dcd5
#define LINE 0x889b9e
#define DARK 0x506971
static void box(int x,int y,int w,int h,uint32_t c){rect(x,y,w,h,c);}
static void line(int x,int y,int x2,int y2,int width,uint32_t c){
 int dx=abs(x2-x),sx=x<x2?1:-1,dy=-abs(y2-y),sy=y<y2?1:-1,err=dx+dy;
 for(;;){box(x-width/2,y-width/2,width,width,c);if(x==x2&&y==y2)break;int e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
}
static void poly(const int *pts,int n,uint32_t color){
 int lo=228,hi=0;for(int i=0;i<n;i++){if(pts[i*2+1]<lo)lo=pts[i*2+1];if(pts[i*2+1]>hi)hi=pts[i*2+1];}
 if(lo<0){lo=0;}
 if(hi>227){hi=227;}
 for(int y=lo;y<=hi;y++){int xs[16],count=0;for(int i=0,j=n-1;i<n;j=i++){
  int x1=pts[j*2],y1=pts[j*2+1],x2=pts[i*2],y2=pts[i*2+1];
  if((y1<=y&&y2>y)||(y2<=y&&y1>y))xs[count++]=x1+(y-y1)*(x2-x1)/(y2-y1);
 }for(int i=0;i<count;i++)for(int j=i+1;j<count;j++)if(xs[j]<xs[i]){int a=xs[i];xs[i]=xs[j];xs[j]=a;}for(int i=0;i+1<count;i+=2)box(xs[i],y,xs[i+1]-xs[i]+1,1,color);}
}
#define POLY(c,...) do{const int pts[]={__VA_ARGS__};poly(pts,sizeof(pts)/sizeof(int)/2,c);}while(0)
static uint32_t u32(uint32_t at){uint8_t b[4];read_art(at,b,4);return b[0]|b[1]<<8|b[2]<<16|((uint32_t)b[3]<<24);}
static void palette(void){uint8_t c[24];read_art(8,c,24);for(int i=0;i<8;i++)pal[i]=(c[i*3]<<16)|(c[i*3+1]<<8)|c[i*3+2];}
static void piece(uint8_t id,int dx,int dy){
 uint32_t at=u32(32+id*4);uint8_t h[5];read_art(at,h,5);at+=5;int w=h[2],height=h[3],stride=(w*3+7)/8,ms=(w+7)/8;
 if(!w||w>64||height>64)return;
 for(int y=0;y<height;y++){uint8_t row[24],mask[8];read_art(at+y*stride,row,stride);if(h[4])read_art(at+height*stride+y*ms,mask,ms);int last=-1,start=0;
  for(int x=0;x<=w;x++){int color=-1;if(x<w&&(!h[4]||(mask[x/8]&(128>>(x%8))))){int bit=x*3,b=bit/8,shift=bit%8;unsigned v=row[b]<<8;if(b+1<stride)v|=row[b+1];color=(v>>(13-shift))&7;}
   if(color!=last){if(last>=0)box(32+(h[0]+start+dx)*2,43+(h[1]+y+dy)*2,(x-start)*2,2,pal[last]);last=color;start=x;}
  }
 }
}
static int bounce(uint32_t t,int span){int x=t%(span*2);return x>span?span*2-x:x;}
static void room(uint32_t t,int ambience){
 box(0,0,200,228,WALL);line(0,182,200,182,1,LINE);line(12,182,0,203,1,LIGHT);line(186,182,199,205,1,LIGHT);
 // Spare architectural lines contrast deliberately with the warm pixel character.
 line(0,9,200,9,1,LIGHT);box(7,67,39,66,LIGHT);box(10,70,33,60,0xe7eee7);line(26,70,26,130,1,LINE);line(10,99,43,99,1,LINE);
 line(29,126,32,104,2,0xa2b9a0);line(31,114,18,108,2,0xa2b9a0);
 // Ceiling fan: four clean held blade orientations, no stored frames.
 line(30,10,30,27,2,LINE);int p=(ambience&1)?(t/200)%4:0;
 const int vx[]={22,17,0,-17},vy[]={0,7,10,7};
 line(30-vx[p],29-vy[p],30+vx[p],29+vy[p],3,LINE);line(30+vy[p]*2,29-vx[p]/2,30-vy[p]*2,29+vx[p]/2,2,LINE);box(27,26,7,6,DARK);
 // Wall monitor stays entirely to the right of the face.
 box(155,66,41,34,DARK);box(158,69,35,28,0xdce6e1);
 int sx=(ambience&2)?bounce(t/100,24):7,sy=(ambience&2)?bounce(t/150,16):4;
 box(160+sx,71+sy,6,5,LINE);box(162+sx,72+sy,2,2,0xdce6e1);
 line(175,100,175,107,2,LINE);line(164,108,185,108,2,LINE);
 line(156,139,197,139,1,LINE);line(192,139,192,180,1,LINE);
 box(164,129,14,9,LIGHT);line(166,128,167,117,2,LINE);line(169,128,172,119,1,LINE);
}
static Key pose(unsigned shot,uint32_t t){const Key *k=tracks[shot];int n=counts[shot];if(t>=k[n-1].t)return k[n-1];int i=0;while(i+1<n&&t>=k[i+1].t)i++;Key a=k[i],b=k[i+1];int f=(t-a.t)*1024/(b.t-a.t);f=f*f*(3072-2*f)/1048576;a.x+=(b.x-a.x)*f/1024;a.y+=(b.y-a.y)*f/1024;return a;}
static void face(int f,int dy){
 const uint8_t eyes[]={PART_EYES_OPEN,PART_EYES_SHOCK,PART_EYES_LOOK,PART_EYES_LAUGH,PART_EYES_BLINK,PART_EYES_LOOK};
 const uint8_t mouths[]={PART_MOUTH_REST,PART_MOUTH_SHOCK,PART_MOUTH_THINK,PART_MOUTH_REST,PART_MOUTH_SMALL,PART_MOUTH_WORRIED};
 piece(PART_HEAD,0,dy);piece(eyes[f],0,dy);piece(PART_CHEEKS,0,dy);piece(PART_NOSE,0,dy);piece(mouths[f],0,dy);
}
static void torso(void){
 // Extend the approved hoodie below its crop; no waist/leg movement.
 POLY(pal[0],45,160,146,160,159,181,163,214,32,214,35,183);
 POLY(pal[4],47,163,144,163,154,184,157,213,38,213,41,184);
 POLY(pal[5],86,162,111,162,117,212,81,212);
 line(78,168,75,211,3,pal[0]);line(119,167,123,211,3,pal[0]);
 line(81,170,80,187,2,pal[5]);line(116,170,119,187,2,pal[5]);
 piece(PART_BODY,0,0);
}
static void hand(int x,int y){
 POLY(pal[0],x-7,y-9,x+3,y-12,x+8,y-7,x+8,y+5,x+1,y+10,x-7,y+5);
 POLY(pal[2],x-5,y-8,x+2,y-10,x+6,y-6,x+6,y+4,x,y+7,x-5,y+3);
 line(x-3,y-4,x+2,y-4,1,pal[3]);line(x-3,y,x+3,y,1,pal[3]);
}
static void gesture(unsigned shot,Key k,uint32_t t){
 if(!shot){return;}
 int x=k.x,y=k.y;
 // Elbow hidden by table, shoulder remains fixed. A short forearm enters frame.
 line(142,163,153,199,18,pal[0]);line(142,164,153,199,14,pal[4]);
 line(153,199,x,y+9,18,pal[0]);line(153,199,x,y+9,14,pal[4]);
 line(x-6,y+8,x+6,y+8,3,pal[5]);
 if(shot==2){
  box(x-17,y-39,26,43,pal[0]);box(x-14,y-36,20,34,0xb3c9c2);box(x-10,y-30,12,3,DARK);box(x-10,y-24,9,2,LINE);box(x-6,y,4,1,pal[5]);
 }
 hand(x,y);
 if(shot==1){int len=t<2400?13:5;
  line(x-3,y-6,x-3-len/2,y-6-len,4,0x996633);line(x-3,y-6,x-3-len/2,y-6-len,2,0xffdd88);
 }
}
static void stage(unsigned shot,uint32_t action,uint32_t ambient,int mode){
 palette();room(ambient,mode);Key k=pose(shot,action);torso();face(k.face,k.head);gesture(shot,k,action);
 // Foreground tabletop masks the arm origin; never show lower-body motion.
 box(0,207,200,21,0xd6c8b2);line(0,207,200,207,2,DARK);line(0,211,200,211,1,0xf0e6d5);
 box(10,201,24,6,0xeee7d8);box(13,199,18,3,0xfdf9ef);
}
