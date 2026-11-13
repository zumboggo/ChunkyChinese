// Shared-library recipe adapters for the five original scenes. Drawing primitives
// and Alden geometry are embedded from the maintained train preview by the generator.
function scalar(keys,t){for(let i=1;i<keys.length;i++)if(t<=keys[i].t)return keys[i-1].value+(keys[i].value-keys[i-1].value)*smooth((t-keys[i-1].t)/(keys[i].t-keys[i-1].t));return keys.at(-1).value;}
function directed(def,t){const p=structuredClone(POSES[def.pose]);p.gaze=1;for(const tr of def.tracks){const v=scalar(tr.keys,t),[key,axis]=tr.field.split('.');if(key==='angle')p.head[2]=v;else if(axis)p[key][axis==='x'?0:1]=v;else p[key]=v;}if(def.idle){const [key,axis]=def.idle.field.split('.');p[key][axis==='x'?0:1]+=Math.sin(t*def.idle.rate)*def.idle.amplitude;}return p;}
function milkshake(x,y){poly([[x-6,y-12],[x+6,y-12],[x+4,y+5],[x-4,y+5]],C.ink);poly([[x-4,y-10],[x+4,y-10],[x+2,y+3],[x-2,y+3]],'#ffaaaa');line([[x+1,y-11],[x+2,y-23],[x-2,y-26]],C.ink);}
function cafe(scene,t){
 rect(0,0,200,228,C.paper);line([[14,94],[14,22],[186,22],[186,94],[14,94]],C.rail);line([[100,22],[100,94]],C.rail);
 for(const [x,y,w] of [[26,57,35],[117,43,49]])line([[x,86],[x,y],[x+w,y],[x+w,86]],C.rail);
 line([[17,140],[17,117],[49,117]],C.near,2);line([[183,140],[183,117],[151,117]],C.near,2);line([[0,194],[200,194]],C.rail);
 const child=directed(scene.actors.child,t),hannah=directed(scene.actors.hannah,t);
 ctx.save();ctx.translate(-4,39);ctx.scale(.73,.73);character(child,false,0,1);if(scene.id==='alden-listens'&&t<scene.prop.release)milkshake(child.hand[0]+1,child.hand[1]-4);ctx.restore();
 ctx.save();ctx.translate(204,39);ctx.scale(-.73,.73);character(hannah,false,0,2);if(scene.id==='hannah-fry'&&t>=scene.prop.contact){const n=t<scene.prop.bite?scene.prop.length:scene.prop.bittenLength;line([[hannah.hand[0],hannah.hand[1]-1],[hannah.hand[0]+1,hannah.hand[1]-n]],'#ffaa00',3);}ctx.restore();
 poly([[65,151],[135,151],[150,163],[50,163]],C.paper);line([[65,151],[135,151],[150,163],[50,163],[65,151]],C.near,2);line([[62,164],[59,193]],C.near,2);line([[138,164],[141,193]],C.near,2);
 line([[94,149],[113,149]],C.rail,2);for(let i=0;i<4;i++)line([[96+i*4,147],[97+i*4,139]],'#ffaa00',2);
 if(scene.id!=='alden-listens'||t>=scene.prop.release)milkshake(78,145);
}
return {draw(scene,state,t,ambient){phase=state;
 if(scene.nativeId>=2&&scene.nativeId<=4){cafe(scene,t);return;}
 scenery(ambient);
 if(scene.id==='train-reflection'){const r=scene.reflection,p=blend(POSES[r.from],POSES[r.to],t/r.duration);p.hand=[115,147];p.brow=r.brow*smooth(t/r.browDuration);character(p,false,0);return;}
 const p=phase==='establish'?blend(POSES.seated,POSES.glance,(t-SCENE.glanceStart)/SCENE.glanceDuration):phase==='waiting'?POSES.glance:phase==='playing'?sample(t):POSES[KEYS.at(-1).pose];
 const attached=phase==='hold'||(phase==='playing'&&t>=ACTION.contact);if(!attached)phone(142,146,-1.3);character(p,attached,phase==='hold'?0:ambient);
 if(phase==='waiting'){rect(0,204,200,24,C.ink);ctx.fillStyle=C.paper;ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText(SCENE.prompt,100,221);ctx.textAlign='left';}
 },seated(){phase='hold';character(POSES.seated,false,0);}};
