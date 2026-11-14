import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {reviewPage} from './review-page.mjs';
const library=JSON.parse(fs.readFileSync('scenes/library.json')),out='.local/visual-novel';fs.mkdirSync(out,{recursive:true});
execFileSync('cc',['-O2','scripts/visual-novel-host.c','-o',out+'/render']);
const browser=await chromium.launch({headless:true});let checks=0;
try{const page=await browser.newPage();await page.setContent(reviewPage({library,ensemble:{},shots:[],supported:[],messages:[]}));
 for(const s of library.scenes)for(const t of [0,1800,4000])for(const ambient of [0,1600]){
  execFileSync(out+'/render',[String(s.nativeId),String(t),String(ambient),out+'/frame.ppm']);
  const ppm=fs.readFileSync(out+'/frame.ppm'),header=Buffer.from('P6\n200 228\n255\n');assert.ok(ppm.subarray(0,header.length).equals(header));
  const base64=await page.evaluate(({id,t,ambient})=>{const c=document.createElement('canvas');c.width=200;c.height=228;const s=REVIEW.library.scenes.find(s=>s.nativeId===id);VN.render(c.getContext('2d'),s,'playing',t*s.duration/4000,ambient);return c.toDataURL().split(',')[1];},{id:s.nativeId,t,ambient});
  const actual=await sharp(Buffer.from(base64,'base64')).removeAlpha().raw().toBuffer();
  if(!actual.equals(ppm.subarray(header.length))){await sharp(Buffer.from(base64,'base64')).toFile(out+'/mismatch-browser.png');await sharp(ppm.subarray(header.length),{raw:{width:200,height:228,channels:3}}).png().toFile(out+'/mismatch-native.png');let n=0;for(let i=0;i<actual.length;i++)if(actual[i]!==ppm[i+header.length])n++;throw Error(`Raster mismatch ${s.id} action=${t} ambient=${ambient}: ${n} channels`);}checks++;
 }
 fs.writeFileSync(out+'/browser-parity.json',JSON.stringify({passed:true,pixelExactFrames:checks,renderer:'native C versus browser',physicalWatchTested:false},null,2)+'\n');console.log('PASS '+checks+' pixel-exact native/browser frames');
}finally{await browser.close();}
