// Native primitive port of ensemble/renderer.js. Pose tracks and actor colours are generated.
static void ensemble_character(int who,const GestureKey *keys,int count,bool cup,uint32_t t){
 int i=1;
 while(i<count-1&&t>keys[i].t)i++;
 GestureKey a=keys[i-1],b=keys[i];float u=ease((float)(t-a.t)/(b.t-a.t));
 if(t>=keys[count-1].t){a=b=keys[count-1];u=0;}
 float dy=mix(a.dy,b.dy,u),ang=mix(a.angle,b.angle,u);
 Pt hand=P(119+mix(a.hx,b.hx,u),142+mix(a.hy,b.hy,u)),s=P(94,113+dy*.3f);
 bool g=who==0;GColor skin=GColorFromHEX(ensemble_skin[who]),shirt=GColorFromHEX(ensemble_shirt[who]),hair=GColorFromHEX(ensemble_hair[who]),gold=GColorFromHEX(0xaaaa00);
 bool standing=scene_setting_id()==6;
 if(!standing){SEG(60,153,60,119,RAIL,3);SEG(60,119,119,119,RAIL,3);SEG(119,119,119,153,RAIL,3);
 SEG(62,157,60,198,NEAR,3);SEG(117,157,121,198,NEAR,3);}
 if(g){SEG(12,165,43,157,gold,2);SEG(43,157,68,140,gold,2);SEG(12,165,44,180,gold,2);SEG(44,180,108,187,gold,2);}
 if(standing){SEG(78,150,80,197,INK,8);SEG(92,150,113,197,INK,8);}
 else{SEG(78,150,87,173,INK,8);SEG(87,173,82,197,INK,8);SEG(92,150,113,173,INK,8);SEG(113,173,116,198,INK,8);}
 SEG(80,199,94,200,INK,6);SEG(115,199,129,200,INK,6);
 SHAPE(INK,71,108,98,107,105,152,69,152);SHAPE(shirt,74,110,95,110,101,148,73,148);
 SEG(75,114,63,132,INK,8);SEG(63,132,76,146,INK,8);SEG(75,114,63,132,g?skin:shirt,5);SEG(63,132,76,146,g?skin:shirt,5);disc(P(76,146),3,skin);
 SEG(85,96,85,110,skin,7);tx=g?83:86;ty=78+dy;rotation=ang;
 if(g){
  for(int side=-1;side<=1;side+=2)for(int j=0;j<4;j++)POLY(NEAR,P(side*(11+j*2),-15+j*3),P(side*(22+j*2),8+j*5),P(side*(14+j*2),24+j*2),P(side*(17+j),7));
  disc(P(0,0),21,INK);disc(P(0,0),19,skin);disc(P(-7,1),4,INK);disc(P(8,1),4,INK);
  SHAPE(NEAR,-7,8,-5,5,5,5,8,9);for(int j=0;j<4;j++){int x=j<2?-5+j*3:2+(j-2)*3;line(P(x,7),P(x,9),INK,1);}SEG(-5,14,5,14,INK,1);
 }else{
  disc(P(-17,3),3,skin);disc(P(17,3),3,skin);disc(P(0,0),19,INK);disc(P(0,1),17,skin);
  if(who==1){SHAPE(hair,-19,1,-18,-12,-11,-20,9,-20,19,-12,19,0,14,-6,-14,-6);}
  else{SHAPE(hair,-18,-1,-18,-12,-12,-18,-5,-17,-2,-21,5,-17,13,-17,19,-8,17,-1,12,-9,-10,-8);}
  for(int x=-7;x<=7;x+=14){disc(P(x+1,1),1,INK);if(who==1){line(P(x-5,-4),P(x+5,-4),INK,1);line(P(x+5,-4),P(x+5,5),INK,1);line(P(x+5,5),P(x-5,5),INK,1);line(P(x-5,5),P(x-5,-4),INK,1);}}
  if(who==1)SEG(-2,0,2,0,INK,1);
  SEG(-10,-7,-4,-8,INK,1);SEG(4,-8,10,-7,INK,1);SEG(1,5,4,7,NEAR,1);SEG(4,7,1,8,NEAR,1);SEG(-4,12,2,13,INK,1);SEG(2,13,6,11,INK,1);
 }
 tx=ty=rotation=0;
 if(who==1){SEG(73,107,88,113,GColorFromHEX(0xaaaa55),6);SEG(88,113,98,106,GColorFromHEX(0xaaaa55),6);SEG(85,113,80,137,GColorFromHEX(0xaaaa55),6);for(int j=0;j<4;j++)line(P(77,119+j*5),P(83,119+j*5),NEAR,1);}
 // Fixed 27/30px segments; accepted gesture tracks stay within the reachable annulus.
 float dx=hand.x-s.x,ddy=hand.y-s.y,d=root(dx*dx+ddy*ddy),v=(27*27-30*30+d*d)/(2*d),h=root(27*27-v*v);
 Pt e=P(s.x+v*dx/d-h*ddy/d,s.y+v*ddy/d+h*dx/d);
 line(s,e,INK,8);line(e,hand,INK,8);line(s,e,g?skin:shirt,5);line(e,hand,g?skin:shirt,5);
 if(cup){box(hand.x-2,hand.y-15,13,15,PHONE);line(P(hand.x+11,hand.y-12),P(hand.x+16,hand.y-12),PHONE,2);line(P(hand.x+16,hand.y-12),P(hand.x+16,hand.y-4),PHONE,2);line(P(hand.x+16,hand.y-4),P(hand.x+11,hand.y-4),PHONE,2);line(P(hand.x,hand.y-15),P(hand.x+9,hand.y-15),PAPER,1);}
 disc(P(hand.x-1,hand.y),3,skin);
 if(g){for(int j=0;j<3;j++)line(P(hand.x-1,hand.y+j-2),P(hand.x+6,hand.y+j-3),skin,1);line(P(hand.x-7,hand.y-3),P(hand.x-3,hand.y+3),gold,3);line(P(hand.x-5,hand.y+1),P(45,165),gold,1);SEG(45,165,12,165,gold,1);}
}
