from pathlib import Path
r=Path(__file__).resolve().parent
s=(r.parent/'hybrid-prototype/hybrid.inc').read_text();a=s.index('static void hybrid_piece');b=s.index('static void hybrid_draw',a)
s=s[:a]+'''/* Packed rows: at most 32 bytes for 64 pixels; shared portrait stream buffer. */
static void hybrid_piece(GContext *ctx,uint8_t part,int dx,int dy){
 ResHandle res=resource_get_handle(RESOURCE_ID_ALDEN_HYBRID);
 uint8_t header[4],palette[16];uint32_t start;
 if(resource_load_byte_range(res,0,header,4)!=4)return;
 int bits=header[0],count=header[1];if((bits!=3&&bits!=4)||count!=(1<<bits)||part>=header[2])return;
 if(resource_load_byte_range(res,4,palette,count)!=(size_t)count)return;
 if(resource_load_byte_range(res,4+count+part*4,(uint8_t*)&start,4)!=4)return;
 handle=res;size=resource_size(res);offset=start;used=available=0;
 int x0=next_byte(),y0=next_byte(),width=next_byte(),height=next_byte();
 if(x0<0||y0<0||width<1||height<1||x0+width>64||y0+height>64)return;
 for(int y=0;y<height;y++){
  uint32_t acc=0;int have=0,last=-1,begin=0;
  for(int x=0;x<=width;x++){
   int index=-1;
   if(x<width){while(have<bits){int value=next_byte();if(value<0)return;acc=(acc<<8)|value;have+=8;}have-=bits;index=(acc>>have)&(count-1);}
   if(index!=last){
    if(last>0){graphics_context_set_fill_color(ctx,(GColor){.argb=palette[last]});graphics_fill_rect(ctx,GRect(4+(x0+begin+dx)*3,12+(y0+y+dy)*3,(x-begin)*3,3),0,GCornerNone);}
    last=index;begin=x;
   }
  }
 }
}
''' +s[b:]
a=s.index(' int dx=k==2?');b=s.index(' hybrid_piece(ctx,0',a)
s=s[:a]+''' int dx=k==2?-1:0,dy=0;
 if(f>=5&&f<=7)dy=-1;else if(f>=13&&f<=24)dy=1;
'''+s[b:]
(r/'compact.inc').write_text(s)
