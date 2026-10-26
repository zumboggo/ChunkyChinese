/** Local art direction, reapplied after upstream shared-animation synchronization. */
export function weedOptionAOverlay(content){
 const replace=(from,to)=>{if(!content.includes(from))throw Error('Weed Option A overlay needs updating: '+from.slice(0,70));content=content.replace(from,to)};
 replace("import RefinedFace from './RefinedFace';", "import RefinedFace from './RefinedFace';\nimport {WeedOptionAFace,WeedOptionAShirt} from '../../WeedOptionA';");
 replace(" const finish=experiment===", " const weedOptionA=actorId==='Hyun'||/Weed|Lee Hyun|李贤/.test(character.name);\n const finish=experiment===");
 replace(" const palette=character.rig.palette||{},skin=finish?", " const palette=weedOptionA?{...character.rig.palette,skin:'#dcaf8e',hair:'#282b2a',shirt:'#526d6c',trim:'#718b86'}:character.rig.palette||{},skin=weedOptionA?palette.skin:finish?");
 replace("shirt=finish?", "shirt=weedOptionA?palette.shirt:finish?");
 replace("ink='#344048'", "ink=weedOptionA?'#202c32':'#344048'");
 replace("const trouserBase=", "const trouserBase=weedOptionA?'#263d49':");
 replace("const trousers=finish?", "const trousers=weedOptionA?trouserBase:finish?");
 replace("const handSkin=finish?", "const handSkin=weedOptionA?skin:finish?");
 replace("stroke={longSleeves?shirt:finish?", "stroke={longSleeves?shirt:weedOptionA?skin:finish?");
 replace('strokeWidth="21" strokeLinecap="round"/><path d={d}', 'strokeWidth={weedOptionA?24:21} strokeLinecap="round"/><path d={d}');
 replace('strokeWidth="17" strokeLinecap="round"/>{finish&&', 'strokeWidth={weedOptionA?20:17} strokeLinecap="round"/>{finish&&!weedOptionA&&');
 // Rolled cuffs follow the shoulder joint; the forearm/hand and props keep their original pivots.
 replace('{longSleeves&&<path', '{weedOptionA&&<path transform={`translate(${x} ${y}) rotate(${a*180/Math.PI})`} d="M -13 12 L 13 12 L 13 22 Q 0 27 -13 22 Z" fill="#718b86" stroke={ink} strokeWidth="1.5"/>}{longSleeves&&<path');
 replace(" const refined=['scrappy'", " const refined=weedOptionA||['scrappy'");
 replace('data-turn={yaw}', 'data-weed-design={weedOptionA?"option-a":undefined} data-turn={yaw}');
 replace("data-age={appearance.age||'teen'}", "data-age={weedOptionA?'teen':appearance.age||'teen'}");
 replace('tailored?<g', 'weedOptionA?<WeedOptionAShirt/>:tailored?<g');
 replace('{finish&&<g data-fabric-detail', '{finish&&!weedOptionA&&<g data-fabric-detail');
 replace('refined?<RefinedFace', 'weedOptionA?<WeedOptionAFace id={gradientId} emotion={emotion} blink={blink} mouth={mouth} startled={startled} laughing={laughing} firm={firm} worried={worried} turn={yaw} gazeX={gazeX} gazeY={gazeY} reduced={reduced}/>:refined?<RefinedFace');
 replace(" const occupied=", " angleDesigns=angleDesigns||((actorId==='Hyun'||/Weed|Lee Hyun|李贤/.test(character.name))?weedAnglesV2:undefined);\n const occupied=");
 replace("import RefinedFace from './RefinedFace';", "import RefinedFace from './RefinedFace';\nimport {weedAnglesV2} from '../../chinese-angle-designs-v2';");
 return content;
}
