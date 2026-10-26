import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {readFileSync} from 'node:fs'
import CartoonActor from './shared/components/CartoonActor'
import {compileStory,replayStory,advanceStory} from './shared/engine/story-engine.js'
import {validateChinese,size,exportPackage,importPackage,type ChinesePackage} from './package'
import {EMOTIONS} from './shared/engine/acting-library.js'
const pack=JSON.parse(readFileSync('stories/animated/chinese-angles-v1.json','utf8')) as ChinesePackage
it('renders identity-specific silhouettes, one/two eyes, costumes and mirrored auto views',()=>{
 for(const id of ['Hyun','Kvothe','Jonathan'])for(const angle of ['front','three-quarter','profile'] as const)for(const turn of [-1,1])for(const emotion of EMOTIONS){
  const svg=renderToStaticMarkup(<CartoonActor actorId={id} character={pack.assets.characters[id]} orientation={angle} turn={turn} emotion={emotion} reduced/>);
  expect(svg).toContain(`data-angle="${angle}"`);expect(svg).not.toMatch(/NaN|Infinity|<image/);
  if(angle!=='front'){
   expect((svg.match(/data-angle-eye=/g)||[]).length).toBe(angle==='profile'?1:2);
   if(id!=='Jonathan')expect(svg).toContain(`data-vector-design="${id==='Hyun'?'weed-option-a':'kvothe-troubadour'}-v2"`);
   else expect(svg).not.toContain('data-vector-design');
  }
  if(id==='Kvothe'){expect(svg).toContain('data-kvothe-cloak');expect(svg).toContain('data-kvothe-costume');expect(svg).toContain('data-kvothe-lute')}
  if(id==='Hyun')expect(svg).toContain('data-weed-costume="A"');
 }
 for(const id of ['Hyun','Kvothe']){
  const svg=renderToStaticMarkup(<CartoonActor actorId={id} character={pack.assets.characters[id]} turn={-1} reduced/>);
  expect(svg).toContain('transform="translate(240 0) scale(-1 1)"');
 }
 expect(pack.assets.characters.Jonathan.rig.appearance).toMatchObject({age:'adult',hair:'swept',outfit:'robe'});
})
it('retains stable front geometry for props, contact, activities and held rests',()=>{
 for(const id of ['Hyun','Kvothe','Jonathan'])for(const state of [{prop:'sword'},{prop:'phone'},{prop:'bow'},{prop:'lance'},{response:'steady'},{rest:'kneeling'},{rest:'seated'},{activity:{kind:'walk' as const,pace:'steady' as const,paused:false}}]){
  const svg=renderToStaticMarkup(<CartoonActor actorId={id} character={pack.assets.characters[id]} orientation="profile" {...state} reduced/>);
  expect(svg).toContain('data-angle="front"');expect(svg).not.toMatch(/NaN|Infinity/);
 }
})
it('validates the new Mandarin rehearsal, embedded audio, ZIP and saved routes',async()=>{
 expect(validateChinese(pack).errors).toEqual([]);expect(size(pack)).toBeLessThan(5_000_000);
 const {story,errors}=compileStory(pack.script,pack.assets);expect(errors).toEqual([]);
 let state=replayStory(story,[],17);const steps:null[]=[];let beats=0;
 while(!state.ended){steps.push(null);state=advanceStory(story,state,null);expect(replayStory(story,steps,17)).toEqual(state);if(++beats>50)throw Error('Unbounded rehearsal')}
 const zip=await exportPackage(pack);expect(await importPackage(new File([await zip.arrayBuffer()],'angles.zip'))).toEqual(pack);
})
