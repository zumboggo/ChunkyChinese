// Schema 1: bounded pose data, never executable code. Keep acceptance in sync with downloadable_scene.h.
export const actors=['gorgon','boe','jeremy'];
export const settings=['train','cafe','consulate','home','classroom','trading','street'];
export const ambients=['train','walkers','foliage','light','rain','cat','none'];
export function validSceneWire(wire){
 if(typeof wire!=='string'||wire.length>512||!/^\d+(?:,-?\d+)*$/.test(wire))return false;
 const a=wire.split(',').map(Number),[schema,actor,setting,ambient,prop,count]=a;
 if(a.some(v=>!Number.isInteger(v)||Math.abs(v)>12000)||schema!==1||actor<0||actor>2||setting<0||setting>6||ambient<0||ambient>6||prop<0||prop>1||count<2||count>8||a.length!==6+count*5)return false;
 if((setting===0&&ambient!==0&&ambient!==6)||(setting!==0&&ambient===0)||(setting===5&&ambient!==3&&ambient!==6)||(setting!==5&&ambient===3)||(setting===6&&ambient!==6))return false;
 let previous;
 for(let i=0;i<count;i++){
  const k=a.slice(6+i*5,11+i*5),[t,dy,hx,hy,angle]=k;
  if(t<0||t>12000||(i===0?t!==0:t<=previous[0])||Math.abs(dy)>8||hx< -30||hx>24||hy< -42||hy>8||Math.abs(angle)>300)return false;
  // Segment interpolation stays in the arm's reachable annulus; no elbow singularity.
  const x=25+hx,y=29+hy-dy*.3;
  if(x*x+y*y>56*56)return false;
  if(previous){const px=25+previous[2],py=29+previous[3]-previous[1]*.3,dx=x-px,dy2=y-py,d=dx*dx+dy2*dy2,u=d?Math.max(0,Math.min(1,-(px*dx+py*dy2)/d)):0;if((px+u*dx)**2+(py+u*dy2)**2<64)return false;}
  previous=k;
 }
 return previous[0]>=800;
}
export function encodeScene(recipe){
 const wire=[1,actors.indexOf(recipe.actor),settings.indexOf(recipe.setting),ambients.indexOf(recipe.ambient),['none','cup'].indexOf(recipe.prop),recipe.keys?.length,...(recipe.keys||[]).flat()].join(',');
 if(!validSceneWire(wire))throw Error('Unsupported downloadable scene: check rig, setting, prop, timing and reachable poses');
 return wire;
}
