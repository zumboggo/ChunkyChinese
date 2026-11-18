// Shared native/host visual-novel renderer. Backend provides rect() and portrait().
#include "visual_novel_data.h"
static uint32_t pal[8];
#define WALL 0xf6f4ee
#define LIGHT 0xd7dcd5
#define LINE 0x889b9e
#define DARK 0x506971
static void box(int x,int y,int w,int h,uint32_t c){rect(x,y,w,h,c);}
static void line(int x,int y,int x2,int y2,int width,uint32_t c){
 // Exact union of square stamps, collapsed for axis-aligned strokes.
 if(y==y2){box((x<x2?x:x2)-width/2,y-width/2,abs(x2-x)+width,width,c);return;}
 if(x==x2){box(x-width/2,(y<y2?y:y2)-width/2,width,abs(y2-y)+width,c);return;}
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
static int bounce(uint32_t t,int span){int x=t%(span*2);return x>span?span*2-x:x;}
static void room(uint32_t t,int ambience){
 box(0,0,200,228,WALL);line(0,182,200,182,1,LINE);line(12,182,0,203,1,LIGHT);line(186,182,199,205,1,LIGHT);
 // Spare architectural lines contrast deliberately with the warm pixel character.
 line(0,9,200,9,1,LIGHT);box(7,67,39,66,LIGHT);box(10,70,33,60,0xe7eee7);line(26,70,26,130,1,LINE);line(10,99,43,99,1,LINE);
 line(29,126,32,104,2,0xa2b9a0);line(31,114,15+bounce(t/1000,6),108,2,0xa2b9a0);
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
static VNKey vn_pose(unsigned action,uint32_t t){
 const VNKey *k=vn_tracks[action];int n=vn_counts[action];if(t>=k[n-1].t)return k[n-1];int i=0;while(i+1<n&&t>=k[i+1].t)i++;VNKey a=k[i],b=k[i+1];int f=(t-a.t)*1024/(b.t-a.t);f=f*f*(3072-2*f)/1048576;a.x+=(b.x-a.x)*f/1024;a.y+=(b.y-a.y)*f/1024;return a;
}
static void torso(unsigned who){
 // Extend the approved hoodie below its crop; no waist/leg movement.
 POLY(pal[0],45,160,146,160,159,181,163,214,32,214,35,183);
 POLY(pal[4],47,163,144,163,154,184,157,213,38,213,41,184);
 POLY(who==4?pal[4]:pal[5],86,162,111,162,117,212,81,212);
 line(78,168,75,211,3,pal[0]);line(119,167,123,211,3,pal[0]);
 line(81,170,80,187,2,pal[5]);line(116,170,119,187,2,pal[5]);

}
static void hand(int x,int y){
 POLY(pal[0],x-7,y-9,x+3,y-12,x+8,y-7,x+8,y+5,x+1,y+10,x-7,y+5);
 POLY(pal[2],x-5,y-8,x+2,y-10,x+6,y-6,x+6,y+4,x,y+7,x-5,y+3);
 line(x-3,y-4,x+2,y-4,1,pal[3]);line(x-3,y,x+3,y,1,pal[3]);
}
static void gesture(unsigned prop,VNKey k,uint32_t t,bool arm){
 if(!arm){return;}
 int x=k.x,y=k.y;
 // Elbow hidden by table, shoulder remains fixed. A short forearm enters frame.
 line(142,163,153,199,18,pal[0]);line(142,164,153,199,14,pal[4]);
 line(153,199,x,y+9,18,pal[0]);line(153,199,x,y+9,14,pal[4]);
 line(x-6,y+8,x+6,y+8,3,pal[5]);
 if(prop==2){
  box(x-17,y-39,26,43,pal[0]);box(x-14,y-36,20,34,0xb3c9c2);box(x-10,y-30,12,3,DARK);box(x-10,y-24,9,2,LINE);box(x-6,y,4,1,pal[5]);
 }
 if(prop==3){box(x-12,y-24,22,25,pal[0]);box(x-9,y-21,16,21,0xb3c9c2);line(x+10,y-20,x+17,y-18,3,pal[0]);line(x+17,y-18,x+17,y-6,3,pal[0]);line(x+17,y-6,x+10,y-4,3,pal[0]);}
 hand(x,y);
 if(prop==1){int len=t<2400?13:5;
  line(x-3,y-6,x-3-len/2,y-6-len,4,0x996633);line(x-3,y-6,x-3-len/2,y-6-len,2,0xffdd88);
 }
}

// Muted architectural settings remain distinct from the pixel character.
static void background(int setting,int ambient,uint32_t t){
 uint32_t exterior=t%12000;
 if(setting==3){
  room(t,vn_decor[setting]);
  if(ambient==4){for(int i=0;i<4;i++){int x=14+i*8,y=73+(i*11+(int)(exterior*180/12000))%45;line(x,y,x-2,y+5,1,LINE);}}
  if(ambient==5){int x=4+(int)(exterior*50/12000);if(x>18&&x<34){line(x-5,124,x+3,124,3,LINE);box(x+3,120,5,5,LINE);line(x-6,124,x-9,120,1,LINE);}}
  return;
 }
 box(0,0,200,228,WALL);line(0,182,200,182,1,LINE);
 if(setting==6){
  line(0,155,200,155,1,LINE);line(175,155,175,57,3,LINE);
  line(175,80,157,67,7,LIGHT);line(175,70,190,51,9,LIGHT);return;
 }
 if(setting==5){
  line(12,12,188,12,2,LINE);line(12,12,12,179,2,LINE);line(188,12,188,179,2,LINE);
  box(147,121,46,11,LIGHT);box(148+(t/180)%36,123,8,2,0xb3c9c2);return;
 }
 // A window, with scenery clipped to its edges by the native/host rectangle backend.
 box(7,25,186,91,LIGHT);box(10,28,180,85,0xe7eee7);
 if(ambient==0){
  for(int i=0;i<8;i++){int x=(i*38+380-(int)(exterior*380/12000))%380-40;int y=64+(i%3)*12;
   if(x>10&&x<187){box(x,y,2,112-y,LINE);box(x,y,20<190-x?20:190-x,2,LINE);}}
 }else if(ambient==1){
  int x=(int)(exterior*240/12000)-20;if(x>14&&x<184){box(x-3,68,6,6,LINE);line(x,75,x,86,3,LINE);int stride=bounce(t/110,6)-3;line(x,85,x-4-stride,99,2,LINE);line(x,85,x+4+stride,99,2,LINE);}
 }else if(ambient==4){
  for(int i=0;i<12;i++){int x=14+i*15,y=32+(i*17+t/25)%70;line(x,y,x-2,y+5,1,LINE);}
 }else if(ambient==5){int x=(int)(exterior*240/12000)-20;if(x>20&&x<177){line(x-8,102,x+6,102,5,LINE);box(x+6,96,7,7,LINE);line(x-9,102,x-15,96,2,LINE);}}
 else if(ambient==2){int dx=bounce(t/1000,6)-3;line(166,109,169+dx,57,2,LINE);line(169+dx,72,152+dx,61,4,LINE);line(169+dx,79,183+dx,66,4,LINE);}
 line(100,26,100,115,2,LINE);line(7,115,193,115,2,LINE);
 if(setting==0){line(0,123,200,123,2,LINE);line(0,9,200,9,1,LINE);line(10,10,10,24,2,LINE);line(190,10,190,24,2,LINE);}
 if(setting==4){box(8,131,40,33,LINE);box(10,133,36,29,LIGHT);}
 if(vn_decor[setting]&1){int p=(t/200)%4;const int vx[]={22,17,0,-17},vy[]={0,7,10,7};line(30,0,30,14,2,LINE);line(30-vx[p],17-vy[p],30+vx[p],17+vy[p],3,LINE);line(30+vy[p]*2,17-vx[p]/2,30-vy[p]*2,17+vx[p]/2,2,LINE);box(27,14,7,6,DARK);}
 if(vn_decor[setting]&2){box(155,126,41,34,DARK);box(158,129,35,28,LIGHT);box(160+bounce(t/100,24),131+bounce(t/150,16),6,5,LINE);}
}
// portrait backend uses the same cropped-tile decoder as full-screen reactions.
static void vn_stage(unsigned who,unsigned action,unsigned setting,unsigned ambient,uint32_t t,uint32_t bg,VNKey *custom,int hx){
 const uint32_t *c=vn_colors[who];pal[0]=c[0];pal[2]=c[1];pal[3]=c[2];pal[4]=c[3];pal[5]=c[4];
 background(setting,ambient,bg);VNKey k=custom?*custom:vn_pose(action,t);
 torso(who);portrait(who,k.emotion,t,hx,k.head);
 bool arm=vn_props[action]||action==VN_THINK||custom;
 gesture(vn_props[action],k,t,arm);
 if(who==4&&arm){line(k.x-6,k.y+9,k.x+6,k.y+9,3,0xaaaa00);line(k.x+4,k.y+12,189,204,1,0xaaaa00);}
 if(setting!=6){box(0,207,200,21,0xd6c8b2);line(0,207,200,207,2,DARK);line(0,211,200,211,1,0xf0e6d5);if(setting==1){box(10,201,24,6,0xeee7d8);box(13,199,18,3,0xfdf9ef);}}
}
