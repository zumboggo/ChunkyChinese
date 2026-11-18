// Browser companion to visual_novel_draw.h: approved streamed pieces, bounded gestures.
// Uses the watch palette and the same integer rasterization; no old full-body rigs.
function visualNovel(config,resource,actors,anims){
 const bytes=Uint8Array.from(atob(resource),c=>c.charCodeAt(0)),u16=a=>bytes[a]|bytes[a+1]<<8,u32=a=>(bytes[a]|bytes[a+1]<<8|bytes[a+2]<<16|bytes[a+3]<<24)>>>0;
 const starts=[0,6,12,18,24,30],gorgon=[0,1,2,4,5,3],young=[0,1,3,0,1,4],settings=['train','cafe','consulate','home','classroom','trading','street'];
 const color=c=>{if(typeof c==='string')c=parseInt(c,16);return '#'+[c>>16&255,c>>8&255,c&255].map(v=>(Math.floor((v+42)/85)*85).toString(16).padStart(2,'0')).join('');};
 const pieces=new Map();
 function piece(base,id){if(id===255)return null;const key=base+':'+id;if(pieces.has(key))return pieces.get(key);let at=base+u32(base+32+id*4);const [x,y,w,h,alpha]=bytes.slice(at,at+5),stride=Math.ceil(w*3/8),ms=Math.ceil(w/8);at+=5;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),data=ctx.createImageData(w,h),pal=[];for(let i=0;i<8;i++)pal.push([...bytes.slice(base+8+i*3,base+11+i*3)].map(v=>Math.floor((v+42)/85)*85));for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){if(alpha&&!(bytes[at+h*stride+yy*ms+(xx>>3)]&(128>>(xx%8))))continue;const bit=xx*3,b=Math.floor(bit/8),v=(bytes[at+yy*stride+b]<<8)|(b+1<stride?bytes[at+yy*stride+b+1]:0),rgb=pal[(v>>(13-bit%8))&7],p=(yy*w+xx)*4;data.data.set([...rgb,255],p);}ctx.putImageData(data,0,0);const result={canvas,x,y};pieces.set(key,result);return result;}
 function actor(ctx,who,emotion,t,hx,hy){const a=actors[who],anim=anims[starts[who]+(who===4?gorgon[emotion]:who===5?young[emotion]:emotion)];let step=0;while(step+1<anim[2]){const d=u16(anim[0]+step*6);if(t<d)break;t-=d;step++;}const f=bytes.slice(anim[0]+step*6,anim[0]+step*6+6),signed=v=>v>127?v-256:v;function draw(id,dx=0,dy=0){const p=piece(a[0],id);if(p)ctx.drawImage(p.canvas,32+(p.x+dx)*2,43+(p.y+dy)*2,p.canvas.width*2,p.canvas.height*2);}if(a[1])draw(f[2],hx,hy);else{const dx=signed(f[4])+hx,dy=signed(f[5])+hy;draw(0);draw(1,dx,dy);draw(f[2],dx,dy);draw(a[2],dx,dy);draw(a[3],dx,dy);draw(f[3],dx,dy);}}
 function pose(name,t){const keys=config.actions[name].keys;let i=0;while(i+1<keys.length&&t>=keys[i+1][0])i++;const a=[...keys[i]],b=keys[i+1];if(!b)return a;let f=Math.trunc((t-a[0])*1024/(b[0]-a[0]));f=Math.trunc(f*f*(3072-2*f)/1048576);a[1]+=Math.trunc((b[1]-a[1])*f/1024);a[2]+=Math.trunc((b[2]-a[2])*f/1024);return a;}
 return {render(ctx,s,state,time,bg){
  const binding=config.bindings[s.id]||{actor:s.recipe?.actor,action:s.recipe?.prop==='cup'?'sip':'think'},who=config.actors.findIndex(a=>a.name===binding.actor);if(who<0)return;
  let action=binding.action,t=Math.trunc(time*4000/s.duration);if(s.nativeId===1&&(state==='establish'||state==='waiting')){action='listen';t=state==='waiting'?4000:Math.trunc(time*4000/s.establish);}
  const setting=settings.indexOf(s.setting),ambient=['train','walkers','foliage','light','rain','cat','none'].indexOf(s.ambient);if(ambient===6)bg=0;bg=Math.trunc(bg);let k=pose(action,t),hx=0;const c=config.actors[who].palette.map(v=>parseInt(v,16)),ink=c[0],skin=c[1],shade=c[2],shirt=c[3],trim=c[4];
  if(s.recipe){const keys=s.recipe.keys;let i=1;while(i<keys.length-1&&time>keys[i][0])i++;const a=keys[i-1],b=keys[i];let f=time>=b[0]?1:(time-a[0])/(b[0]-a[0]);f=f*f*(3-2*f);k=[0,150+Math.trunc(a[2]+(b[2]-a[2])*f),194+Math.trunc(a[3]+(b[3]-a[3])*f),2,Math.trunc(a[1]+(b[1]-a[1])*f)];hx=Math.trunc((a[4]+(b[4]-a[4])*f)/100);t=time;}
  ctx.imageSmoothingEnabled=false;
  function box(x,y,w,h,c){ctx.fillStyle=color(c);ctx.fillRect(x,y,w,h);}
  function line(x,y,x2,y2,width,c){let dx=Math.abs(x2-x),sx=x<x2?1:-1,dy=-Math.abs(y2-y),sy=y<y2?1:-1,err=dx+dy;for(;;){box(x-Math.trunc(width/2),y-Math.trunc(width/2),width,width,c);if(x===x2&&y===y2)break;let e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}}
  function poly(c,...pts){const n=pts.length/2,ys=pts.filter((_,i)=>i%2),lo=Math.max(0,Math.min(...ys)),hi=Math.min(227,Math.max(...ys));for(let y=lo;y<=hi;y++){const xs=[];for(let i=0,j=n-1;i<n;j=i++){const [x1,y1]=pts.slice(j*2,j*2+2),[x2,y2]=pts.slice(i*2,i*2+2);if((y1<=y&&y2>y)||(y2<=y&&y1>y))xs.push(x1+Math.trunc((y-y1)*(x2-x1)/(y2-y1)));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)box(xs[i],y,xs[i+1]-xs[i]+1,1,c);}}
  const WALL=0xf6f4ee,LIGHT=0xd7dcd5,LINE=0x889b9e,DARK=0x506971,bounce=(t,span)=>{const x=Math.trunc(t)%(span*2);return x>span?span*2-x:x;};
  function fan(y){const p=Math.trunc(bg/200)%4,vx=[22,17,0,-17][p],vy=[0,7,10,7][p];line(30,y-19,30,y-3,2,LINE);line(30-vx,y-vy,30+vx,y+vy,3,LINE);line(30+vy*2,y-Math.trunc(vx/2),30-vy*2,y+Math.trunc(vx/2),2,LINE);box(27,y-3,7,6,DARK);}
  function monitor(y){box(155,y,41,34,DARK);box(158,y+3,35,28,setting===3?0xdce6e1:LIGHT);const x=160+bounce(bg/100,24),yy=y+5+bounce(bg/150,16);box(x,yy,6,5,LINE);if(setting===3)box(x+2,yy+1,2,2,0xdce6e1);}
  box(0,0,200,228,WALL);line(0,182,200,182,1,LINE);
  if(setting===3){line(12,182,0,203,1,LIGHT);line(186,182,199,205,1,LIGHT);line(0,9,200,9,1,LIGHT);box(7,67,39,66,LIGHT);box(10,70,33,60,0xe7eee7);line(26,70,26,130,1,LINE);line(10,99,43,99,1,LINE);line(29,126,32,104,2,0xa2b9a0);line(31,114,15+bounce(bg/1000,6),108,2,0xa2b9a0);fan(29);monitor(66);line(175,100,175,107,2,LINE);line(164,108,185,108,2,LINE);line(156,139,197,139,1,LINE);line(192,139,192,180,1,LINE);box(164,129,14,9,LIGHT);line(166,128,167,117,2,LINE);line(169,128,172,119,1,LINE);
   if(ambient===4){for(let i=0;i<4;i++){const x=14+i*8,y=73+(i*11+Math.trunc((bg%12000)*180/12000))%45;line(x,y,x-2,y+5,1,LINE);}}
   if(ambient===5){const x=4+Math.trunc((bg%12000)*50/12000);if(x>18&&x<34){line(x-5,124,x+3,124,3,LINE);box(x+3,120,5,5,LINE);line(x-6,124,x-9,120,1,LINE);}}
  }
  else if(setting===6){line(0,155,200,155,1,LINE);line(175,155,175,57,3,LINE);line(175,80,157,67,7,LIGHT);line(175,70,190,51,9,LIGHT);}
  else if(setting===5){line(12,12,188,12,2,LINE);line(12,12,12,179,2,LINE);line(188,12,188,179,2,LINE);box(147,121,46,11,LIGHT);box(148+Math.trunc(bg/180)%36,123,8,2,0xb3c9c2);}
  else{box(7,25,186,91,LIGHT);box(10,28,180,85,0xe7eee7);const et=bg%12000;
   if(ambient===0){for(let i=0;i<8;i++){const x=(i*38+380-Math.trunc(et*380/12000))%380-40,y=64+i%3*12;if(x>10&&x<187){box(x,y,2,112-y,LINE);box(x,y,Math.min(20,190-x),2,LINE);}}}
   else if(ambient===1){const x=Math.trunc(et*240/12000)-20;if(x>14&&x<184){box(x-3,68,6,6,LINE);line(x,75,x,86,3,LINE);const stride=bounce(bg/110,6)-3;line(x,85,x-4-stride,99,2,LINE);line(x,85,x+4+stride,99,2,LINE);}}
   else if(ambient===4){for(let i=0;i<12;i++){const x=14+i*15,y=32+(i*17+Math.trunc(bg/25))%70;line(x,y,x-2,y+5,1,LINE);}}
   else if(ambient===5){const x=Math.trunc(et*240/12000)-20;if(x>20&&x<177){line(x-8,102,x+6,102,5,LINE);box(x+6,96,7,7,LINE);line(x-9,102,x-15,96,2,LINE);}}
   else if(ambient===2){const dx=bounce(bg/1000,6)-3;line(166,109,169+dx,57,2,LINE);line(169+dx,72,152+dx,61,4,LINE);line(169+dx,79,183+dx,66,4,LINE);}
   line(100,26,100,115,2,LINE);line(7,115,193,115,2,LINE);
   if(setting===0){line(0,123,200,123,2,LINE);line(0,9,200,9,1,LINE);line(10,10,10,24,2,LINE);line(190,10,190,24,2,LINE);}if(setting===4){box(8,131,40,33,LINE);box(10,133,36,29,LIGHT);}const decor=config.roomDecor[s.setting];if(decor&1)fan(17);if(decor&2)monitor(126);
  }
  poly(ink,45,160,146,160,159,181,163,214,32,214,35,183);poly(shirt,47,163,144,163,154,184,157,213,38,213,41,184);poly(who===4?shirt:trim,86,162,111,162,117,212,81,212);line(78,168,75,211,3,ink);line(119,167,123,211,3,ink);line(81,170,80,187,2,trim);line(116,170,119,187,2,trim);
  actor(ctx,who,k[3],t,hx,k[4]);
  const prop=config.actions[action].prop,arm=prop||action==='think'||!!s.recipe,x=k[1],y=k[2];
  if(arm){line(142,163,153,199,18,ink);line(142,164,153,199,14,shirt);line(153,199,x,y+9,18,ink);line(153,199,x,y+9,14,shirt);line(x-6,y+8,x+6,y+8,3,trim);
   if(prop===2){box(x-17,y-39,26,43,ink);box(x-14,y-36,20,34,0xb3c9c2);box(x-10,y-30,12,3,DARK);box(x-10,y-24,9,2,LINE);box(x-6,y,4,1,trim);}
   if(prop===3){box(x-12,y-24,22,25,ink);box(x-9,y-21,16,21,0xb3c9c2);line(x+10,y-20,x+17,y-18,3,ink);line(x+17,y-18,x+17,y-6,3,ink);line(x+17,y-6,x+10,y-4,3,ink);}
   poly(ink,x-7,y-9,x+3,y-12,x+8,y-7,x+8,y+5,x+1,y+10,x-7,y+5);poly(skin,x-5,y-8,x+2,y-10,x+6,y-6,x+6,y+4,x,y+7,x-5,y+3);line(x-3,y-4,x+2,y-4,1,shade);line(x-3,y,x+3,y,1,shade);
   if(prop===1){const len=t<2400?13:5;line(x-3,y-6,x-3-Math.trunc(len/2),y-6-len,4,0x996633);line(x-3,y-6,x-3-Math.trunc(len/2),y-6-len,2,0xffdd88);}
   if(who===4){line(x-6,y+9,x+6,y+9,3,0xaaaa00);line(x+4,y+12,189,204,1,0xaaaa00);}
  }
  if(setting!==6){box(0,207,200,21,0xd6c8b2);line(0,207,200,207,2,DARK);line(0,211,200,211,1,0xf0e6d5);if(setting===1){box(10,201,24,6,0xeee7d8);box(13,199,18,3,0xfdf9ef);}}
  if(s.nativeId===1&&state==='waiting'){box(0,204,200,24,0x000055);ctx.fillStyle='white';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('Pick up the phone',100,222);}
 }};
}
