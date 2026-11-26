/** Preserve the released Episode 17 desk staging during shared-runtime sync. */
const replacements={
  "components/CartoonActor.tsx": [
    [
      "type Props={angleDesigns?:Partial<Record<'three-quarter'|'profile',VectorAngleDesign>>;orientation?:CharacterOrientation;actingStyle?:'classic'|'polished';turn?:number;listening?:boolean;idlePaused?:boolean;activity?:StoryActivity;activityPaused?:boolean;gazeX?:number;gazeY?:number;character:any;emotion?:string;talking?:boolean;gesture?:string;rest?:string;prop?:string;response?:string;reduced?:boolean;actorId?:string;performanceKey?:number;experiment?:'current'|'polished'|'hybrid';headImage?:string;portrait?:boolean;rider?:boolean};\n",
      "type Props={atDesk?:boolean;angleDesigns?:Partial<Record<'three-quarter'|'profile',VectorAngleDesign>>;orientation?:CharacterOrientation;actingStyle?:'classic'|'polished';turn?:number;listening?:boolean;idlePaused?:boolean;activity?:StoryActivity;activityPaused?:boolean;gazeX?:number;gazeY?:number;character:any;emotion?:string;talking?:boolean;gesture?:string;rest?:string;prop?:string;response?:string;reduced?:boolean;actorId?:string;performanceKey?:number;experiment?:'current'|'polished'|'hybrid';headImage?:string;portrait?:boolean;rider?:boolean};\n"
    ],
    [
      "export default function CartoonActor({character,angleDesigns,orientation='auto',actingStyle='polished',activity,activityPaused=false,emotion='neutral',talking=false,gesture,rest,prop,response,reduced=false,actorId='Lin',performanceKey=0,turn=0,listening=false,idlePaused=false,gazeX=0,gazeY=0,experiment,headImage,portrait=false,rider=false}:Props){\n",
      "export default function CartoonActor({atDesk=false,character,angleDesigns,orientation='auto',actingStyle='polished',activity,activityPaused=false,emotion='neutral',talking=false,gesture,rest,prop,response,reduced=false,actorId='Lin',performanceKey=0,turn=0,listening=false,idlePaused=false,gazeX=0,gazeY=0,experiment,headImage,portrait=false,rider=false}:Props){\n"
    ],
    [
      " const resting={...(POSES[rest||(listeningState==='attentive'?'attentive':listeningState==='warm'?'relaxed':automatic.rest)]||{}),...grip},action={...resting,...(POSES[acting]||{}),...((prop==='phone'||(prop==='lance'&&!['lance-threat','mounted-charge'].includes(acting)))?grip:{})};\n",
      " const deskPose: Record<string, number> = atDesk ? {leftForearm: gazeY > 0 ? -65 : -48, rightForearm: gazeY > 0 ? 65 : 48} : {};\n const resting={...(POSES[rest||(listeningState==='attentive'?'attentive':listeningState==='warm'?'relaxed':automatic.rest)]||{}),...deskPose,...grip},action={...resting,...(POSES[acting]||{}),...((prop==='phone'||(prop==='lance'&&!['lance-threat','mounted-charge'].includes(acting)))?grip:{})};\n"
    ],
    [
      " </g></>}</>}</g></g>{view.amount>0?arm(nearSide):<>{arm('left')}{arm('right')}</>}{meal&&<g data-meal=\"rice\" stroke={ink} strokeWidth=\"2\" strokeLinejoin=\"round\">\n",
      " </g></>}</>}</g></g>{atDesk&&<g data-furniture=\"student-desk\" stroke=\"#423b40\" strokeWidth=\"2.5\" strokeLinejoin=\"round\">\n   <path d=\"M14 319h12l-3 164H13z M213 319h12l3 164h-10z\" fill=\"#656874\"/>\n   <path d=\"M3 309l13-19h207l15 19v11H3z\" fill=\"#af805e\"/>\n   <path d=\"M3 309h235v11H3z\" fill=\"#795540\"/>\n   <path d=\"M85 304l8-10h45l-6 10z\" fill=\"#f1e5c9\"/>\n </g>}{view.amount>0?arm(nearSide):<>{arm('left')}{arm('right')}</>}{meal&&<g data-meal=\"rice\" stroke={ink} strokeWidth=\"2\" strokeLinejoin=\"round\">\n"
    ]
  ],
  "components/PuppetActor.tsx": [
    [
      "function LegacyPuppetActor({character,emotion='neutral',talking=false,gesture,rest,response,reduced=false,idlePaused=false,actorId='actor'}:{character:any;emotion?:string;talking?:boolean;gesture?:string;rest?:string;prop?:string;response?:string;reduced?:boolean;actorId?:string;performanceKey?:number;gazeX?:number;gazeY?:number;activity?:StoryActivity;activityPaused?:boolean;orientation?:'auto'|'front'|'three-quarter'|'profile';actingStyle?:'classic'|'polished';turn?:number;listening?:boolean;idlePaused?:boolean}){\n",
      "function LegacyPuppetActor({character,emotion='neutral',talking=false,gesture,rest,response,reduced=false,idlePaused=false,actorId='actor'}:{atDesk?:boolean;character:any;emotion?:string;talking?:boolean;gesture?:string;rest?:string;prop?:string;response?:string;reduced?:boolean;actorId?:string;performanceKey?:number;gazeX?:number;gazeY?:number;activity?:StoryActivity;activityPaused?:boolean;orientation?:'auto'|'front'|'three-quarter'|'profile';actingStyle?:'classic'|'polished';turn?:number;listening?:boolean;idlePaused?:boolean}){\n"
    ]
  ],
  "components/StoryStage.tsx": [
    [
      "     <div className=\"story-facing\" style={{transform:`scaleX(${a.facing})`}}>{performance?.action==='mounted-charge'&&performance.actor===id?<MountedActor character={c} emotion={a.expression} reduced={reduced} active={!!responses[id]} performanceKey={state.cursor}/>:c.rig?<PuppetActor actingStyle={actingStyle} orientation={occupied?'front':a.orientation} turn={turn} listening={listening} idlePaused={paused||hidden||state.ended} activity={a.activity} activityPaused={!enabled(id)} gazeX={gazeX} gazeY={gazeY} character={c} actorId={id} performanceKey={training&&(id===training[0]||id===training[1].activity?.targetActor)?0:state.cursor} emotion={a.expression} talking={speaking&&id===speaker} gesture={id===speaker?current.gesture:undefined} rest={a.rest} prop={a.prop} response={allResponses[id]||current?.beatResponses?.[id]||(reduced&&current?.type==='act'?(id===current.actor?ACTIONS[current.action]?.actor:id===current.targetActor?ACTIONS[current.action]?.target:undefined):undefined)} reduced={reduced}/>:<img src={asset?.src} alt={`${c.name} — ${a.expression}`} onError={e=>{e.currentTarget.style.opacity='0';}}/>}</div>\n",
      "     <div className=\"story-facing\" style={{transform:`scaleX(${a.facing})`}}>{performance?.action==='mounted-charge'&&performance.actor===id?<MountedActor character={c} emotion={a.expression} reduced={reduced} active={!!responses[id]} performanceKey={state.cursor}/>:c.rig?<PuppetActor atDesk={a.rest==='seated' && pack.assets.backgrounds[state.stage.background||'']?.foreground==='student-desks'} actingStyle={actingStyle} orientation={occupied?'front':a.orientation} turn={turn} listening={listening} idlePaused={paused||hidden||state.ended} activity={a.activity} activityPaused={!enabled(id)} gazeX={gazeX} gazeY={gazeY} character={c} actorId={id} performanceKey={training&&(id===training[0]||id===training[1].activity?.targetActor)?0:state.cursor} emotion={a.expression} talking={speaking&&id===speaker} gesture={id===speaker?current.gesture:undefined} rest={a.rest} prop={a.prop} response={allResponses[id]||current?.beatResponses?.[id]||(reduced&&current?.type==='act'?(id===current.actor?ACTIONS[current.action]?.actor:id===current.targetActor?ACTIONS[current.action]?.target:undefined):undefined)} reduced={reduced}/>:<img src={asset?.src} alt={`${c.name} — ${a.expression}`} onError={e=>{e.currentTarget.style.opacity='0';}}/>}</div>\n"
    ]
  ]
}
export function studentDeskOverlay(content,destination){
 for(const [before,after] of replacements[destination]??[]){
  if(!content.includes(before))throw Error(`Student desk overlay needs review: ${destination}`)
  content=content.replace(before,after)
 }
 return content
}
