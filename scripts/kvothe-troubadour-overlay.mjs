/** Preserve the approved young Kvothe art through shared engine syncs. */
export function kvotheTroubadourOverlay(content){
 const replace=(from,to)=>{if(!content.includes(from))throw Error('Kvothe overlay needs updating: '+from);content=content.replace(from,to)};
 replace("import RefinedFace from './RefinedFace';", "import RefinedFace from './RefinedFace';\nimport {KvotheFace,KvotheCostume,KvotheCloak} from '../../KvotheTroubadour';");
 replace(' const weedOptionA=', " const troubadour=actorId==='Kvothe';\n const weedOptionA=");
 replace('const palette=weedOptionA?',"const palette=troubadour?{...character.rig.palette,skin:'#f1bc95',hair:'#e87536',shirt:'#397e5e',trim:'#efdbad'}:weedOptionA?");
 replace('data-weed-design=', 'data-kvothe-design={troubadour?"troubadour":undefined} data-weed-design=');
 replace('const refined=weedOptionA||', 'const refined=troubadour||weedOptionA||');
 replace('<path d="M 106 161', '{troubadour&&<KvotheCloak/>}<path d="M 106 161');
 replace('{weedOptionA?<WeedOptionAShirt/>', '{troubadour?<KvotheCostume/>:weedOptionA?<WeedOptionAShirt/>');
 replace('{kevin?<KevinFace', '{troubadour?<KvotheFace blink={blink} mouth={mouth} startled={startled} laughing={laughing} firm={firm} worried={worried} gazeX={gazeX} gazeY={gazeY}/>:kevin?<KevinFace');
 replace("longSleeves=suit||cardigan","longSleeves=troubadour||suit||cardigan");
 replace("const trouserBase=weedOptionA?","const trouserBase=troubadour?'#444a51':weedOptionA?");
 replace("const shoes=historical?","const shoes=troubadour?'#694336':historical?");
 replace("const view=characterAngle((actorId===", "const view=characterAngle(actorId==='Kvothe'&&!character.rig.views?{...character.rig,preset:'teen-v1'}:(actorId===");
 return content;
}
