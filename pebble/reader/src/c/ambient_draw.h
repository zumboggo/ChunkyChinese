// Small deterministic repeating worlds; never allocate bitmap frames.
static float positive_mod(float v,float n){while(v<0)v+=n;while(v>=n)v-=n;return v;}
static void walker(float x,float y,float time){
 float a=sine(time*.0062831853f)*4;disc(P(x,y),3,RAIL);line(P(x,y+4),P(x,y+14),RAIL,2);line(P(x-5,y+9-a/2),P(x,y+7),RAIL,1);line(P(x,y+7),P(x+5,y+9+a/2),RAIL,1);line(P(x-a,y+24),P(x,y+14),RAIL,2);line(P(x,y+14),P(x+a,y+24),RAIL,2);
}
static void ambience(uint32_t t,int kind){
 if(kind==0){
  static const int offsets[]={0,42,91,132},heights[]={33,53,25,42},widths[]={28,34,24,30};
  float scroll=(float)t*TRAIN_TILE*TRAIN_FAR_CYCLES/AMBIENT_PERIOD;
  for(int tile=-1;tile<3;tile++)for(int i=0;i<4;i++){
   float x=tile*TRAIN_TILE+offsets[i]-scroll,r=x+widths[i];int y=94-heights[i];
   if(x>=15&&x<=185)line(P(x,94),P(x,y),RAIL,1);
   if(r>=15&&r<=185)line(P(r,y),P(r,94),RAIL,1);
   float l=x<15?15:x,rr=r>185?185:r;if(l<rr)line(P(l,y),P(rr,y),RAIL,1);
   for(int j=0;j<3;j++){float wx=x+6+j*7;if(wx>=15&&wx<=185)line(P(wx,y+5),P(wx,y+9),RAIL,1);}
  }
  float pole=positive_mod(190-(float)t*TRAIN_TILE*TRAIN_NEAR_CYCLES/AMBIENT_PERIOD,TRAIN_TILE);
  for(int i=-1;i<=1;i++){float x=pole+i*TRAIN_TILE;if(x>=15&&x<=185)line(P(x,25),P(x,94),NEAR,2);float l=x-12<15?15:x-12,r=x+12>185?185:x+12;if(l<r)line(P(l,33),P(r,33),NEAR,1);}
 }else if(kind==1){
  // One crossing in a 12s cycle, then a quiet gap. Hide behind window edges.
  if(t<8000){float x=-20+(float)t*240/8000;walker(x,55,t);box(0,49,15,34,PAPER);box(185,49,15,34,PAPER);}
 }else if(kind==2){
  float bend=sine((float)t/AMBIENT_PERIOD*6.2831853f)*3;
  line(P(158,94),P(162+bend,53),RAIL,2);line(P(161+bend,65),P(145+bend,53),RAIL,1);
  line(P(162+bend,73),P(177+bend,59),RAIL,1);disc(P(146+bend,53),5,RAIL);disc(P(176+bend,59),5,RAIL);disc(P(163+bend,49),5,RAIL);
 }else if(kind==4){
  for(int i=0;i<20;i++){float x=16+(i*29)%168,y=26+positive_mod(i*17+(float)t*76*6/AMBIENT_PERIOD,76);if(y<94)line(P(x,y),P(x-2,y+6>99?99:y+6),RAIL,1);}
 }else if(kind==5){
  float x=-25+(float)t*250/AMBIENT_PERIOD,y=94,a=sine(t*.0062831853f)*2;
  if(x>30&&x<168){line(P(x-8,y),P(x+6,y),RAIL,4);disc(P(x+9,y-3),4,RAIL);POLY(RAIL,P(x+6,y-5),P(x+6,y-10),P(x+10,y-6),P(x+13,y-9),P(x+13,y-3));line(P(x-8,y+2),P(x-8+a,y+8),RAIL,2);line(P(x+5,y+2),P(x+5-a,y+8),RAIL,2);line(P(x-9,y),P(x-15,y-5),RAIL,2);}
 }
}
static void room_background(int setting,uint32_t t,int kind){
 box(0,0,200,228,PAPER);
 if(setting==6){
  SEG(0,100,200,100,RAIL,1);SEG(155,100,155,30,RAIL,2);disc(P(155,30),16,RAIL);
 }else if(setting==5){
  SEG(14,16,186,16,RAIL,1);SEG(14,16,14,112,RAIL,1);SEG(186,16,186,112,RAIL,1);box(60,22,80,3,RAIL);
 }else{
  ambience(t,kind);SEG(12,99,12,19,NEAR,1);SEG(12,19,188,19,NEAR,1);SEG(188,19,188,99,NEAR,1);SEG(188,99,12,99,NEAR,1);SEG(100,19,100,99,RAIL,1);
 }
 SEG(0,205,200,205,RAIL,1);SEG(24,205,5,228,RAIL,1);SEG(177,205,196,228,RAIL,1);
}
static void room_props(int setting,uint32_t t){
 if(setting==3||setting==6)return;
 GColor c=setting==5?GLOW:RAIL;
 SEG(133,155,196,155,c,2);SEG(196,155,199,164,c,2);SEG(199,164,126,164,c,2);SEG(126,164,133,155,c,2);SEG(135,165,135,202,RAIL,2);SEG(192,165,192,202,RAIL,2);
 if(setting==5){float x=136+positive_mod((float)t*51/AMBIENT_PERIOD,51);line(P(x,157),P(x+6,162),GColorCeleste,1);}
 if(setting==2){box(163,120,29,24,NEAR);box(166,123,23,17,RAIL);SEG(178,145,178,154,NEAR,2);}
 if(setting==4){SHAPE(PAPER,147,146,176,146,185,154,144,154);SEG(147,146,176,146,NEAR,1);SEG(176,146,185,154,NEAR,1);SEG(185,154,144,154,NEAR,1);}
}
