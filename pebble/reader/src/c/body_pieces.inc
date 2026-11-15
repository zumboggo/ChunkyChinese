// Pre-rasterized pieces share the portrait decoder and its existing 512-byte cache.
static uint8_t body_palette[8];
void sceneBodyDraw(GContext *ctx,unsigned id,int x,int y,int mirror){
 if(id==3&&mirror)id=5;
 uint32_t at=ALDEN_BODY_OFFSET+reaction_u32(ALDEN_BODY_OFFSET+32+id*4);uint8_t h[5];reaction_read(at,h,5);if(!body_palette[0])reaction_palette(0,body_palette);
 reaction_x=32+((x-32)/2)*2;reaction_y=43+((y-43)/2)*2;reaction_scale=2;
 // reaction_piece treats its offsets as unsigned; cancel those then anchor sleeves.
 reaction_x-=h[0]*2;reaction_y-=h[1]*2;
 if(id>=6){reaction_x-=(int8_t)h[0]*2;reaction_y-=(int8_t)h[1]*2;}
 reaction_piece(ctx,ALDEN_BODY_OFFSET,id,0,0,body_palette);
}
void sceneBodySleeve(GContext *ctx,int x1,int y1,int x2,int y2){
 int dx=x2-x1,dy=y2-y1,a=abs(dx),b=abs(dy),q;
 if(!a&&!b){return;}
 q=b*256<a*51?0:b*256<a*171?1:b*171<a*256?2:b*51<a*256?3:4;
 if(dx<0)q=8-q;
 if(dy<0)q=16-q;
 int length=((a>b?a:b)+3*(a>b?b:a)/8)/2;
 sceneBodyDraw(ctx,6+(length<=17?0:length<=30?16:32)+(q&15),x2,y2,0);
}
