import fs from 'node:fs';
import {root} from './runtime-profile.mjs';
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
export function reviewPage(data){
 const train=read('preview/train-scene.html');
 const math=train.slice(train.indexOf('    const smooth='),train.indexOf("    let phase='text'"));
 let drawing=train.slice(train.indexOf('    function line('),train.indexOf('    function words('));
 if(!math||!drawing.includes('function character'))throw Error('Train preview adapter needs updating');
 drawing=drawing.replace('function character(p,attached,t){','function character(p,attached,t,actor=0){').replaceAll('C.coat',"(actor===1?'#ffffaa':C.coat)");
 drawing=drawing.replace('circle(0,0,18,C.ink);',"if(actor===2){circle(-11,17,7,C.hair);circle(-10,25,5,C.hair);circle(12,17,7,C.hair);circle(12,25,5,C.hair);}circle(0,0,18,C.ink);");
 drawing=drawing.replace('const blink=',"if(actor===2){line([[-12,8],[-11,23]],C.hair,5);line([[13,8],[13,23]],C.hair,5);}const blink=");
 const palette=train.match(/const C=(\{[^;]+\});/)[1];
 const classic=`function classic(ctx,lib){const C=${palette},SCENE=lib.scenes[0],ACTION=lib.actions[SCENE.action],POSES=lib.poses,KEYS=ACTION.keys,AMBIENT=lib.ambient,reduced=false;let phase='hold';${math}\n${drawing}\n${read('authoring/classic-extra.js')}\n}`;
 let ensemble=read('scenes/ensemble/renderer.js');
 const marker=' // Chair and anchored rear bindings.';
 if(!ensemble.includes(marker))throw Error('Ensemble background adapter needs updating');
 ensemble=ensemble.replace(marker,' if(opt.backgroundOnly){ctx.restore();return;}\n'+marker);
 const template=read('authoring/review.template.html');
 return template.replace('/* DATA */','const REVIEW='+JSON.stringify(data).replaceAll('<','\\u003c')+';').replace('/* RENDERERS */',()=>ensemble+'\n'+classic).replace('/* CONTROLS */',()=>read('authoring/review-ui.js'));
}
